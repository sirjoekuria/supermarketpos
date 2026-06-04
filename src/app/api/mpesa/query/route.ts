import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/server-auth";
import { getMpesaAccessToken, getMpesaConfig, mpesaTimestamp, stkPassword, updateMpesaTransaction } from "@/lib/mpesa";

// Cache the last known status per checkout request to avoid redundant Safaricom calls
const statusCache = new Map<string, { status: string; result: object; ts: number }>();

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const checkoutRequestId = url.searchParams.get("checkoutRequestId");
    // elapsed seconds since STK push — client sends this so we know when to start querying Safaricom directly
    const elapsed = parseFloat(url.searchParams.get("elapsed") || "0");

    if (!checkoutRequestId) {
      return NextResponse.json({ status: "failed", message: "Missing CheckoutRequestID." }, { status: 400 });
    }

    // ── IN-MEMORY CACHE: if we already confirmed success/failed, return instantly ──
    const cached = statusCache.get(checkoutRequestId);
    if (cached && cached.status !== "pending" && Date.now() - cached.ts < 300_000) {
      return NextResponse.json(cached.result);
    }

    // ── FAST PATH: check the DB first (works in production where callback updates it) ──
    try {
      const supabase = getAdminClient();
      const { data: existing } = await supabase
        .from("mpesa_transactions")
        .select("status, result_desc, mpesa_receipt_number")
        .eq("checkout_request_id", checkoutRequestId)
        .maybeSingle();

      if (existing?.status === "success") {
        const result = {
          status: "success",
          message: existing.result_desc,
          mpesaReceiptNumber: existing.mpesa_receipt_number,
        };
        statusCache.set(checkoutRequestId, { status: "success", result, ts: Date.now() });
        return NextResponse.json(result);
      }

      if (existing?.status === "failed") {
        const result = { status: "failed", message: existing.result_desc || "Payment failed." };
        statusCache.set(checkoutRequestId, { status: "failed", result, ts: Date.now() });
        return NextResponse.json(result);
      }
    } catch {
      // DB unavailable — fall through to Safaricom direct query
    }

    // ── DIRECT SAFARICOM QUERY ──
    // Only hit Safaricom after 8s — before that, trust the DB (callback fires fast).
    // This avoids slow Safaricom API calls blocking our 500ms DB polling loop.
    if (elapsed < 8) {
      return NextResponse.json({ status: "pending", message: "Waiting for M-Pesa callback..." });
    }

    try {
      const config = getMpesaConfig();
      const timestamp = mpesaTimestamp();
      const token = await getMpesaAccessToken(); // cached — only fetches once per hour

      // 4-second timeout on Safaricom API — don't let slow responses block our polling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      let response: Response;
      try {
        response = await fetch(`${config.baseUrl}/mpesa/stkpushquery/v1/query`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            BusinessShortCode: config.shortCode,
            Password: stkPassword(config.shortCode, config.passkey, timestamp),
            Timestamp: timestamp,
            CheckoutRequestID: checkoutRequestId,
          }),
          cache: "no-store",
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        // Safaricom not ready yet — customer hasn't been prompted
        return NextResponse.json({ status: "pending", message: "Waiting for customer to pay..." });
      }

      const data = await response.json();

      // ResultCode "0" = success
      if (String(data.ResultCode) === "0") {
        const result = {
          status: "success",
          message: data.ResultDesc || "Payment successful.",
          mpesaReceiptNumber: data.MpesaReceiptNumber || undefined,
        };
        statusCache.set(checkoutRequestId, { status: "success", result, ts: Date.now() });
        // Update DB in background (non-blocking)
        updateMpesaTransaction({
          checkoutRequestId,
          status: "success",
          resultCode: 0,
          resultDesc: data.ResultDesc || "Payment successful.",
        }).catch(() => {});
        return NextResponse.json(result);
      }

      // Any other ResultCode = still processing or explicit error
      if (data.ResultCode !== undefined && String(data.ResultCode) !== "0") {
        // ResultCode 1032 = request cancelled, 1037 = DS timeout, etc.
        const pendingCodes = ["1032", "1037", "2001", "1001", "1"];
        if (pendingCodes.includes(String(data.ResultCode))) {
          return NextResponse.json({ status: "pending", message: data.ResultDesc || "Still waiting for payment..." });
        }

        // Terminal failure
        const result = { status: "failed", message: data.ResultDesc || "Payment failed." };
        statusCache.set(checkoutRequestId, { status: "failed", result, ts: Date.now() });
        updateMpesaTransaction({
          checkoutRequestId,
          status: "failed",
          resultCode: Number(data.ResultCode),
          resultDesc: data.ResultDesc || "Payment failed.",
        }).catch(() => {});
        return NextResponse.json(result);
      }

      // Safaricom returned 200 but no ResultCode — still processing
      return NextResponse.json({ status: "pending", message: "Payment is being processed..." });

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      if (msg.includes("abort") || msg.includes("AbortError")) {
        return NextResponse.json({ status: "pending", message: "Safaricom API timeout, retrying..." });
      }
      console.error("Safaricom direct query error:", msg);
      return NextResponse.json({ status: "pending", message: "Checking payment status..." });
    }
  } catch (error) {
    return NextResponse.json(
      { status: "failed", message: error instanceof Error ? error.message : "Could not query payment." },
      { status: 500 }
    );
  }
}

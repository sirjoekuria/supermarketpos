import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/server-auth";
import { getMpesaAccessToken, getMpesaConfig, mpesaTimestamp, stkPassword, updateMpesaTransaction } from "@/lib/mpesa";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const checkoutRequestId = url.searchParams.get("checkoutRequestId");
    // After how many seconds of pending should we query Safaricom directly
    const elapsedSeconds = parseInt(url.searchParams.get("elapsed") || "0", 10);

    if (!checkoutRequestId) {
      return NextResponse.json({ status: "failed", message: "Missing CheckoutRequestID." }, { status: 400 });
    }

    const supabase = getAdminClient();

    // ── FAST PATH: check the DB first (callback already updates this) ──
    const { data: existing } = await supabase
      .from("mpesa_transactions")
      .select("status, result_desc, mpesa_receipt_number, created_at")
      .eq("checkout_request_id", checkoutRequestId)
      .maybeSingle();

    if (existing?.status === "success") {
      return NextResponse.json({
        status: "success",
        message: existing.result_desc,
        mpesaReceiptNumber: existing.mpesa_receipt_number,
      });
    }

    if (existing?.status === "failed") {
      return NextResponse.json({
        status: "failed",
        message: existing.result_desc || "Payment failed.",
      });
    }

    // Determine elapsed time robustly (either passed from client or computed from DB creation timestamp)
    const createdAtTime = existing?.created_at ? new Date(existing.created_at).getTime() : Date.now();
    const serverElapsedSeconds = Math.max(0, Math.floor((Date.now() - createdAtTime) / 1000));
    const activeElapsed = parseInt(url.searchParams.get("elapsed") || String(serverElapsedSeconds), 10);

    // ── SLOW PATH: only query Safaricom after 3 seconds and only every 2 seconds ──
    // This avoids hitting Safaricom on every single poll while keeping confirmation instant.
    const shouldQuerySafaricom = activeElapsed >= 3 && (activeElapsed % 2 === 0);

    if (!shouldQuerySafaricom) {
      return NextResponse.json({ status: "pending", message: "Waiting for customer to pay..." });
    }

    // Fallback: directly query Safaricom (used when callback hasn't fired)
    try {
      const config = getMpesaConfig();
      const timestamp = mpesaTimestamp();
      const token = await getMpesaAccessToken();

      const response = await fetch(`${config.baseUrl}/mpesa/stkpushquery/v1/query`, {
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
      });

      const data = await response.json();

      if (!response.ok) {
        // Safaricom not ready yet, keep pending
        return NextResponse.json({ status: "pending", message: "Payment is still pending." });
      }

      if (String(data.ResultCode) === "0") {
        await updateMpesaTransaction({
          checkoutRequestId,
          status: "success",
          resultCode: 0,
          resultDesc: data.ResultDesc || "Payment successful.",
        });
        return NextResponse.json({ status: "success", message: data.ResultDesc || "Payment successful." });
      }

      if (data.ResultCode !== undefined) {
        await updateMpesaTransaction({
          checkoutRequestId,
          status: "failed",
          resultCode: Number(data.ResultCode),
          resultDesc: data.ResultDesc || "Payment failed.",
        });
        return NextResponse.json({ status: "failed", message: data.ResultDesc || "Payment failed." });
      }
    } catch (err: any) {
      console.error("Safaricom direct query failed:", err.message || err);
      // Safaricom query failed — just keep polling DB
    }

    return NextResponse.json({ status: "pending", message: "Payment is still pending." });
  } catch (error) {
    return NextResponse.json(
      { status: "failed", message: error instanceof Error ? error.message : "Could not query M-Pesa payment." },
      { status: 500 }
    );
  }
}

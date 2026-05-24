import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/server-auth";
import { getMpesaAccessToken, getMpesaConfig, mpesaTimestamp, stkPassword, updateMpesaTransaction } from "@/lib/mpesa";

export async function GET(request: Request) {
  try {
    const checkoutRequestId = new URL(request.url).searchParams.get("checkoutRequestId");

    if (!checkoutRequestId) {
      return NextResponse.json({ status: "failed", message: "Missing CheckoutRequestID." }, { status: 400 });
    }

    const supabase = getAdminClient();
    const { data: existing } = await supabase
      .from("mpesa_transactions")
      .select("*")
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
      return NextResponse.json({ status: "failed", message: existing.result_desc || "Payment failed." });
    }

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
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ status: "pending", message: data.errorMessage || "Payment is still pending." });
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

    return NextResponse.json({ status: "pending", message: "Payment is still pending." });
  } catch (error) {
    return NextResponse.json(
      { status: "failed", message: error instanceof Error ? error.message : "Could not query M-Pesa payment." },
      { status: 500 }
    );
  }
}

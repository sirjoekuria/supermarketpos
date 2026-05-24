import { NextResponse } from "next/server";
import { getAdminClient, writeAuditLog } from "@/lib/server-auth";
import { getMpesaAccessToken, getMpesaConfig, mpesaTimestamp, normalizePhone, stkPassword } from "@/lib/mpesa";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const phone = normalizePhone(String(body.phone || ""));
    const amount = Math.round(Number(body.amount || 0));

    if (!Number.isFinite(amount) || amount < 1) {
      return NextResponse.json({ success: false, message: "M-Pesa amount must be at least KES 1." }, { status: 400 });
    }

    const config = getMpesaConfig();
    const timestamp = mpesaTimestamp();
    const token = await getMpesaAccessToken();
    const accountReference = String(body.accountReference || `POS-${Date.now()}`).slice(0, 12);
    const transactionDesc = String(body.transactionDesc || "POS Sale").slice(0, 100);

    const response = await fetch(`${config.baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: config.shortCode,
        Password: stkPassword(config.shortCode, config.passkey, timestamp),
        Timestamp: timestamp,
        TransactionType: config.transactionType,
        Amount: amount,
        PartyA: phone,
        PartyB: config.partyB,
        PhoneNumber: phone,
        CallBackURL: config.callbackUrl,
        AccountReference: accountReference,
        TransactionDesc: transactionDesc,
      }),
    });

    const data = await response.json();

    if (!response.ok || data.ResponseCode !== "0") {
      return NextResponse.json(
        { success: false, message: data.errorMessage || data.ResponseDescription || "STK push request failed.", raw: data },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();
    await supabase.from("mpesa_transactions").insert({
      merchant_request_id: data.MerchantRequestID,
      checkout_request_id: data.CheckoutRequestID,
      phone_number: phone,
      amount,
      status: "pending",
      account_reference: accountReference,
      result_desc: data.CustomerMessage || data.ResponseDescription || null,
    });

    await writeAuditLog({
      action: "mpesa_stk_push_requested",
      entityType: "mpesa_transaction",
      entityId: null,
      details: {
        checkout_request_id: data.CheckoutRequestID,
        amount,
        phone_number: phone,
        transaction_type: config.transactionType,
      },
    });

    return NextResponse.json({
      success: true,
      merchantRequestId: data.MerchantRequestID,
      checkoutRequestId: data.CheckoutRequestID,
      message: data.CustomerMessage || "STK push sent.",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Could not initiate M-Pesa payment." },
      { status: 500 }
    );
  }
}

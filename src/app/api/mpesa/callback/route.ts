import { NextResponse } from "next/server";
import { extractCallbackMetadata, updateMpesaTransaction } from "@/lib/mpesa";
import { writeAuditLog } from "@/lib/server-auth";

type CallbackBody = {
  Body?: {
    stkCallback?: {
      MerchantRequestID?: string;
      CheckoutRequestID?: string;
      ResultCode?: number;
      ResultDesc?: string;
      CallbackMetadata?: {
        Item?: { Name: string; Value?: string | number }[];
      };
    };
  };
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CallbackBody;
    const callback = body.Body?.stkCallback;

    if (!callback?.CheckoutRequestID) {
      return NextResponse.json({ ResultCode: 1, ResultDesc: "Invalid callback payload." }, { status: 400 });
    }

    const metadata = extractCallbackMetadata(callback.CallbackMetadata?.Item);
    const success = Number(callback.ResultCode) === 0;

    await updateMpesaTransaction({
      checkoutRequestId: callback.CheckoutRequestID,
      status: success ? "success" : "failed",
      resultCode: callback.ResultCode ?? null,
      resultDesc: callback.ResultDesc || null,
      mpesaReceiptNumber: metadata.MpesaReceiptNumber ? String(metadata.MpesaReceiptNumber) : null,
      transactionDate: metadata.TransactionDate ? String(metadata.TransactionDate) : null,
    });

    await writeAuditLog({
      action: success ? "mpesa_payment_success" : "mpesa_payment_failed",
      entityType: "mpesa_transaction",
      details: {
        checkout_request_id: callback.CheckoutRequestID,
        merchant_request_id: callback.MerchantRequestID,
        result_code: callback.ResultCode,
        result_desc: callback.ResultDesc,
        receipt: metadata.MpesaReceiptNumber,
        amount: metadata.Amount,
        phone_number: metadata.PhoneNumber,
      },
    });

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (error) {
    return NextResponse.json(
      { ResultCode: 1, ResultDesc: error instanceof Error ? error.message : "Callback processing failed." },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/server-auth";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code")?.trim().toUpperCase();
    const amountStr = url.searchParams.get("amount");

    if (!code) {
      return NextResponse.json({ success: false, message: "Missing M-Pesa transaction code." }, { status: 400 });
    }

    const supabase = getAdminClient();
    
    // Query by mpesa_receipt_number (case insensitive)
    const { data: tx, error } = await supabase
      .from("mpesa_transactions")
      .select("status, amount, mpesa_receipt_number, phone_number, result_desc, sale_id, customer_name")
      .eq("mpesa_receipt_number", code)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ success: false, message: "Error querying database." }, { status: 500 });
    }

    if (!tx) {
      return NextResponse.json({ success: false, message: "Transaction code not found in database." });
    }

    if (tx.sale_id) {
      return NextResponse.json({ 
        success: false, 
        message: "This transaction code has already been used for another sale." 
      });
    }

    if (tx.status !== "success") {
      return NextResponse.json({ 
        success: false, 
        message: `Transaction found but status is '${tx.status}': ${tx.result_desc || "Not completed"}` 
      });
    }

    // Optional amount verification
    if (amountStr) {
      const checkoutAmount = Math.round(Number(amountStr));
      const txAmount = Math.round(tx.amount);
      if (txAmount < checkoutAmount) {
        return NextResponse.json({ 
          success: false, 
          message: `Amount mismatch. Transaction is for KES ${tx.amount}, but checkout requires KES ${checkoutAmount}.` 
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Transaction verified successfully.",
      mpesaReceiptNumber: tx.mpesa_receipt_number,
      amount: tx.amount,
      phoneNumber: tx.phone_number,
      customerName: tx.customer_name || "M-Pesa Customer",
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to verify transaction." },
      { status: 500 }
    );
  }
}

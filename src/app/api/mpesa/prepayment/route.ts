export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/server-auth";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const phone = url.searchParams.get("phone")?.trim();
    const amountStr = url.searchParams.get("amount");

    if (!phone && !amountStr) {
      return NextResponse.json({ error: "Either phone number or amount paid is required." }, { status: 400 });
    }

    const supabase = getAdminClient();
    // Search for unlinked, successful M-Pesa payments in the last 12 hours
    const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

    let query = supabase
      .from("mpesa_transactions")
      .select("id, mpesa_receipt_number, amount, phone_number, customer_name, created_at, transaction_date")
      .eq("status", "success")
      .is("sale_id", null)
      .gte("created_at", cutoff);

    if (phone) {
      const sanitized = phone.replace(/\D/g, "");
      if (sanitized.length >= 9) {
        const last9 = sanitized.slice(-9);
        query = query.ilike("phone_number", `%${last9}`);
      }
    }

    if (amountStr) {
      const numericAmount = Number(amountStr);
      if (!isNaN(numericAmount) && numericAmount > 0) {
        query = query.gte("amount", numericAmount - 0.01).lte("amount", numericAmount + 0.01);
      }
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ payments: data || [] });
  } catch (err) {
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}

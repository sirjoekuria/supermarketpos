export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/server-auth";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const phone = url.searchParams.get("phone")?.trim();

    if (!phone) {
      return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
    }

    // Normalise: strip non-digits and match on last 9 digits
    const sanitized = phone.replace(/\D/g, "");
    if (sanitized.length < 9) {
      return NextResponse.json({ error: "Invalid phone number." }, { status: 400 });
    }
    const last9 = sanitized.slice(-9);

    const supabase = getAdminClient();

    // Search for unlinked, successful M-Pesa payments from this phone in the last 4 hours
    const cutoff = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("mpesa_transactions")
      .select("id, mpesa_receipt_number, amount, phone_number, customer_name, created_at, transaction_date")
      .ilike("phone_number", `%${last9}`)
      .eq("status", "success")
      .is("sale_id", null)
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ payments: data || [] });
  } catch (err) {
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}

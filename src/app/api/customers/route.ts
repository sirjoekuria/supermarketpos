import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/server-auth";
import { sanitizeString } from "@/lib/sanitize";

// GET /api/customers - List all customers or search by name/phone
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";

    const supabase = getAdminClient();

    let query = supabase.from("customers").select("*");

    if (search) {
      // Search by name or phone (case-insensitive)
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data: customers, error } = await query
      .order("name", { ascending: true })
      .limit(50); // limit to 50 results to keep it performant

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ customers });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch customers." },
      { status: 500 }
    );
  }
}

// POST /api/customers - Register a new customer
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = sanitizeString(body.name);
    const phone = sanitizeString(body.phone);
    const email = sanitizeString(body.email);

    if (!name?.trim()) {
      return NextResponse.json({ error: "Customer name is required." }, { status: 400 });
    }

    if (!phone?.trim()) {
      return NextResponse.json({ error: "Customer phone number is required." }, { status: 400 });
    }

    const supabase = getAdminClient();

    // Check if phone number already registered
    const { data: existing } = await supabase
      .from("customers")
      .select("id, name")
      .eq("phone", phone.trim())
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: `Phone number is already registered to ${existing.name}.` },
        { status: 400 }
      );
    }

    const { data: customer, error } = await supabase
      .from("customers")
      .insert({
        name: name,
        phone: phone,
        email: email || null,
        points_balance: 0,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ customer });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to register customer." },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase server credentials.");
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// GET stock for a branch
// ?branch_id=xxx
export async function GET(request: Request) {
  try {
    const supabase = getAdminClient();
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branch_id");

    if (!branchId) {
      return NextResponse.json({ error: "Missing branch_id" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("branch_stock")
      .select("*, product:products(*)")
      .eq("branch_id", branchId);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ stock: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch branch stock" },
      { status: 500 }
    );
  }
}

// PATCH — upsert stock for a product at a branch
// body: { branch_id, product_id, stock_quantity, min_stock_level? }
export async function PATCH(request: Request) {
  try {
    const supabase = getAdminClient();
    const body = await request.json();
    const { branch_id, product_id, stock_quantity, min_stock_level } = body;

    if (!branch_id || !product_id) {
      return NextResponse.json({ error: "Missing branch_id or product_id" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("branch_stock")
      .upsert(
        {
          branch_id,
          product_id,
          stock_quantity: Number(stock_quantity) ?? 0,
          min_stock_level: min_stock_level !== undefined ? Number(min_stock_level) : 5,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "branch_id,product_id" }
      )
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ stock: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update branch stock" },
      { status: 500 }
    );
  }
}

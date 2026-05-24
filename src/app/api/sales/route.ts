import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { writeAuditLog } from "@/lib/server-auth";

type SaleItemPayload = {
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
};

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      {
        error:
          "Missing Supabase server credentials. Add SUPABASE_SERVICE_ROLE_KEY to .env.local and restart the dev server.",
      },
      { status: 500 }
    );
  }

  const body = await request.json();
  const items = body.items as SaleItemPayload[] | undefined;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Sale must include at least one item." }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: saleData, error: saleError } = await supabase
    .from("sales")
    .insert({
      receipt_number: body.receipt_number,
      subtotal: body.subtotal,
      tax_amount: body.tax_amount,
      discount_amount: body.discount_amount,
      total: body.total,
      payment_method: body.payment_method,
      payment_status: body.payment_status || "completed",
    })
    .select()
    .single();

  if (saleError) {
    return NextResponse.json({ error: saleError.message }, { status: 400 });
  }

  const saleItems = items.map((item) => ({
    sale_id: saleData.id,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    subtotal: item.subtotal,
    tax_amount: item.tax_amount,
    discount_amount: item.discount_amount,
    total: item.total,
  }));

  const { error: itemsError } = await supabase.from("sale_items").insert(saleItems);

  if (itemsError) {
    await supabase.from("sales").delete().eq("id", saleData.id);
    return NextResponse.json({ error: itemsError.message }, { status: 400 });
  }

  for (const item of items) {
    const { error: stockError } = await supabase.rpc("decrement_stock", {
      p_product_id: item.product_id,
      p_quantity: item.quantity,
    });

    if (stockError) {
      console.warn("Stock decrement skipped:", stockError.message);
    }
  }

  await writeAuditLog({
    actor: body.actor || null,
    action: "sale_recorded",
    entityType: "sale",
    entityId: saleData.id,
    details: {
      receipt_number: body.receipt_number,
      total: body.total,
      payment_method: body.payment_method,
      item_count: items.length,
    },
  });

  return NextResponse.json({ sale: saleData });
}

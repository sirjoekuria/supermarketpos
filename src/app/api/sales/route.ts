import { NextResponse } from "next/server";
import { getAdminClient, writeAuditLog } from "@/lib/server-auth";

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
  try {
    const body = await request.json();
    const items = body.items as SaleItemPayload[] | undefined;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Sale must include at least one item." }, { status: 400 });
    }

    const supabase = getAdminClient();

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

    // Parallel direct stock updates instead of slow sequential missing RPC calls
    try {
      await Promise.all(
        items.map(async (item) => {
          const { data: prod, error: fetchError } = await supabase
            .from("products")
            .select("stock_quantity")
            .eq("id", item.product_id)
            .single();

          if (!fetchError && prod) {
            const newQty = Math.max(0, prod.stock_quantity - item.quantity);
            await supabase
              .from("products")
              .update({ stock_quantity: newQty })
              .eq("id", item.product_id);
          }
        })
      );
    } catch (stockErr) {
      console.warn("Stock decrement failed:", stockErr);
    }

    // Non-blocking audit log so the cashier gets a response immediately
    writeAuditLog({
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
    }).catch((err) => console.warn("Audit log failed:", err));

    return NextResponse.json({ sale: saleData });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to record sale." },
      { status: 500 }
    );
  }
}

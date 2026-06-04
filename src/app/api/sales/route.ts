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
    const { customer_id, points_redeemed = 0, receipt_number, subtotal, tax_amount, discount_amount, total, payment_method, payment_status = "completed", actor } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Sale must include at least one item." }, { status: 400 });
    }

    const supabase = getAdminClient();

    let finalPointsEarned = 0;
    let customerPointsBalance = 0;

    // ── LOYALTY SYSTEM VALIDATION & ATOMIC CALCULATION ──
    if (customer_id) {
      // 1. Fetch customer details
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .select("points_balance, name")
        .eq("id", customer_id)
        .single();

      if (customerError || !customer) {
        return NextResponse.json({ error: "Selected loyalty customer not found." }, { status: 400 });
      }

      customerPointsBalance = customer.points_balance;

      // 2. Validate redemption request
      if (points_redeemed > 0) {
        if (points_redeemed < 100) {
          return NextResponse.json({ error: "Minimum redemption is 100 points." }, { status: 400 });
        }
        if (points_redeemed > customerPointsBalance) {
          return NextResponse.json({
            error: `Insufficient loyalty points. Balance: ${customerPointsBalance}, requested: ${points_redeemed}`,
          }, { status: 400 });
        }
        // redemption value must not exceed 50% of the subtotal
        const maxRedeemValue = subtotal * 0.5;
        if (points_redeemed > maxRedeemValue) {
          return NextResponse.json({
            error: `Redemption exceeds the 50% limit of order total (Max KES ${maxRedeemValue}).`,
          }, { status: 400 });
        }

        // Deduct points from balance
        customerPointsBalance -= points_redeemed;
      }

      // 3. Calculate points earned on net payable total
      // 1 point per KES 100 of the final total paid
      finalPointsEarned = Math.floor(total / 100);
      customerPointsBalance += finalPointsEarned;
    }

    // ── RECORD SALE ──
    const { data: saleData, error: saleError } = await supabase
      .from("sales")
      .insert({
        receipt_number,
        subtotal,
        tax_amount,
        discount_amount,
        total,
        payment_method,
        payment_status,
        customer_id: customer_id || null,
        points_earned: finalPointsEarned,
        points_redeemed: points_redeemed,
        branch_id: body.branch_id || null,
      })
      .select()
      .single();

    if (saleError) {
      return NextResponse.json({ error: saleError.message }, { status: 400 });
    }

    // ── LOYALTY SYSTEM DEDUCTION & AUDIT LEDGER LOGGING ──
    if (customer_id) {
      try {
        // Apply points updates to customer
        const { error: customerUpdateError } = await supabase
          .from("customers")
          .update({ points_balance: customerPointsBalance, updated_at: new Date().toISOString() })
          .eq("id", customer_id);

        if (customerUpdateError) throw customerUpdateError;

        // Log points transactions
        const ledgerEntries = [];
        let runningBalance = customerPointsBalance - finalPointsEarned; // balance before earn

        if (points_redeemed > 0) {
          ledgerEntries.push({
            customer_id,
            sale_id: saleData.id,
            type: "redeem",
            points: -points_redeemed,
            balance_after: runningBalance,
            reference: `Redeemed on Receipt #${receipt_number}`,
          });
        }

        if (finalPointsEarned > 0) {
          ledgerEntries.push({
            customer_id,
            sale_id: saleData.id,
            type: "earn",
            points: finalPointsEarned,
            balance_after: customerPointsBalance,
            reference: `Earned on Receipt #${receipt_number}`,
          });
        }

        if (ledgerEntries.length > 0) {
          const { error: ledgerError } = await supabase
            .from("point_transactions")
            .insert(ledgerEntries);
          if (ledgerError) throw ledgerError;
        }

      } catch (loyaltyErr: any) {
        console.error("Loyalty points processing failed:", loyaltyErr.message || loyaltyErr);
        // We log it but do NOT roll back the entire sale, so the checkout transaction doesn't crash for the customer
      }
    }

    // ── RECORD SALE ITEMS ──
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
      // rollback sale record on items failure
      await supabase.from("sales").delete().eq("id", saleData.id);
      return NextResponse.json({ error: itemsError.message }, { status: 400 });
    }

    // ── STOCK QUANTITY UPDATES (Parallel, Non-blocking for UI speed) ──
    try {
      const branchId = body.branch_id;
      await Promise.all(
        items.map(async (item) => {
          if (branchId) {
            // Scope stock update to branch
            const { data: bsData, error: fetchError } = await supabase
              .from("branch_stock")
              .select("stock_quantity")
              .eq("branch_id", branchId)
              .eq("product_id", item.product_id)
              .maybeSingle();

            if (!fetchError) {
              const currentStock = bsData?.stock_quantity ?? 0;
              const newQty = Math.max(0, currentStock - item.quantity);
              await supabase
                .from("branch_stock")
                .upsert(
                  {
                    branch_id: branchId,
                    product_id: item.product_id,
                    stock_quantity: newQty,
                    updated_at: new Date().toISOString(),
                  },
                  { onConflict: "branch_id,product_id" }
                );
            }
          } else {
            // Fallback to global stock quantity
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
          }
        })
      );
    } catch (stockErr) {
      console.warn("Stock decrement failed:", stockErr);
    }

    // ── AUDIT LOGS (Non-blocking background promise) ──
    writeAuditLog({
      actor: actor || null,
      action: "sale_recorded",
      entityType: "sale",
      entityId: saleData.id,
      details: {
        receipt_number,
        total,
        payment_method,
        item_count: items.length,
        customer_id: customer_id || null,
        points_earned: finalPointsEarned,
        points_redeemed: points_redeemed,
      },
    }).catch((err) => console.warn("Audit log failed:", err));

    return NextResponse.json({ 
      sale: saleData, 
      loyalty: customer_id ? {
        points_earned: finalPointsEarned,
        points_redeemed: points_redeemed,
        final_points_balance: customerPointsBalance
      } : undefined
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to record sale." },
      { status: 500 }
    );
  }
}

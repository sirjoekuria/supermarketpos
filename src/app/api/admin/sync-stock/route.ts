import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/server-auth";

/**
 * POST /api/admin/sync-stock
 * Backfill branch_stock for all products that are missing entries.
 * For each branch, create a branch_stock row using the product's
 * stock_quantity as the initial value (if no row exists yet).
 */
export async function POST() {
  try {
    const supabase = getAdminClient();

    // Fetch all products
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, stock_quantity, min_stock_level");

    if (productsError) {
      return NextResponse.json({ error: productsError.message }, { status: 500 });
    }

    // Fetch all branches
    const { data: branches, error: branchesError } = await supabase
      .from("branches")
      .select("id, name")
      .eq("is_active", true);

    if (branchesError) {
      return NextResponse.json({ error: branchesError.message }, { status: 500 });
    }

    if (!branches || branches.length === 0) {
      return NextResponse.json({ error: "No active branches found." }, { status: 400 });
    }

    // Fetch all existing branch_stock records
    const { data: existingStock, error: stockError } = await supabase
      .from("branch_stock")
      .select("branch_id, product_id");

    if (stockError) {
      return NextResponse.json({ error: stockError.message }, { status: 500 });
    }

    // Build a set of existing (branch_id, product_id) pairs
    const existingSet = new Set(
      (existingStock || []).map((s: { branch_id: string; product_id: string }) => `${s.branch_id}:${s.product_id}`)
    );

    // Build upsert rows for missing combinations
    const toInsert: {
      branch_id: string;
      product_id: string;
      stock_quantity: number;
      min_stock_level: number;
    }[] = [];

    for (const branch of branches) {
      for (const product of products || []) {
        const key = `${branch.id}:${product.id}`;
        if (!existingSet.has(key)) {
          toInsert.push({
            branch_id: branch.id,
            product_id: product.id,
            stock_quantity: product.stock_quantity ?? 0,
            min_stock_level: product.min_stock_level ?? 5,
          });
        }
      }
    }

    let inserted = 0;
    if (toInsert.length > 0) {
      // Insert in batches of 100
      for (let i = 0; i < toInsert.length; i += 100) {
        const batch = toInsert.slice(i, i + 100);
        const { error: insertError } = await supabase
          .from("branch_stock")
          .insert(batch);

        if (insertError) {
          console.error("Batch insert error:", insertError);
        } else {
          inserted += batch.length;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sync complete. Created ${inserted} missing branch_stock entries.`,
      products_count: products?.length ?? 0,
      branches_count: branches.length,
      inserted,
      already_existed: (existingStock?.length ?? 0),
    });
  } catch (error) {
    console.error("Sync stock error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

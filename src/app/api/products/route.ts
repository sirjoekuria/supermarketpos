import { NextResponse } from "next/server";
import { getAdminClient, writeAuditLog } from "@/lib/server-auth";
import { sanitizeString } from "@/lib/sanitize";

// CREATE / ADD a product
export async function POST(request: Request) {
  try {
    const supabase = getAdminClient();
    const body = await request.json();

    const { data: product, error } = await supabase
      .from("products")
      .insert({
        name: sanitizeString(body.name),
        barcode: sanitizeString(body.barcode),
        price: Number(body.price),
        cost_price: body.cost_price ? Number(body.cost_price) : null,
        stock_quantity: 0,
        min_stock_level: Number(body.min_stock_level) || 5,
        unit: sanitizeString(body.unit) || "pcs",
        tax_rate: Number(body.tax_rate) || 0,
        discount_percent: Number(body.discount_percent) || 0,
        image_url: body.image_url ? sanitizeString(body.image_url) : null,
        is_active: body.is_active !== false,
        expiry_date: body.expiry_date ? body.expiry_date : null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // 2. Fetch all active branches
    const { data: activeBranches, error: branchesError } = await supabase
      .from("branches")
      .select("id")
      .eq("is_active", true);

    if (branchesError) {
      console.error("Error fetching branches:", branchesError);
    }

    // 3. Create branch_stock entries — stock only for the selected branch, 0 for others
    const stockQuantity = Number(body.stock_quantity) || 0;
    const minStockLevel = Number(body.min_stock_level) || 5;
    const targetBranchId = body.branch_id as string | undefined;

    if (activeBranches && activeBranches.length > 0) {
      const branchStockEntries = activeBranches.map((branch: { id: string }) => ({
        branch_id: branch.id,
        product_id: product.id,
        stock_quantity: targetBranchId === branch.id ? stockQuantity : 0,
        min_stock_level: targetBranchId === branch.id ? minStockLevel : 5,
      }));

      const { error: insertError } = await supabase
        .from("branch_stock")
        .insert(branchStockEntries);

      if (insertError) {
        console.error("Error creating branch_stock entries:", insertError);
      }
    }

    writeAuditLog({
      action: "product_created",
      entityType: "product",
      entityId: product.id,
      details: {
        name: product.name,
        barcode: product.barcode,
        price: product.price,
      },
    }).catch(() => {});

    return NextResponse.json({ product });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create product" },
      { status: 500 }
    );
  }
}

// UPDATE / EDIT a product
export async function PATCH(request: Request) {
  try {
    const supabase = getAdminClient();
    const body = await request.json();
    const { id, ...updateFields } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing product ID" }, { status: 400 });
    }

    const { data: product, error } = await supabase
      .from("products")
      .update({
        name: updateFields.name ? sanitizeString(updateFields.name) : undefined,
        barcode: updateFields.barcode ? sanitizeString(updateFields.barcode) : undefined,
        price: updateFields.price !== undefined ? Number(updateFields.price) : undefined,
        cost_price: updateFields.cost_price !== undefined ? (updateFields.cost_price ? Number(updateFields.cost_price) : null) : undefined,
        stock_quantity: updateFields.stock_quantity !== undefined ? Number(updateFields.stock_quantity) : undefined,
        min_stock_level: updateFields.min_stock_level !== undefined ? Number(updateFields.min_stock_level) : undefined,
        unit: updateFields.unit !== undefined ? (sanitizeString(updateFields.unit) || "pcs") : undefined,
        tax_rate: updateFields.tax_rate !== undefined ? Number(updateFields.tax_rate) : undefined,
        discount_percent: updateFields.discount_percent !== undefined ? Number(updateFields.discount_percent) : undefined,
        image_url: updateFields.image_url !== undefined ? (sanitizeString(updateFields.image_url) || null) : undefined,
        is_active: updateFields.is_active !== undefined ? updateFields.is_active : undefined,
        expiry_date: updateFields.expiry_date !== undefined ? (updateFields.expiry_date || null) : undefined,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // 2. Sync to branch_stock if stock_quantity or min_stock_level was updated
    if (updateFields.stock_quantity !== undefined || updateFields.min_stock_level !== undefined) {
      let targetBranchId = body.branch_id;
      if (!targetBranchId) {
        const { data: mainBranch } = await supabase
          .from("branches")
          .select("id")
          .eq("name", "Main Branch")
          .limit(1)
          .maybeSingle();
        if (mainBranch) targetBranchId = mainBranch.id;
      }

      if (targetBranchId) {
        const stockQty = updateFields.stock_quantity !== undefined ? Number(updateFields.stock_quantity) : undefined;
        const minLevel = updateFields.min_stock_level !== undefined ? Number(updateFields.min_stock_level) : undefined;
        
        // Find existing record to merge/fallback
        const { data: existingStock } = await supabase
          .from("branch_stock")
          .select("*")
          .eq("branch_id", targetBranchId)
          .eq("product_id", id)
          .maybeSingle();

        await supabase
          .from("branch_stock")
          .upsert({
            branch_id: targetBranchId,
            product_id: id,
            stock_quantity: stockQty !== undefined ? stockQty : (existingStock?.stock_quantity ?? 0),
            min_stock_level: minLevel !== undefined ? minLevel : (existingStock?.min_stock_level ?? 5),
            updated_at: new Date().toISOString(),
          }, { onConflict: "branch_id,product_id" });
      }
    }

    writeAuditLog({
      action: "product_updated",
      entityType: "product",
      entityId: product.id,
      details: {
        name: product.name,
        barcode: product.barcode,
        price: product.price,
      },
    }).catch(() => {});

    return NextResponse.json({ product });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update product" },
      { status: 500 }
    );
  }
}

// DELETE a product
export async function DELETE(request: Request) {
  try {
    const supabase = getAdminClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing product ID" }, { status: 400 });
    }

    // Retrieve name and barcode before deletion for audit trail
    const { data: existingProduct } = await supabase
      .from("products")
      .select("name, barcode")
      .eq("id", id)
      .maybeSingle();

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (existingProduct) {
      writeAuditLog({
        action: "product_deleted",
        entityType: "product",
        entityId: id,
        details: {
          name: existingProduct.name,
          barcode: existingProduct.barcode,
        },
      }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete product" },
      { status: 500 }
    );
  }
}


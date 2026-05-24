import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { writeAuditLog } from "@/lib/server-auth";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase server credentials. Add SUPABASE_SERVICE_ROLE_KEY to .env.local.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// CREATE / ADD a product
export async function POST(request: Request) {
  try {
    const supabase = getAdminClient();
    const body = await request.json();

    const { data: product, error } = await supabase
      .from("products")
      .insert({
        name: body.name.trim(),
        barcode: body.barcode.trim(),
        price: Number(body.price),
        cost_price: body.cost_price ? Number(body.cost_price) : null,
        stock_quantity: Number(body.stock_quantity) || 0,
        min_stock_level: Number(body.min_stock_level) || 5,
        unit: body.unit.trim() || "pcs",
        tax_rate: Number(body.tax_rate) || 0,
        discount_percent: Number(body.discount_percent) || 0,
        image_url: body.image_url ? body.image_url.trim() : null,
        is_active: body.is_active !== false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await writeAuditLog({
      action: "product_created",
      entityType: "product",
      entityId: product.id,
      details: {
        name: product.name,
        barcode: product.barcode,
        price: product.price,
      },
    });

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
        name: updateFields.name?.trim(),
        barcode: updateFields.barcode?.trim(),
        price: updateFields.price !== undefined ? Number(updateFields.price) : undefined,
        cost_price: updateFields.cost_price !== undefined ? (updateFields.cost_price ? Number(updateFields.cost_price) : null) : undefined,
        stock_quantity: updateFields.stock_quantity !== undefined ? Number(updateFields.stock_quantity) : undefined,
        min_stock_level: updateFields.min_stock_level !== undefined ? Number(updateFields.min_stock_level) : undefined,
        unit: updateFields.unit !== undefined ? (updateFields.unit?.trim() || "pcs") : undefined,
        tax_rate: updateFields.tax_rate !== undefined ? Number(updateFields.tax_rate) : undefined,
        discount_percent: updateFields.discount_percent !== undefined ? Number(updateFields.discount_percent) : undefined,
        image_url: updateFields.image_url !== undefined ? (updateFields.image_url?.trim() || null) : undefined,
        is_active: updateFields.is_active !== undefined ? updateFields.is_active : undefined,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await writeAuditLog({
      action: "product_updated",
      entityType: "product",
      entityId: product.id,
      details: {
        name: product.name,
        barcode: product.barcode,
        price: product.price,
      },
    });

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
      await writeAuditLog({
        action: "product_deleted",
        entityType: "product",
        entityId: id,
        details: {
          name: existingProduct.name,
          barcode: existingProduct.barcode,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete product" },
      { status: 500 }
    );
  }
}

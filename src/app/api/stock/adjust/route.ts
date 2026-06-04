import { getAdminClient } from '@/lib/server-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = getAdminClient();
    const { product_id, quantity_change, reason, notes, branch_id } = await request.json();

    if (!product_id || quantity_change === undefined || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: product_id, quantity_change, reason' },
        { status: 400 }
      );
    }

    let newQuantity = 0;
    let oldQuantity = 0;

    if (branch_id) {
      // 1. Fetch current stock from branch_stock
      const { data: bsData, error: bsError } = await supabase
        .from('branch_stock')
        .select('stock_quantity')
        .eq('branch_id', branch_id)
        .eq('product_id', product_id)
        .maybeSingle();

      if (bsError) {
        return NextResponse.json({ error: bsError.message }, { status: 500 });
      }

      oldQuantity = bsData?.stock_quantity ?? 0;
      newQuantity = oldQuantity + quantity_change;

      if (newQuantity < 0) {
        return NextResponse.json(
          { error: 'Stock adjustment would result in negative branch quantity' },
          { status: 400 }
        );
      }

      // 2. Upsert branch_stock
      const { error: upsertError } = await supabase
        .from('branch_stock')
        .upsert(
          {
            branch_id,
            product_id,
            stock_quantity: newQuantity,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'branch_id,product_id' }
        );

      if (upsertError) {
        return NextResponse.json({ error: upsertError.message }, { status: 500 });
      }

      // Log adjustment
      const { error: logError } = await supabase
        .from('stock_adjustments')
        .insert({
          product_id,
          quantity_change,
          reason,
          notes,
          adjusted_by: null,
          branch_id,
        });

      if (logError) {
        console.error('Failed to log adjustment:', logError);
      }
    } else {
      // Fetch current product
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', product_id)
        .single();

      if (fetchError || !product) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }

      oldQuantity = product.stock_quantity;
      newQuantity = oldQuantity + quantity_change;

      if (newQuantity < 0) {
        return NextResponse.json(
          { error: 'Stock adjustment would result in negative quantity' },
          { status: 400 }
        );
      }

      // Update product stock
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock_quantity: newQuantity })
        .eq('id', product_id);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        );
      }

      // Log adjustment
      const { error: logError } = await supabase
        .from('stock_adjustments')
        .insert({
          product_id,
          quantity_change,
          reason,
          notes,
          adjusted_by: null,
        });

      if (logError) {
        console.error('Failed to log adjustment:', logError);
      }
    }

    return NextResponse.json({
      success: true,
      product_id,
      old_quantity: oldQuantity,
      new_quantity: newQuantity,
      quantity_change,
    });
  } catch (error) {
    console.error('Stock adjustment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

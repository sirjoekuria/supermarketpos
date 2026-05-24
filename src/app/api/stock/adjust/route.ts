import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { product_id, quantity_change, reason, notes } = await request.json();

    if (!product_id || quantity_change === undefined || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: product_id, quantity_change, reason' },
        { status: 400 }
      );
    }

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

    const newQuantity = product.stock_quantity + quantity_change;

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

    return NextResponse.json({
      success: true,
      product_id,
      old_quantity: product.stock_quantity,
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

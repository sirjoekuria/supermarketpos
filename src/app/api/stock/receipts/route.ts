import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('stock_receipts')
      .select('*, stock_receipt_items(*)')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Fetch receipts error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supplier_name, items, notes } = await request.json();

    if (!supplier_name || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: supplier_name, items' },
        { status: 400 }
      );
    }

    // Generate receipt number
    const receiptNumber = `SR-${Date.now()}`;
    let totalItems = 0;
    let totalCost = 0;

    // Calculate totals
    items.forEach((item: any) => {
      totalItems += item.quantity_ordered;
      totalCost += item.subtotal;
    });

    // Create receipt (use anon key to bypass RLS during development)
    const { data: receipt, error: receiptError } = await supabase
      .from('stock_receipts')
      .insert({
        receipt_number: receiptNumber,
        supplier_name,
        total_items: totalItems,
        total_cost: totalCost,
        notes,
        created_by: null,
      })
      .select()
      .single();

    if (receiptError) {
      return NextResponse.json(
        { error: receiptError.message },
        { status: 500 }
      );
    }

    // Add receipt items
    const receiptItems = items.map((item: any) => ({
      receipt_id: receipt.id,
      product_id: item.product_id,
      quantity_ordered: item.quantity_ordered,
      quantity_received: item.quantity_ordered,
      unit_cost: item.unit_cost,
      subtotal: item.subtotal,
    }));

    const { error: itemsError } = await supabase
      .from('stock_receipt_items')
      .insert(receiptItems);

    if (itemsError) {
      return NextResponse.json(
        { error: itemsError.message },
        { status: 500 }
      );
    }

    // Update product stock quantities
    for (const item of items) {
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', item.product_id)
        .single();

      if (!fetchError && product) {
        const newQuantity = product.stock_quantity + item.quantity_ordered;

        await supabase
          .from('products')
          .update({ stock_quantity: newQuantity })
          .eq('id', item.product_id);

        // Log adjustment
        await supabase.from('stock_adjustments').insert({
          product_id: item.product_id,
          quantity_change: item.quantity_ordered,
          reason: 'receipt',
          reference_id: receipt.id,
          notes: `Stock receipt ${receiptNumber}`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      receipt,
    });
  } catch (error) {
    console.error('Create receipt error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

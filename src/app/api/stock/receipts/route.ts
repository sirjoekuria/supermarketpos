import { getAdminClient } from '@/lib/server-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = getAdminClient();
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
    const supabase = getAdminClient();
    const { supplier_name, items, notes, branch_id } = await request.json();

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

    // Create receipt
    const { data: receipt, error: receiptError } = await supabase
      .from('stock_receipts')
      .insert({
        receipt_number: receiptNumber,
        supplier_name,
        total_items: totalItems,
        total_cost: totalCost,
        notes,
        created_by: null,
        branch_id: branch_id || null,
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

    // Update stock quantities
    for (const item of items) {
      if (branch_id) {
        const { data: bsData, error: fetchError } = await supabase
          .from('branch_stock')
          .select('stock_quantity')
          .eq('branch_id', branch_id)
          .eq('product_id', item.product_id)
          .maybeSingle();

        if (!fetchError) {
          const currentStock = bsData?.stock_quantity ?? 0;
          const newQty = currentStock + item.quantity_ordered;
          await supabase
            .from('branch_stock')
            .upsert(
              {
                branch_id,
                product_id: item.product_id,
                stock_quantity: newQty,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'branch_id,product_id' }
            );

          // Log adjustment
          await supabase.from('stock_adjustments').insert({
            product_id: item.product_id,
            quantity_change: item.quantity_ordered,
            reason: 'receipt',
            reference_id: receipt.id,
            notes: `Stock receipt ${receiptNumber}`,
            branch_id,
          });
        }
      } else {
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

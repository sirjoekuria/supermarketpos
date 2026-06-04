import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

interface StockImportRow {
  barcode: string;
  quantity: number;
  reason?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { items, reason = 'adjustment', branch_id } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Invalid items array' },
        { status: 400 }
      );
    }

    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const item of items) {
      try {
        const { barcode, quantity } = item;

        if (!barcode || quantity === undefined) {
          results.errors.push(`Row missing barcode or quantity`);
          results.failed++;
          continue;
        }

        // Find product by barcode
        const { data: product, error: fetchError } = await supabase
          .from('products')
          .select('id, stock_quantity')
          .eq('barcode', barcode)
          .single();

        if (fetchError || !product) {
          results.errors.push(`Product with barcode ${barcode} not found`);
          results.failed++;
          continue;
        }

        if (branch_id) {
          // Fetch current stock from branch_stock
          const { data: bsData, error: bsError } = await supabase
            .from('branch_stock')
            .select('stock_quantity')
            .eq('branch_id', branch_id)
            .eq('product_id', product.id)
            .maybeSingle();

          const oldQuantity = bsData?.stock_quantity ?? 0;
          const newQuantity = oldQuantity + quantity;

          if (newQuantity < 0) {
            results.errors.push(`Barcode ${barcode}: would result in negative branch stock`);
            results.failed++;
            continue;
          }

          // Upsert branch_stock
          const { error: upsertError } = await supabase
            .from('branch_stock')
            .upsert(
              {
                branch_id,
                product_id: product.id,
                stock_quantity: newQuantity,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'branch_id,product_id' }
            );

          if (upsertError) {
            results.errors.push(`Barcode ${barcode}: ${upsertError.message}`);
            results.failed++;
            continue;
          }

          // Log adjustment
          await supabase.from('stock_adjustments').insert({
            product_id: product.id,
            quantity_change: quantity,
            reason,
            notes: `Bulk import`,
            branch_id,
          });
        } else {
          const newQuantity = product.stock_quantity + quantity;

          if (newQuantity < 0) {
            results.errors.push(`Barcode ${barcode}: would result in negative stock`);
            results.failed++;
            continue;
          }

          // Update product stock
          const { error: updateError } = await supabase
            .from('products')
            .update({ stock_quantity: newQuantity })
            .eq('id', product.id);

          if (updateError) {
            results.errors.push(`Barcode ${barcode}: ${updateError.message}`);
            results.failed++;
            continue;
          }

          // Log adjustment
          await supabase.from('stock_adjustments').insert({
            product_id: product.id,
            quantity_change: quantity,
            reason,
            notes: `Bulk import`,
          });
        }

        results.successful++;
      } catch (err) {
        results.errors.push(`Row error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        results.failed++;
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

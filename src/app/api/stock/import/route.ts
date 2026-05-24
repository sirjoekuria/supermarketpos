import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

interface StockImportRow {
  barcode: string;
  quantity: number;
  reason?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { items, reason = 'adjustment' } = await request.json();

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

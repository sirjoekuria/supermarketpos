const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qzazowqnyssahwwcstkg.supabase.co';
const supabaseAnonKey = 'sb_publishable_YOg7CoZlkFSAGGVmZlJ21g_ikfpe8oQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seed() {
  console.log("Fetching categories...");
  const { data: categories, error: cError } = await supabase.from('categories').select('*');
  if (cError || !categories || categories.length === 0) {
    console.error("Categories Error or missing categories:", cError);
    return;
  }

  // Assign products to whatever categories exist (round robin)
  const products = [
    { barcode: '8901234567890', name: 'Fresh Milk 500ml', price: 65.00, cost_price: 50.00, stock_quantity: 50, category_id: categories[0].id, unit: 'pcs', tax_rate: 16, discount_percent: 0, min_stock_level: 10, is_active: true },
    { barcode: '8901234567891', name: 'White Bread 400g', price: 55.00, cost_price: 45.00, stock_quantity: 30, category_id: categories[1 % categories.length].id, unit: 'pcs', tax_rate: 16, discount_percent: 5, min_stock_level: 5, is_active: true },
    { barcode: '8901234567892', name: 'Sugar 1kg', price: 160.00, cost_price: 140.00, stock_quantity: 100, category_id: categories[2 % categories.length].id, unit: 'pcs', tax_rate: 16, discount_percent: 0, min_stock_level: 20, is_active: true },
    { barcode: '8901234567893', name: 'Cooking Oil 1L', price: 280.00, cost_price: 250.00, stock_quantity: 40, category_id: categories[2 % categories.length].id, unit: 'pcs', tax_rate: 16, discount_percent: 0, min_stock_level: 10, is_active: true },
    { barcode: '8901234567894', name: 'Rice 2kg', price: 320.00, cost_price: 280.00, stock_quantity: 60, category_id: categories[2 % categories.length].id, unit: 'pcs', tax_rate: 16, discount_percent: 10, min_stock_level: 15, is_active: true },
    { barcode: '8901234567895', name: 'Wheat Flour 2kg', price: 210.00, cost_price: 180.00, stock_quantity: 45, category_id: categories[2 % categories.length].id, unit: 'pcs', tax_rate: 16, discount_percent: 0, min_stock_level: 10, is_active: true },
    { barcode: '8901234567896', name: 'Eggs (Tray)', price: 450.00, cost_price: 390.00, stock_quantity: 20, category_id: categories[0].id, unit: 'pcs', tax_rate: 16, discount_percent: 0, min_stock_level: 5, is_active: true },
    { barcode: '8901234567897', name: 'Salt 1kg', price: 35.00, cost_price: 25.00, stock_quantity: 80, category_id: categories[2 % categories.length].id, unit: 'pcs', tax_rate: 16, discount_percent: 0, min_stock_level: 20, is_active: true }
  ];

  console.log("Inserting products...");
  const { data: pData, error: pError } = await supabase.from('products').insert(products).select();
  if (pError) {
    console.error("Products Insert Error:", pError);
  } else {
    console.log(`Successfully seeded ${pData.length} products!`);
  }
}

seed();

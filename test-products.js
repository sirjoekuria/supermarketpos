const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpdate() {
  const { data: products, error } = await supabase.from('products').select('*').limit(1);
  if (error) {
    console.error('Error fetching:', error);
    return;
  }
  
  if (!products || products.length === 0) {
    console.log('No products found to update');
    return;
  }
  
  const product = products[0];
  console.log('Found product:', product.name, product.id);
  
  const updateData = {
    name: product.name + ' Edit',
  };
  
  const { data: updated, error: updateError } = await supabase
    .from('products')
    .update(updateData)
    .eq('id', product.id)
    .select()
    .single();
    
  if (updateError) {
    console.error('Error updating:', updateError);
  } else {
    console.log('Successfully updated:', updated.name);
    // Revert back
    await supabase.from('products').update({ name: product.name }).eq('id', product.id);
  }
}

testUpdate();

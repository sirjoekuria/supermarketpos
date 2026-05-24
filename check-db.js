const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qzazowqnyssahwwcstkg.supabase.co';
const supabaseAnonKey = 'sb_publishable_YOg7CoZlkFSAGGVmZlJ21g_ikfpe8oQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkProducts() {
  console.log("Checking products table...");
  const { data: products, error: pError } = await supabase.from('products').select('*');
  if (pError) console.error("Products Error:", pError);
  else console.log("Products Count:", products.length);

  console.log("Checking categories table...");
  const { data: categories, error: cError } = await supabase.from('categories').select('*');
  if (cError) console.error("Categories Error:", cError);
  else console.log("Categories Count:", categories.length);
}

checkProducts();

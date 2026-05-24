const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, ".env.local");
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf-8");
  envConfig.split("\n").forEach((line) => {
    const parts = line.split("=");
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join("=").trim().replace(/^["']|["']$/g, "");
      process.env[key] = val;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function listTables() {
  console.log("Listing tables for:", supabaseUrl);
  
  // Use a query on information_schema or just fetch some common tables
  const tables = ['products', 'categories', 'sales', 'sale_items', 'mpesa_transactions', 'settings', 'app_users', 'audit_logs'];
  
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('count', { count: 'exact', head: true });
    if (error) {
      console.log(`❌ Table '${t}' failed:`, error.message);
    } else {
      console.log(`✅ Table '${t}' exists. Count:`, data ? data.length : 0);
    }
  }
}

listTables();

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load .env.local manually
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

async function check() {
  console.log("Connecting to Supabase at:", supabaseUrl);
  const { data: txs, error } = await supabase
    .from("mpesa_transactions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("Error fetching transactions:", error);
    return;
  }

  if (txs.length === 0) {
    console.log("No transactions found.");
    return;
  }

  console.log(`\nFound ${txs.length} recent transactions:\n`);
  txs.forEach((tx, idx) => {
    const created = new Date(tx.created_at);
    const updated = new Date(tx.updated_at);
    const diffMs = updated.getTime() - created.getTime();
    console.log(`[${idx + 1}] ID: ${tx.checkout_request_id}`);
    console.log(`    Phone: ${tx.phone_number}`);
    console.log(`    Amount: KES ${tx.amount}`);
    console.log(`    Status: ${tx.status}`);
    console.log(`    Result Desc: ${tx.result_desc}`);
    console.log(`    M-Pesa Receipt: ${tx.mpesa_receipt_number || "NONE"}`);
    console.log(`    Created At: ${tx.created_at}`);
    console.log(`    Updated At: ${tx.updated_at}`);
    console.log(`    Time to Update: ${(diffMs / 1000).toFixed(2)} seconds`);
    console.log("------------------------------------------");
  });
}

check();

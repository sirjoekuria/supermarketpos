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

async function testInsert() {
  console.log("Testing insert into mpesa_transactions...");
  const tempId = "test_" + Date.now();
  const { data, error } = await supabase
    .from("mpesa_transactions")
    .insert({
      checkout_request_id: tempId,
      phone_number: "254700000000",
      amount: 10,
      status: "pending"
    })
    .select();

  if (error) {
    console.error("❌ Insert failed:", error);
  } else {
    console.log("✅ Insert succeeded:", data);
    
    // Clean up
    console.log("Cleaning up...");
    const { error: delError } = await supabase
      .from("mpesa_transactions")
      .delete()
      .eq("checkout_request_id", tempId);
    if (delError) console.error("❌ Cleanup failed:", delError);
    else console.log("✅ Cleanup succeeded.");
  }
}

testInsert();

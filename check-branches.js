const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load .env.local manually
const envPath = path.join(__dirname, ".env.local");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8").split("\n").forEach((line) => {
    const [key, ...rest] = line.split("=");
    if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
  });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function main() {
  console.log("Testing branches table...");

  // Test SELECT
  const { data, error } = await supabase.from("branches").select("id,name").limit(3);
  if (error) {
    console.log("❌ SELECT failed:", error.message);
    console.log("   Code:", error.code);
    console.log("   The branches table likely doesn't exist — run the SQL migrations in Supabase.");
    return;
  }
  console.log("✅ SELECT OK, rows:", data);

  // Test INSERT
  const { data: ins, error: insErr } = await supabase
    .from("branches")
    .insert({ name: "TEST BRANCH - DELETE ME", address: "Test", is_active: true })
    .select()
    .single();
  if (insErr) {
    console.log("❌ INSERT failed:", insErr.message, insErr.code);
  } else {
    console.log("✅ INSERT OK:", ins.id, ins.name);
    // Clean up test row
    await supabase.from("branches").delete().eq("id", ins.id);
    console.log("✅ Cleanup OK");
  }
}

main().catch(console.error);

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

async function testCloseShift() {
  // Try finding an open shift
  const { data: shift, error: shiftError } = await supabase
    .from("shifts")
    .select("*")
    .eq("status", "open")
    .limit(1)
    .single();

  if (shiftError || !shift) {
    console.log("No open shift found to close.", shiftError);
    return;
  }

  console.log("Found shift:", shift.id, "opened at", shift.opened_at);

  const { data: sales, error: salesError } = await supabase
    .from("sales")
    .select("payment_method, total, split_payments")
    .eq("cashier_id", shift.cashier_id)
    .gte("created_at", shift.opened_at);

  if (salesError) {
    console.error("Sales Error:", salesError);
    return;
  }
  console.log("Sales queried OK:", sales.length);

  const expected_cash = Number(shift.starting_cash) + 0;
  const actual_cash = 0;
  const difference = actual_cash - expected_cash;

  const { data: closedShift, error: updateError } = await supabase
    .from("shifts")
    .update({
      expected_cash,
      actual_cash,
      difference,
      status: "closed",
      closed_at: new Date().toISOString(),
    })
    .eq("id", shift.id)
    .select()
    .single();

  if (updateError) {
    console.error("Update Shift Error:", updateError);
  } else {
    console.log("Shift closed successfully:", closedShift);
  }
}

testCloseShift();

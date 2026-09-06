const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const envPath = path.join(process.cwd(), ".env.local");
const envConfig = fs.readFileSync(envPath, "utf-8");
envConfig.split("\n").forEach(line => {
  const parts = line.split("=");
  if (parts.length >= 2) process.env[parts[0].trim()] = parts.slice(1).join("=").trim().replace(/^['"]|['"]$/g, "");
});

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

supabase.from("sales").select("*").limit(1).then(res => {
  if (res.error) console.error(res.error);
  else {
    if (res.data.length > 0) {
      console.log("Columns:", Object.keys(res.data[0]));
    } else {
      console.log("No data, try schema check via postgres_changes or insert dummy");
    }
  }
});

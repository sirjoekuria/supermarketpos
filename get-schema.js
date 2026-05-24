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

async function getSchema() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL + "/rest/v1/";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  console.log("Fetching OpenAPI schema from:", url);
  try {
    const res = await fetch(url, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`
      }
    });
    
    console.log("HTTP Status:", res.status);
    const data = await res.json();
    
    if (data.paths) {
      console.log("\nAvailable endpoints (tables/views):");
      Object.keys(data.paths).forEach((p) => {
        if (p !== "/" && p !== "/rpc/{name}") {
          console.log(` - ${p}`);
        }
      });
      
      console.log("\nDefinitions (schemas):");
      if (data.definitions) {
        Object.keys(data.definitions).forEach((d) => {
          console.log(` - ${d}`);
        });
      }
    } else {
      console.log("No paths found in response.");
    }
  } catch (err) {
    console.error("Failed to fetch schema:", err);
  }
}

getSchema();

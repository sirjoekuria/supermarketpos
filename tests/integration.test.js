const http = require("http");

function fetchBranches() {
  return new Promise((resolve, reject) => {
    http.get("http://localhost:3000/api/branches", (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
    }).on("error", reject);
  });
}

async function runIntegrationTest() {
  console.log("Running Integration Test (API -> DB)...");
  
  try {
    const result = await fetchBranches();
    
    if (result.status !== 200) {
      throw new Error(`API returned ${result.status}`);
    }
    
    if (!result.data || !Array.isArray(result.data.branches)) {
      throw new Error("Invalid response format, expected { branches: [...] }");
    }
    
    console.log(`✅ [PASS] Successfully fetched ${result.data.branches.length} branches from the database.`);
  } catch (error) {
    console.error(`❌ [FAIL] Integration test failed: ${error.message}`);
    process.exit(1);
  }
}

runIntegrationTest();

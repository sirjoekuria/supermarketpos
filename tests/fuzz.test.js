const http = require("http");

function sendPostRequest(url, payload) {
  return new Promise((resolve) => {
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload)
      }
    };
    
    const req = http.request(url, options, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve({ status: res.statusCode, data }));
    });
    
    req.on("error", (e) => resolve({ status: "ERROR", error: e.message }));
    req.write(payload);
    req.end();
  });
}

async function runFuzzTests() {
  console.log("Running Fuzz Tests on /api/sales...");

  const testCases = [
    { name: "Empty Object", payload: "{}" },
    { name: "Invalid JSON", payload: "{ items: [ { id: 1 ] }" },
    { name: "Negative Prices", payload: JSON.stringify({ items: [{ product_id: "123", quantity: 1, unit_price: -50, total: -50 }] }) },
    { name: "Missing items array", payload: JSON.stringify({ total: 100 }) }
  ];

  let passed = true;
  for (const tc of testCases) {
    const result = await sendPostRequest("http://localhost:3000/api/sales", tc.payload);
    // As long as the server doesn't crash and returns 4xx or 500 cleanly, it's considered a pass for basic fuzzing.
    if (result.status >= 400 && result.status < 600) {
      console.log(`✅ [PASS] ${tc.name} returned expected error status: ${result.status}`);
    } else {
      console.log(`❌ [FAIL] ${tc.name} returned unexpected status: ${result.status}`);
      passed = false;
    }
  }

  if (!passed) {
    console.error("\nSome fuzz tests failed!");
    process.exit(1);
  } else {
    console.log("\nAll fuzz tests passed successfully!");
  }
}

runFuzzTests();

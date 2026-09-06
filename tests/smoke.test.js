const http = require("http");

async function checkUrl(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      resolve({ url, status: res.statusCode });
    }).on("error", (e) => {
      resolve({ url, status: "ERROR", error: e.message });
    });
  });
}

async function runSmokeTests() {
  const routes = [
    "http://localhost:3000/",
    "http://localhost:3000/api/branches",
    "http://localhost:3000/api/shifts?limit=1"
  ];

  console.log("Running Smoke Tests on localhost:3000...");
  
  let passed = true;
  for (const route of routes) {
    const result = await checkUrl(route);
    if (result.status === 200) {
      console.log(`✅ [PASS] ${result.url} returned ${result.status}`);
    } else {
      console.log(`❌ [FAIL] ${result.url} returned ${result.status} ${result.error || ""}`);
      passed = false;
    }
  }

  if (!passed) {
    console.error("\nSome smoke tests failed!");
    process.exit(1);
  } else {
    console.log("\nAll smoke tests passed successfully!");
  }
}

runSmokeTests();

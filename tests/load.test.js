const http = require("http");

function makeRequest() {
  return new Promise((resolve) => {
    const start = Date.now();
    http.get("http://localhost:3000/api/branches", (res) => {
      res.on("data", () => {}); // consume data
      res.on("end", () => resolve({ status: res.statusCode, time: Date.now() - start }));
    }).on("error", (e) => resolve({ status: "ERROR", error: e.message, time: Date.now() - start }));
  });
}

async function runLoadTest(concurrency, totalRequests, label) {
  console.log(`\n--- Running ${label} (${concurrency} concurrent, ${totalRequests} total) ---`);
  const results = [];
  let inFlight = 0;
  let completed = 0;
  
  const start = Date.now();
  
  return new Promise((resolve) => {
    function dispatch() {
      while (inFlight < concurrency && (inFlight + completed) < totalRequests) {
        inFlight++;
        makeRequest().then(res => {
          results.push(res);
          inFlight--;
          completed++;
          
          if (completed === totalRequests) {
            const end = Date.now();
            const duration = end - start;
            
            const successes = results.filter(r => r.status === 200).length;
            const failures = results.length - successes;
            const avgTime = results.reduce((sum, r) => sum + r.time, 0) / results.length;
            
            console.log(`Completed in ${duration}ms`);
            console.log(`Success: ${successes} | Failures: ${failures}`);
            console.log(`Avg Response Time: ${avgTime.toFixed(2)}ms`);
            
            if (failures > 0) {
              console.log("❌ [FAIL] Some requests failed under load.");
              resolve(false);
            } else {
              console.log("✅ [PASS] All requests succeeded under load.");
              resolve(true);
            }
          } else {
            dispatch();
          }
        });
      }
    }
    dispatch();
  });
}

async function main() {
  console.log("Starting Performance Tests...");
  
  // Load Test
  const loadPassed = await runLoadTest(20, 100, "Load Test");
  
  // Stress Test (Wait a bit for connections to clear)
  await new Promise(r => setTimeout(r, 2000));
  const stressPassed = await runLoadTest(100, 500, "Stress Test");
  
  if (!loadPassed || !stressPassed) {
    console.error("\nSome performance tests failed. Server might be struggling.");
    process.exit(1);
  } else {
    console.log("\nAll performance tests passed successfully!");
  }
}

main();

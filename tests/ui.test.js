const http = require("http");

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let html = "";
      res.on("data", chunk => html += chunk);
      res.on("end", () => resolve({ status: res.statusCode, html }));
    }).on("error", reject);
  });
}

async function runUITest() {
  console.log("Running UI SSR Test on /...");
  
  try {
    const result = await fetchHtml("http://localhost:3000/");
    
    if (result.status !== 200) {
      throw new Error(`Server returned ${result.status}`);
    }
    
    // Check if key UI elements are present in the server-side rendered HTML
    const checks = [
      { name: "Page Title", regex: /<title>.*<\/title>/i },
      { name: "Root Div", regex: /id="__next"|id="root"|class=".*"/i },
      { name: "Meta Tags", regex: /<meta/i }
    ];
    
    let passed = true;
    for (const check of checks) {
      if (check.regex.test(result.html)) {
        console.log(`✅ [PASS] Found UI Element: ${check.name}`);
      } else {
        console.log(`❌ [FAIL] Missing UI Element: ${check.name}`);
        passed = false;
      }
    }
    
    if (!passed) {
      process.exit(1);
    } else {
      console.log("\nAll UI tests passed successfully!");
    }
  } catch (error) {
    console.error(`❌ [FAIL] UI test failed: ${error.message}`);
    process.exit(1);
  }
}

runUITest();

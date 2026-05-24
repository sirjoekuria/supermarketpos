async function test() {
  const url = "http://localhost:3000/api/mpesa/query?checkoutRequestId=ws_CO_24052026232800074700898950&elapsed=16";
  console.log("Fetching local query route:", url);
  try {
    const res = await fetch(url);
    console.log("HTTP Status:", res.status);
    const data = await res.json();
    console.log("JSON Response:", data);
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

test();

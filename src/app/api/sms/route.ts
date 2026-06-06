import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { to, message, apiKey, username } = body;

    if (!to || !message || !apiKey || !username) {
      return NextResponse.json(
        { error: "Missing required fields: to, message, apiKey, username" },
        { status: 400 }
      );
    }

    // Format phone number to E.164 if it's a Kenyan local number
    let formattedTo = to;
    if (formattedTo.startsWith("07") || formattedTo.startsWith("01")) {
      formattedTo = "+254" + formattedTo.slice(1);
    } else if (formattedTo.startsWith("254")) {
      formattedTo = "+" + formattedTo;
    }

    const params = new URLSearchParams();
    params.append("username", username);
    params.append("to", formattedTo);
    params.append("message", message);

    const apiUrl = username === "sandbox" 
      ? "https://api.sandbox.africastalking.com/version1/messaging"
      : "https://api.africastalking.com/version1/messaging";

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "apiKey": apiKey,
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Africa's Talking API Error:", data);
      return NextResponse.json(
        { error: "Failed to send SMS", details: data },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("SMS Route Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

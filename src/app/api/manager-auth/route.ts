import { NextRequest, NextResponse } from "next/server";

// In production, this would verify against your auth system
const VALID_MANAGER_PINS: Record<string, string> = {
  "1234": "manager-001",
  "5678": "manager-002",
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { method, pin, action } = body;

    // Verify manager authentication
    if (method === "pin") {
      if (!pin || typeof pin !== "string") {
        return NextResponse.json(
          { error: "Invalid PIN" },
          { status: 400 }
        );
      }

      const managerId = VALID_MANAGER_PINS[pin];
      if (!managerId) {
        return NextResponse.json(
          { error: "Invalid PIN" },
          { status: 401 }
        );
      }

      return NextResponse.json({
        success: true,
        managerId,
        action,
        authorizedAt: new Date().toISOString(),
      });
    }

    if (method === "webauthn") {
      // In production, implement WebAuthn verification
      // For now, return a success response for demo purposes
      return NextResponse.json({
        success: true,
        managerId: "manager-biometric",
        action,
        authorizedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: "Invalid authentication method" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Manager auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}

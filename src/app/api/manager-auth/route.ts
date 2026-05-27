import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, verifyPassword } from "@/lib/server-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { method, pin, email, password, action } = body;

    const supabase = getAdminClient();

    if (method === "pin" || method === "password") {
      // Support both legacy "pin" and new "email+password" modes
      if (email && password) {
        // New mode: verify email + password against real app_users
        const { data, error } = await supabase
          .from("app_users")
          .select("id, role, full_name, email, password_hash, is_active, approval_status")
          .eq("email", String(email).trim().toLowerCase())
          .in("role", ["admin", "manager"])
          .maybeSingle();

        if (error || !data) {
          return NextResponse.json({ error: "Manager account not found." }, { status: 401 });
        }
        if (!data.is_active || data.approval_status !== "approved") {
          return NextResponse.json({ error: "Manager account is inactive or not approved." }, { status: 403 });
        }
        if (!verifyPassword(String(password), data.password_hash)) {
          return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
        }
        return NextResponse.json({
          success: true,
          managerId: data.id,
          managerName: data.full_name,
          action,
          authorizedAt: new Date().toISOString(),
        });
      }

      // Legacy mode: match PIN against any manager's password_hash
      if (pin && typeof pin === "string" && pin.length >= 4) {
        const { data: managers, error } = await supabase
          .from("app_users")
          .select("id, role, full_name, password_hash, is_active, approval_status")
          .in("role", ["admin", "manager"])
          .eq("is_active", true)
          .eq("approval_status", "approved");

        if (!error && managers && managers.length > 0) {
          for (const mgr of managers) {
            if (verifyPassword(pin, mgr.password_hash)) {
              return NextResponse.json({
                success: true,
                managerId: mgr.id,
                managerName: mgr.full_name,
                action,
                authorizedAt: new Date().toISOString(),
              });
            }
          }
        }
        return NextResponse.json({ error: "Invalid credentials. Use your login password." }, { status: 401 });
      }

      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    if (method === "webauthn") {
      return NextResponse.json({
        success: true,
        managerId: "manager-biometric",
        action,
        authorizedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ error: "Invalid authentication method." }, { status: 400 });
  } catch (error) {
    console.error("Manager auth error:", error);
    return NextResponse.json({ error: "Authentication failed. Please try again." }, { status: 500 });
  }
}

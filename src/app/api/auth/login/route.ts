import { NextResponse } from "next/server";
import { getAdminClient, publicUser, verifyPassword, writeAuditLog, type StaffUserRow } from "@/lib/server-auth";
import { isRateLimited } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "127.0.0.1";
    if (isRateLimited(ip, 5, 60)) {
      return NextResponse.json({ error: "Too many login attempts. Please wait a minute and try again." }, { status: 429 });
    }

    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    // Input validation
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    const supabase = getAdminClient();
    const { data, error } = await supabase.from("app_users").select("*").eq("email", email).maybeSingle();

    if (error || !data || !verifyPassword(password, data.password_hash)) {
      writeAuditLog({
        action: "login_failed",
        entityType: "app_user",
        details: { email },
      });
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const user = data as StaffUserRow;

    if (!user.is_active) {
      return NextResponse.json({ error: "This account is inactive." }, { status: 403 });
    }

    if (user.approval_status !== "approved") {
      const message =
        user.approval_status === "pending_manager"
          ? "This cashier account is waiting for manager approval."
          : user.approval_status === "pending_admin"
          ? "This manager account is waiting for admin approval."
          : "This account was not approved.";
      return NextResponse.json({ error: message, approval_status: user.approval_status }, { status: 403 });
    }

    writeAuditLog({
      actor: user,
      action: "login_success",
      entityType: "app_user",
      entityId: user.id,
      details: { email: user.email, role: user.role },
    });

    return NextResponse.json({ user: publicUser(user) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Login failed." }, { status: 500 });
  }
}


import { NextResponse } from "next/server";
import { getAdminClient, hashPassword, publicUser, type ApprovalStatus, type StaffRole, writeAuditLog } from "@/lib/server-auth";
import { isRateLimited } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_RE = /^[a-zA-ZÀ-ÿ\s'\-]{2,80}$/; // letters, spaces, hyphens, apostrophes

const ROLES: StaffRole[] = ["admin", "manager", "cashier"];

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "127.0.0.1";
    if (isRateLimited(ip, 3, 60)) {
      return NextResponse.json({ error: "Too many registration attempts. Please wait a minute." }, { status: 429 });
    }

    const body = await request.json();
    const fullName = String(body.full_name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const role = body.role as StaffRole;

    // Input validation
    if (!NAME_RE.test(fullName)) {
      return NextResponse.json({ error: "Full name must be 2–80 characters and contain only letters." }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }
    if (!ROLES.includes(role)) {
      return NextResponse.json({ error: "Please select a valid role." }, { status: 400 });
    }

    const supabase = getAdminClient();
    const { data: existing } = await supabase.from("app_users").select("id").eq("email", email).maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    }

    const approvalStatus: ApprovalStatus =
      role === "cashier" ? "pending_manager" : role === "manager" ? "pending_admin" : "approved";

    const { data, error } = await supabase
      .from("app_users")
      .insert({
        full_name: fullName,
        email,
        role,
        password_hash: hashPassword(password),
        approval_status: approvalStatus,
        is_active: true,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await writeAuditLog({
      action: "user_registered",
      entityType: "app_user",
      entityId: data.id,
      details: { email, role, approval_status: approvalStatus },
    });

    return NextResponse.json({ user: publicUser(data), approval_status: approvalStatus });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Registration failed." }, { status: 500 });
  }
}

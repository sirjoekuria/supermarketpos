import { NextResponse } from "next/server";
import { getAdminClient, hashPassword, publicUser, type ApprovalStatus, type StaffRole, writeAuditLog } from "@/lib/server-auth";

const ROLES: StaffRole[] = ["admin", "manager", "cashier"];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const fullName = String(body.full_name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const role = body.role as StaffRole;

    if (!fullName || !email || password.length < 6 || !ROLES.includes(role)) {
      return NextResponse.json({ error: "Enter a name, valid role, email, and password with at least 6 characters." }, { status: 400 });
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

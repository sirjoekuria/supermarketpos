import { NextResponse } from "next/server";
import { getAdminClient, hashPassword, writeAuditLog, type StaffRole } from "@/lib/server-auth";

export async function GET() {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from("app_users")
      .select("id, full_name, email, phone, role, is_active, approval_status, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ users: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { full_name, email, phone, role, password, is_active } = body;

    const supabase = getAdminClient();

    // Check if user already exists
    const { data: existing } = await supabase
      .from("app_users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    }

    // Insert user, automatically approved because an admin is creating them
    const { data, error } = await supabase
      .from("app_users")
      .insert({
        full_name,
        email: email.trim().toLowerCase(),
        phone: phone || null,
        role,
        password_hash: hashPassword(password),
        approval_status: "approved",
        is_active: is_active !== false,
      })
      .select("id, full_name, email, phone, role, is_active, approval_status, created_at")
      .single();

    if (error) throw error;

    writeAuditLog({
      action: "user_created_by_admin",
      entityType: "app_user",
      entityId: data.id,
      details: { email, role },
    });

    return NextResponse.json({ user: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


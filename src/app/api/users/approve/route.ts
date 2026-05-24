import { NextResponse } from "next/server";
import { findApprovedActor, getAdminClient, publicUser, writeAuditLog, type StaffUserRow } from "@/lib/server-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const actor = await findApprovedActor(String(body.actorId || ""));

    if (!actor || (actor.role !== "manager" && actor.role !== "admin")) {
      return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    }

    const decision = body.decision === "reject" ? "reject" : "approve";
    const supabase = getAdminClient();
    const { data: target, error: targetError } = await supabase
      .from("app_users")
      .select("*")
      .eq("id", String(body.targetId || ""))
      .single();

    if (targetError || !target) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    const pendingUser = target as StaffUserRow;
    const canApprove =
      (actor.role === "manager" && pendingUser.role === "cashier" && pendingUser.approval_status === "pending_manager") ||
      (actor.role === "admin" && pendingUser.role === "manager" && pendingUser.approval_status === "pending_admin");

    if (!canApprove) {
      return NextResponse.json({ error: "This account is not waiting for your approval." }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("app_users")
      .update({
        approval_status: decision === "approve" ? "approved" : "rejected",
        is_active: decision === "approve",
        approved_by: actor.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", pendingUser.id)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await writeAuditLog({
      actor,
      action: decision === "approve" ? "user_approved" : "user_rejected",
      entityType: "app_user",
      entityId: pendingUser.id,
      details: { target_email: pendingUser.email, target_role: pendingUser.role },
    });

    return NextResponse.json({ user: publicUser(data) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Approval failed." }, { status: 500 });
  }
}

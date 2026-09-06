import { NextResponse } from "next/server";
import { getAdminClient, findApprovedActor, writeAuditLog, hasPermission } from "@/lib/server-auth";

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const actorId = request.headers.get("x-user-id");
    if (!actorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const actor = await findApprovedActor(actorId);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    // Enforce Granular Permission
    if (!hasPermission(actor.role, "canDeleteUsers")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const targetUserId = params.id;
    if (!targetUserId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    if (actor.id === targetUserId) {
      return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
    }

    const supabase = getAdminClient();

    // 1. Delete from app_users (This will cascade to other tables if foreign keys are set to CASCADE)
    const { error: dbError } = await supabase
      .from("app_users")
      .delete()
      .eq("id", targetUserId);

    if (dbError) throw dbError;

    // 2. Also delete from Supabase Auth if applicable
    // Since we're using getAdminClient, we have admin rights
    const { error: authError } = await supabase.auth.admin.deleteUser(targetUserId);
    
    // We don't throw on authError because they might not exist in Supabase auth (just in app_users)
    if (authError) {
      console.warn("Failed to delete from Supabase Auth (may not exist):", authError);
    }

    await writeAuditLog({
      actor,
      action: "user_hard_deleted",
      entityType: "app_user",
      entityId: targetUserId,
      details: { deleted_user_id: targetUserId },
    });

    return NextResponse.json({ success: true, message: "User completely removed from system." });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
}

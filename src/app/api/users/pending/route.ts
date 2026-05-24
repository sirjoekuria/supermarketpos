import { NextResponse } from "next/server";
import { findApprovedActor, getAdminClient, publicUser } from "@/lib/server-auth";

export async function GET(request: Request) {
  try {
    const actorId = new URL(request.url).searchParams.get("actorId");
    if (!actorId) return NextResponse.json({ error: "Missing actor." }, { status: 401 });

    const actor = await findApprovedActor(actorId);
    if (!actor || (actor.role !== "manager" && actor.role !== "admin")) {
      return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    }

    const supabase = getAdminClient();
    const pendingStatus = actor.role === "admin" ? "pending_admin" : "pending_manager";

    const { data, error } = await supabase
      .from("app_users")
      .select("*")
      .eq("approval_status", pendingStatus)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ users: (data || []).map(publicUser) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load approvals." }, { status: 500 });
  }
}

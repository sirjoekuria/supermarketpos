import { NextResponse } from "next/server";
import { findApprovedActor, getAdminClient } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const actorId = new URL(request.url).searchParams.get("actorId");
    if (!actorId) return NextResponse.json({ error: "Missing actor." }, { status: 401 });

    const actor = await findApprovedActor(actorId);
    if (!actor || actor.role !== "admin") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ logs: data || [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load audit logs." }, { status: 500 });
  }
}

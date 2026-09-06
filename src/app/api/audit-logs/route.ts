export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { findApprovedActor, getAdminClient } from "@/lib/server-auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const actorId = searchParams.get("actorId");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20")));

    if (!actorId) return NextResponse.json({ error: "Missing actor." }, { status: 401 });

    const actor = await findApprovedActor(actorId);
    if (!actor || actor.role !== "admin") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const supabase = getAdminClient();
    
    // Get total count
    const { count, error: countError } = await supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true });
      
    if (countError) throw countError;

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({ 
      logs: data || [],
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
}

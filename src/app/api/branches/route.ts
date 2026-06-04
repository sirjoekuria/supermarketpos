import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { writeAuditLog } from "@/lib/server-auth";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase server credentials.");
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// GET all branches
export async function GET() {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from("branches")
      .select("*")
      .order("name");
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ branches: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch branches" },
      { status: 500 }
    );
  }
}

// POST create branch
export async function POST(request: Request) {
  try {
    const supabase = getAdminClient();
    const body = await request.json();

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Branch name is required" }, { status: 400 });
    }

    const { data: branch, error } = await supabase
      .from("branches")
      .insert({
        name: body.name.trim(),
        address: body.address?.trim() || null,
        phone: body.phone?.trim() || null,
        is_active: body.is_active !== false,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await writeAuditLog({
      action: "branch_created",
      entityType: "branch",
      entityId: branch.id,
      details: { name: branch.name },
    });

    return NextResponse.json({ branch });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create branch" },
      { status: 500 }
    );
  }
}

// PATCH update branch
export async function PATCH(request: Request) {
  try {
    const supabase = getAdminClient();
    const body = await request.json();
    const { id, ...fields } = body;

    if (!id) return NextResponse.json({ error: "Missing branch ID" }, { status: 400 });

    const { data: branch, error } = await supabase
      .from("branches")
      .update({
        name: fields.name?.trim(),
        address: fields.address !== undefined ? (fields.address?.trim() || null) : undefined,
        phone: fields.phone !== undefined ? (fields.phone?.trim() || null) : undefined,
        is_active: fields.is_active !== undefined ? fields.is_active : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await writeAuditLog({
      action: "branch_updated",
      entityType: "branch",
      entityId: branch.id,
      details: { name: branch.name },
    });

    return NextResponse.json({ branch });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update branch" },
      { status: 500 }
    );
  }
}

// DELETE (deactivate) branch
export async function DELETE(request: Request) {
  try {
    const supabase = getAdminClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "Missing branch ID" }, { status: 400 });

    const { error } = await supabase
      .from("branches")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await writeAuditLog({
      action: "branch_deactivated",
      entityType: "branch",
      entityId: id,
      details: {},
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to deactivate branch" },
      { status: 500 }
    );
  }
}

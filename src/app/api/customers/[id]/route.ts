import { NextResponse } from "next/server";
import { getAdminClient, writeAuditLog } from "@/lib/server-auth";

// GET /api/customers/[id] - Fetch single customer details
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const supabase = getAdminClient();

    const { data: customer, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ customer });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch customer details." },
      { status: 500 }
    );
  }
}

// PATCH /api/customers/[id] - Update customer details (and administrative point balance adjustment)
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await request.json();
    const { name, phone, email, points_balance, adjustment_reason, actor } = body;

    const supabase = getAdminClient();

    // Fetch current details first
    const { data: current, error: fetchError } = await supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !current) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (email !== undefined) updates.email = email?.trim() || null;

    let pointsDifference = 0;
    if (points_balance !== undefined && Number.isInteger(points_balance)) {
      if (points_balance < 0) {
        return NextResponse.json({ error: "Points balance cannot be negative." }, { status: 400 });
      }
      pointsDifference = points_balance - current.points_balance;
      updates.points_balance = points_balance;
    }

    updates.updated_at = new Date().toISOString();

    // Check if phone number conflict exists if phone is being updated
    if (updates.phone && updates.phone !== current.phone) {
      const { data: phoneConflict } = await supabase
        .from("customers")
        .select("id")
        .eq("phone", updates.phone)
        .maybeSingle();

      if (phoneConflict) {
        return NextResponse.json({ error: "Phone number is already registered to another customer." }, { status: 400 });
      }
    }

    // Run transaction steps sequentially
    const { data: updatedCustomer, error: updateError } = await supabase
      .from("customers")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // Log manual adjustment in point_transactions if points changed
    if (pointsDifference !== 0) {
      await supabase.from("point_transactions").insert({
        customer_id: id,
        type: "adjust",
        points: pointsDifference,
        balance_after: points_balance,
        reference: adjustment_reason || "Administrative points adjustment",
      });

      // Write to audit log for tracking high privilege action
      writeAuditLog({
        actor: actor || null,
        action: "customer_points_adjusted",
        entityType: "customer",
        entityId: id,
        details: {
          customer_name: updatedCustomer.name,
          previous_points: current.points_balance,
          new_points: points_balance,
          difference: pointsDifference,
          reason: adjustment_reason || "No reason specified",
        },
      }).catch((err) => console.warn("Points adjustment audit log failed:", err));
    }

    return NextResponse.json({ customer: updatedCustomer });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update customer." },
      { status: 500 }
    );
  }
}

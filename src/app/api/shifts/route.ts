import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/server-auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { branch_id, cashier_id, starting_cash } = body;

    if (!cashier_id) {
      return NextResponse.json({ error: "Cashier ID is required" }, { status: 400 });
    }

    const supabase = getAdminClient();

    // Check if cashier already has an open shift
    const { data: existing, error: existingError } = await supabase
      .from("shifts")
      .select("*")
      .eq("cashier_id", cashier_id)
      .eq("status", "open")
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing) {
      return NextResponse.json({ error: "Cashier already has an open shift", shift: existing }, { status: 400 });
    }

    const { data: newShift, error: insertError } = await supabase
      .from("shifts")
      .insert({
        branch_id: branch_id || null,
        cashier_id,
        starting_cash: starting_cash || 0,
        expected_cash: starting_cash || 0,
        status: "open",
        opened_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, shift: newShift });
  } catch (error) {
    console.error("Open Shift Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { shift_id, actual_cash } = body;

    if (!shift_id || actual_cash === undefined) {
      return NextResponse.json({ error: "Shift ID and actual cash are required" }, { status: 400 });
    }

    const supabase = getAdminClient();

    const { data: shift, error: shiftError } = await supabase
      .from("shifts")
      .select("*")
      .eq("id", shift_id)
      .eq("status", "open")
      .maybeSingle();

    if (shiftError || !shift) {
      return NextResponse.json({ error: "Open shift not found" }, { status: 404 });
    }

    // Calculate cash sales during this shift
    const { data: sales, error: salesError } = await supabase
      .from("sales")
      .select("payment_method, total, split_payments")
      .eq("cashier_id", shift.cashier_id)
      .gte("created_at", shift.opened_at);

    if (salesError) throw salesError;

    let cashSalesTotal = 0;
    for (const sale of sales || []) {
      if (sale.payment_method === 'cash') {
        cashSalesTotal += Number(sale.total);
      } else if (sale.payment_method === 'split' && sale.split_payments) {
        const sp = typeof sale.split_payments === 'string' 
            ? JSON.parse(sale.split_payments) 
            : sale.split_payments;
            
        sp.forEach((p: any) => {
          if (p.method === 'cash') {
            cashSalesTotal += Number(p.amount);
          }
        });
      }
    }

    const expected_cash = Number(shift.starting_cash) + cashSalesTotal;
    const difference = Number(actual_cash) - expected_cash;

    const { data: closedShift, error: updateError } = await supabase
      .from("shifts")
      .update({
        expected_cash,
        actual_cash,
        difference,
        status: "closed",
        closed_at: new Date().toISOString(),
      })
      .eq("id", shift_id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, shift: closedShift });
  } catch (error) {
    console.error("Close Shift Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cashier_id = searchParams.get("cashier_id");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const supabase = getAdminClient();
    let query = supabase
      .from("shifts")
      .select("*, app_users(full_name)")
      .order("opened_at", { ascending: false })
      .limit(limit);

    if (cashier_id) {
      query = query.eq("cashier_id", cashier_id);
    }
    if (status) {
      query = query.eq("status", status);
    }

    const { data: shifts, error } = await query;

    if (error) throw error;

    return NextResponse.json({ shifts: shifts || [] });
  } catch (error) {
    console.error("Get Shifts Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
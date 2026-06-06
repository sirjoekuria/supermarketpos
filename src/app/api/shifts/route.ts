import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { branch_id, cashier_id, starting_cash } = body;

    if (!cashier_id) {
      return NextResponse.json({ error: "Cashier ID is required" }, { status: 400 });
    }

    // Check if cashier already has an open shift
    const existing = await query(
      "SELECT * FROM shifts WHERE cashier_id = $1 AND status = 'open'",
      [cashier_id]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "Cashier already has an open shift", shift: existing.rows[0] }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO shifts (branch_id, cashier_id, starting_cash, expected_cash, status, opened_at)
       VALUES ($1, $2, $3, $3, 'open', NOW())
       RETURNING *`,
      [branch_id || null, cashier_id, starting_cash || 0]
    );

    return NextResponse.json({ success: true, shift: result.rows[0] });
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

    const shiftRes = await query("SELECT * FROM shifts WHERE id = $1 AND status = 'open'", [shift_id]);
    if (shiftRes.rows.length === 0) {
      return NextResponse.json({ error: "Open shift not found" }, { status: 404 });
    }
    const shift = shiftRes.rows[0];

    // Calculate cash sales during this shift
    const salesRes = await query(
      `SELECT payment_method, total, split_payments FROM sales 
       WHERE cashier_id = $1 AND created_at >= $2`,
      [shift.cashier_id, shift.opened_at]
    );

    let cashSalesTotal = 0;
    for (const sale of salesRes.rows) {
      if (sale.payment_method === 'cash') {
        cashSalesTotal += Number(sale.total);
      } else if (sale.payment_method === 'split' && sale.split_payments) {
        // split_payments is an array of objects: { method: 'cash', amount: ... }
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

    const closeRes = await query(
      `UPDATE shifts 
       SET expected_cash = $1, actual_cash = $2, difference = $3, status = 'closed', closed_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [expected_cash, actual_cash, difference, shift_id]
    );

    return NextResponse.json({ success: true, shift: closeRes.rows[0] });
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
    const limit = searchParams.get("limit") || "100";

    let q = `
      SELECT s.*, u.full_name as cashier_name 
      FROM shifts s
      LEFT JOIN app_users u ON s.cashier_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (cashier_id) {
      params.push(cashier_id);
      q += ` AND s.cashier_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      q += ` AND s.status = $${params.length}`;
    }

    params.push(limit);
    q += ` ORDER BY s.opened_at DESC LIMIT $${params.length}`;

    const res = await query(q, params);
    return NextResponse.json({ shifts: res.rows });
  } catch (error) {
    console.error("Get Shifts Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getAdminClient, writeAuditLog } from "@/lib/server-auth";

// GET all transactions with filters, search, and join on sales
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.trim() || "";
    const status = url.searchParams.get("status") || "all"; // 'all', 'success', 'failed', 'pending', 'linked', 'unlinked'
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    const supabase = getAdminClient();
    let query = supabase
      .from("mpesa_transactions")
      .select("*, sales(receipt_number)", { count: "exact" });

    // Text search on code or phone number
    if (search) {
      query = query.or(`mpesa_receipt_number.ilike.%${search}%,phone_number.ilike.%${search}%,customer_name.ilike.%${search}%`);
    }

    // Status filtering
    if (status === "linked") {
      query = query.not("sale_id", "is", null);
    } else if (status === "unlinked") {
      query = query.is("sale_id", null).eq("status", "success");
    } else if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ transactions: data || [], total: count || 0 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}

// POST: Manually insert a verified M-Pesa transaction record
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mpesa_receipt_number, amount, phone_number, customer_name, actor } = body;

    if (!mpesa_receipt_number || !amount || !phone_number) {
      return NextResponse.json({ error: "Missing required fields: mpesa_receipt_number, amount, phone_number." }, { status: 400 });
    }

    const code = mpesa_receipt_number.trim().toUpperCase();
    if (code.length < 8) {
      return NextResponse.json({ error: "M-Pesa receipt number must be at least 8 characters long." }, { status: 400 });
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number." }, { status: 400 });
    }

    const supabase = getAdminClient();

    // Check if receipt number already exists
    const { data: existing } = await supabase
      .from("mpesa_transactions")
      .select("id, mpesa_receipt_number")
      .eq("mpesa_receipt_number", code)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: `An M-Pesa transaction with code ${code} already exists in the database.` }, { status: 400 });
    }

    // Insert record
    const timestamp = new Date().toISOString();
    const { data: newTx, error: insertError } = await supabase
      .from("mpesa_transactions")
      .insert({
        mpesa_receipt_number: code,
        amount: numericAmount,
        phone_number: phone_number.trim(),
        customer_name: customer_name?.trim() || "Manual Payment",
        status: "success",
        result_code: 0,
        result_desc: "Manually registered by manager/admin",
        transaction_date: timestamp,
        created_at: timestamp,
        updated_at: timestamp,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    // Write audit log
    writeAuditLog({
      actor: actor || null,
      action: "mpesa_manual_code_created",
      entityType: "mpesa_transaction",
      entityId: newTx.id,
      details: {
        mpesa_receipt_number: code,
        amount: numericAmount,
        phone_number: phone_number.trim(),
        customer_name: customer_name || "Manual Payment"
      }
    }).catch(err => console.warn("Audit log failed:", err));

    return NextResponse.json({ success: true, transaction: newTx });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create transaction" },
      { status: 500 }
    );
  }
}

// DELETE: Allow deleting a transaction record (only if not linked to any sale)
export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const actorStr = url.searchParams.get("actor");
    const actor = actorStr ? JSON.parse(actorStr) : null;

    if (!id) {
      return NextResponse.json({ error: "Missing transaction ID." }, { status: 400 });
    }

    const supabase = getAdminClient();

    // Check if transaction is linked
    const { data: tx, error: fetchErr } = await supabase
      .from("mpesa_transactions")
      .select("id, sale_id, mpesa_receipt_number, amount")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !tx) {
      return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
    }

    if (tx.sale_id) {
      return NextResponse.json({ error: "Cannot delete a transaction that has already been linked to a sale." }, { status: 400 });
    }

    // Delete record
    const { error: deleteErr } = await supabase
      .from("mpesa_transactions")
      .delete()
      .eq("id", id);

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 400 });
    }

    // Log action
    writeAuditLog({
      actor,
      action: "mpesa_manual_code_deleted",
      entityType: "mpesa_transaction",
      entityId: id,
      details: {
        id,
        mpesa_receipt_number: tx.mpesa_receipt_number,
        amount: tx.amount
      }
    }).catch(err => console.warn("Audit log failed:", err));

    return NextResponse.json({ success: true, message: "Transaction deleted successfully." });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete transaction" },
      { status: 500 }
    );
  }
}

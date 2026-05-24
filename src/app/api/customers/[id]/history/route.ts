import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/server-auth";

// GET /api/customers/[id]/history - Get point transaction history for a customer
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const customerId = params.id;
    const supabase = getAdminClient();

    // Fetch point transactions and join with the sales (receipt_number)
    const { data: history, error } = await supabase
      .from("point_transactions")
      .select(`
        id,
        customer_id,
        sale_id,
        type,
        points,
        balance_after,
        reference,
        created_at,
        sales (
          receipt_number
        )
      `)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Format the sales data nested structure so it matches PointTransaction interface
    const formattedHistory = (history || []).map((pt: any) => ({
      id: pt.id,
      customer_id: pt.customer_id,
      sale_id: pt.sale_id,
      type: pt.type,
      points: pt.points,
      balance_after: pt.balance_after,
      reference: pt.reference,
      created_at: pt.created_at,
      sale: pt.sales ? { receipt_number: pt.sales.receipt_number } : undefined
    }));

    return NextResponse.json({ history: formattedHistory });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch points ledger." },
      { status: 500 }
    );
  }
}

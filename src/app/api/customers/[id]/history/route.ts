export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/server-auth";

// GET /api/customers/[id]/history - Get point transaction history for a customer
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: customerId } = await params;
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
      console.error('API Error:', error);
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
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
      { error: "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}

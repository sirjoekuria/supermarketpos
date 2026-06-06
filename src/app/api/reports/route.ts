import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/server-auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate"); // ISO date string, e.g. "2026-06-01"
    const endDate = searchParams.get("endDate");     // ISO date string, e.g. "2026-06-07"
    const branchId = searchParams.get("branchId");

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "startDate and endDate are required." }, { status: 400 });
    }

    const supabase = getAdminClient();

    // Build date range: startDate at 00:00:00 to endDate at 23:59:59 UTC
    const from = `${startDate}T00:00:00.000Z`;
    const to   = `${endDate}T23:59:59.999Z`;

    // ── Fetch all sales in range ──────────────────────────────────────────────
    let salesQuery = supabase
      .from("sales")
      .select(`
        id, receipt_number, subtotal, tax_amount, discount_amount,
        total, total_profit, payment_method, payment_status,
        created_at, branch_id,
        cashier:app_users!sales_cashier_id_fkey(id, full_name),
        customer:customers(id, name),
        sale_items(
          id, product_id, quantity, unit_price, cost_price,
          subtotal, tax_amount, discount_amount, total, profit,
          product:products(id, name, category_id, categories(name))
        )
      `)
      .gte("created_at", from)
      .lte("created_at", to)
      .eq("payment_status", "completed")
      .order("created_at", { ascending: true });

    if (branchId) {
      salesQuery = salesQuery.eq("branch_id", branchId);
    }

    const { data: sales, error: salesError } = await salesQuery;

    if (salesError) {
      // Fallback: join may fail if FK name differs — retry with simpler select
      const { data: salesSimple, error: salesSimpleError } = await supabase
        .from("sales")
        .select(`
          id, receipt_number, subtotal, tax_amount, discount_amount,
          total, total_profit, payment_method, payment_status,
          created_at, branch_id,
          sale_items(
            id, product_id, quantity, unit_price, cost_price,
            subtotal, tax_amount, discount_amount, total, profit,
            product:products(id, name)
          )
        `)
        .gte("created_at", from)
        .lte("created_at", to)
        .eq("payment_status", "completed")
        .order("created_at", { ascending: true });

      if (salesSimpleError) {
        return NextResponse.json({ error: salesSimpleError.message }, { status: 400 });
      }

      return buildResponse(salesSimple ?? []);
    }

    return buildResponse(sales ?? []);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch reports." },
      { status: 500 }
    );
  }
}

function buildResponse(sales: any[]) {
  // ── Aggregate top-level metrics ───────────────────────────────────────────
  const totalSales       = sales.reduce((s, r) => s + Number(r.total || 0), 0);
  const totalProfit      = sales.reduce((s, r) => s + Number(r.total_profit || 0), 0);
  const totalTransactions = sales.length;
  const totalItems       = sales.reduce(
    (s, r) => s + (r.sale_items ?? []).reduce((a: number, i: any) => a + Number(i.quantity || 0), 0),
    0
  );
  const avgTicket        = totalTransactions > 0 ? totalSales / totalTransactions : 0;
  const profitMargin     = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

  // ── Daily trend ───────────────────────────────────────────────────────────
  const dailyMap: Record<string, { date: string; sales: number; profit: number; transactions: number; items: number }> = {};
  for (const sale of sales) {
    const day = (sale.created_at as string).slice(0, 10); // "YYYY-MM-DD"
    if (!dailyMap[day]) {
      dailyMap[day] = { date: day, sales: 0, profit: 0, transactions: 0, items: 0 };
    }
    dailyMap[day].sales        += Number(sale.total || 0);
    dailyMap[day].profit       += Number(sale.total_profit || 0);
    dailyMap[day].transactions += 1;
    dailyMap[day].items        += (sale.sale_items ?? []).reduce((a: number, i: any) => a + Number(i.quantity || 0), 0);
  }
  const dailyTrend = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  // ── Payment method breakdown ──────────────────────────────────────────────
  const paymentMap: Record<string, { method: string; amount: number; count: number }> = {};
  for (const sale of sales) {
    const m = sale.payment_method || "unknown";
    if (!paymentMap[m]) paymentMap[m] = { method: m, amount: 0, count: 0 };
    paymentMap[m].amount += Number(sale.total || 0);
    paymentMap[m].count  += 1;
  }
  const paymentBreakdown = Object.values(paymentMap);

  // ── Product performance ───────────────────────────────────────────────────
  const productMap: Record<string, {
    product_id: string; name: string; category: string;
    units_sold: number; revenue: number; cost: number; profit: number;
  }> = {};
  for (const sale of sales) {
    for (const item of (sale.sale_items ?? [])) {
      const pid  = item.product_id;
      const name = item.product?.name ?? "Unknown";
      const cat  = item.product?.categories?.name ?? item.product?.category_id ?? "—";
      if (!productMap[pid]) {
        productMap[pid] = { product_id: pid, name, category: cat, units_sold: 0, revenue: 0, cost: 0, profit: 0 };
      }
      productMap[pid].units_sold += Number(item.quantity || 0);
      productMap[pid].revenue    += Number(item.total    || 0);
      productMap[pid].cost       += Number(item.cost_price || 0) * Number(item.quantity || 0);
      productMap[pid].profit     += Number(item.profit   || 0);
    }
  }
  const productPerformance = Object.values(productMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 20); // top 20

  // ── Cashier performance ───────────────────────────────────────────────────
  const cashierMap: Record<string, {
    cashier_id: string; name: string;
    sales: number; profit: number; transactions: number; items: number;
  }> = {};
  for (const sale of sales) {
    const cid  = sale.cashier?.id ?? sale.cashier_id ?? "unknown";
    const name = sale.cashier?.full_name ?? "Unknown Cashier";
    if (!cashierMap[cid]) {
      cashierMap[cid] = { cashier_id: cid, name, sales: 0, profit: 0, transactions: 0, items: 0 };
    }
    cashierMap[cid].sales        += Number(sale.total || 0);
    cashierMap[cid].profit       += Number(sale.total_profit || 0);
    cashierMap[cid].transactions += 1;
    cashierMap[cid].items        += (sale.sale_items ?? []).reduce((a: number, i: any) => a + Number(i.quantity || 0), 0);
  }
  const cashierPerformance = Object.values(cashierMap).sort((a, b) => b.sales - a.sales);

  return NextResponse.json({
    metrics: {
      totalSales,
      totalProfit,
      totalTransactions,
      totalItems,
      avgTicket,
      profitMargin,
    },
    dailyTrend,
    paymentBreakdown,
    productPerformance,
    cashierPerformance,
  });
}

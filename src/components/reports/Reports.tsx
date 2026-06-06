"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart3, TrendingUp, DollarSign, ShoppingBag, Users, Calendar,
  Download, Activity, Loader2, AlertCircle, TrendingDown, Package,
  RefreshCw, ChevronDown,
} from "lucide-react";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

// ── Date range helpers ────────────────────────────────────────────────────────
function toLocalISO(d: Date) {
  return d.toLocaleDateString("en-CA"); // "YYYY-MM-DD" in local time
}

function getPreset(preset: string): { startDate: string; endDate: string; label: string } {
  const today = new Date();
  const todayISO = toLocalISO(today);

  if (preset === "today") {
    return { startDate: todayISO, endDate: todayISO, label: "Today" };
  }
  if (preset === "yesterday") {
    const y = new Date(today); y.setDate(today.getDate() - 1);
    const yISO = toLocalISO(y);
    return { startDate: yISO, endDate: yISO, label: "Yesterday" };
  }
  if (preset === "week") {
    const s = new Date(today); s.setDate(today.getDate() - 6);
    return { startDate: toLocalISO(s), endDate: todayISO, label: "Last 7 Days" };
  }
  if (preset === "month") {
    const s = new Date(today.getFullYear(), today.getMonth(), 1);
    return { startDate: toLocalISO(s), endDate: todayISO, label: "This Month" };
  }
  if (preset === "quarter") {
    const s = new Date(today); s.setDate(today.getDate() - 89);
    return { startDate: toLocalISO(s), endDate: todayISO, label: "Last 90 Days" };
  }
  // default: today
  return { startDate: todayISO, endDate: todayISO, label: "Today" };
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface Metrics {
  totalSales: number;
  totalProfit: number;
  totalTransactions: number;
  totalItems: number;
  avgTicket: number;
  profitMargin: number;
}
interface DailyTrend {
  date: string;
  sales: number;
  profit: number;
  transactions: number;
  items: number;
}
interface ProductRow {
  product_id: string;
  name: string;
  category: string;
  units_sold: number;
  revenue: number;
  cost: number;
  profit: number;
}
interface CashierRow {
  cashier_id: string;
  name: string;
  sales: number;
  profit: number;
  transactions: number;
  items: number;
}
interface PaymentRow {
  method: string;
  amount: number;
  count: number;
}
interface ReportData {
  metrics: Metrics;
  dailyTrend: DailyTrend[];
  paymentBreakdown: PaymentRow[];
  productPerformance: ProductRow[];
  cashierPerformance: CashierRow[];
}

// ── Metric Card ───────────────────────────────────────────────────────────────
function MetricCard({
  icon: Icon, label, value, sub, color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-pos-card rounded-2xl p-5 border border-gray-200 dark:border-pos-border flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", color)}>
          <Icon className="w-5 h-5" />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Reports() {
  const [preset, setPreset]           = useState("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd]     = useState("");
  const [showCustom, setShowCustom]   = useState(false);
  const [reportType, setReportType]   = useState("sales");

  const [data, setData]         = useState<ReportData | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  // Compute active date range
  const { startDate, endDate, label } = showCustom && customStart && customEnd
    ? { startDate: customStart, endDate: customEnd, label: `${customStart} → ${customEnd}` }
    : getPreset(preset);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/reports?startDate=${startDate}&endDate=${endDate}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load report");
      setData(json);
    } catch (e: any) {
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleExportPDF = async () => {
    try {
      const element = document.getElementById("report-content");
      if (!element) return;
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`pos-report-${formatDate(new Date().toISOString())}.pdf`);
    } catch (err) {
      console.error("PDF export failed", err);
    }
  };

  const m = data?.metrics;
  const dailyTrend        = data?.dailyTrend        ?? [];
  const productPerformance = data?.productPerformance ?? [];
  const cashierPerformance = data?.cashierPerformance ?? [];
  const paymentBreakdown   = data?.paymentBreakdown   ?? [];

  const maxBarValue = Math.max(...dailyTrend.map(d => d.sales), 1);
  const maxProfitValue = Math.max(...dailyTrend.map(d => d.profit), 1);

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="hidden lg:flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports &amp; Analytics</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Real-time insights · {label}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchReport}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-sm transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Refresh
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      {/* Date Range Picker */}
      <div className="flex flex-wrap items-center gap-2">
        {["today", "yesterday", "week", "month", "quarter"].map((p) => (
          <button
            key={p}
            onClick={() => { setShowCustom(false); setPreset(p); }}
            className={cn(
              "px-3 py-2 rounded-xl text-sm font-medium transition-all border",
              !showCustom && preset === p
                ? "bg-primary-600 border-primary-600 text-white shadow-md shadow-primary-600/20"
                : "bg-white dark:bg-pos-card border-gray-200 dark:border-pos-border text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
            )}
          >
            {getPreset(p).label}
          </button>
        ))}
        {/* Custom range */}
        <button
          onClick={() => setShowCustom(prev => !prev)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all border",
            showCustom
              ? "bg-primary-600 border-primary-600 text-white"
              : "bg-white dark:bg-pos-card border-gray-200 dark:border-pos-border text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
          )}
        >
          <Calendar className="w-4 h-4" />
          Custom
          <ChevronDown className={cn("w-3 h-3 transition-transform", showCustom && "rotate-180")} />
        </button>
        {showCustom && (
          <div className="flex items-center gap-2 bg-white dark:bg-pos-card border border-gray-200 dark:border-pos-border rounded-xl px-3 py-2">
            <input
              type="date"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              className="text-sm bg-transparent text-gray-700 dark:text-gray-300 focus:outline-none"
            />
            <span className="text-gray-400">→</span>
            <input
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              className="text-sm bg-transparent text-gray-700 dark:text-gray-300 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      )}

      {/* Content */}
      {!loading && data && (
        <>
          {/* Report Type Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { id: "sales",    label: "Sales Report",        icon: BarChart3  },
              { id: "products", label: "Product Performance", icon: ShoppingBag},
              { id: "cashiers", label: "Cashier Performance", icon: Users      },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setReportType(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
                  reportType === tab.id
                    ? "bg-primary-600 text-white shadow-lg shadow-primary-600/20"
                    : "bg-white dark:bg-pos-card border border-gray-200 dark:border-pos-border text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                )}
              >
                <tab.icon className="w-4 h-4" />{tab.label}
              </button>
            ))}
          </div>

          <div id="report-content" className="space-y-4 sm:space-y-6">

            {/* ── Metric Cards ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              <MetricCard
                icon={DollarSign}
                label="Total Sales"
                value={formatCurrency(m?.totalSales ?? 0)}
                color="bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
              />
              <MetricCard
                icon={TrendingUp}
                label="Total Profit"
                value={formatCurrency(m?.totalProfit ?? 0)}
                sub={`${(m?.profitMargin ?? 0).toFixed(1)}% margin`}
                color="bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400"
              />
              <MetricCard
                icon={Activity}
                label="Transactions"
                value={formatNumber(m?.totalTransactions ?? 0)}
                color="bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
              />
              <MetricCard
                icon={ShoppingBag}
                label="Items Sold"
                value={formatNumber(m?.totalItems ?? 0)}
                color="bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400"
              />
              <MetricCard
                icon={BarChart3}
                label="Avg. Ticket"
                value={formatCurrency(m?.avgTicket ?? 0)}
                color="bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400"
              />
              <MetricCard
                icon={Package}
                label="Profit Margin"
                value={`${(m?.profitMargin ?? 0).toFixed(1)}%`}
                color="bg-teal-100 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400"
              />
            </div>

            {/* ── Sales Report ─────────────────────────────────────────────── */}
            {reportType === "sales" && (
              <>
                {/* Daily Trend Chart */}
                <div className="bg-white dark:bg-pos-card rounded-2xl border border-gray-200 dark:border-pos-border p-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Daily Sales &amp; Profit Trend</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{label}</p>
                  {dailyTrend.length === 0 ? (
                    <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
                      No sales data for this period.
                    </div>
                  ) : (
                    <div className="h-64 flex items-end gap-2">
                      {dailyTrend.map((d, i) => {
                        const salesH  = (d.sales  / maxBarValue)   * 100;
                        const profitH = (d.profit / maxBarValue)   * 100;
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                            <div className="w-full flex items-end gap-0.5 relative" style={{ height: "220px" }}>
                              {/* Sales bar */}
                              <div
                                className="flex-1 bg-primary-500/80 rounded-t-lg transition-all group-hover:bg-primary-500 relative"
                                style={{ height: `${salesH}%` }}
                              >
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs px-2 py-1 rounded-lg pointer-events-none">
                                  Sales: {formatCurrency(d.sales)}
                                </div>
                              </div>
                              {/* Profit bar */}
                              <div
                                className="flex-1 bg-green-400/80 rounded-t-lg transition-all group-hover:bg-green-500 relative"
                                style={{ height: `${profitH}%` }}
                              >
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs px-2 py-1 rounded-lg pointer-events-none">
                                  Profit: {formatCurrency(d.profit)}
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] text-gray-400 whitespace-nowrap">
                              {new Date(d.date + "T12:00:00").toLocaleDateString("en-KE", { month: "short", day: "numeric" })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary-500 inline-block" />Sales</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-400 inline-block" />Profit</span>
                  </div>
                </div>

                {/* Payment Methods + Daily Table */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Payment Breakdown */}
                  <div className="bg-white dark:bg-pos-card rounded-2xl border border-gray-200 dark:border-pos-border p-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Payment Methods</h3>
                    {paymentBreakdown.length === 0 ? (
                      <p className="text-sm text-gray-400">No data.</p>
                    ) : (
                      <div className="space-y-4">
                        {paymentBreakdown.map(pm => {
                          const pct = m?.totalSales ? (pm.amount / m.totalSales) * 100 : 0;
                          const colors: Record<string, string> = {
                            cash: "bg-green-500", mpesa: "bg-emerald-500", card: "bg-blue-500", split: "bg-purple-500"
                          };
                          return (
                            <div key={pm.method}>
                              <div className="flex justify-between text-sm mb-1.5">
                                <span className="text-gray-700 dark:text-gray-300 font-medium capitalize">{pm.method}</span>
                                <span className="text-gray-900 dark:text-white font-bold">{formatCurrency(pm.amount)}</span>
                              </div>
                              <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className={cn("h-full rounded-full transition-all", colors[pm.method] || "bg-primary-500")}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <p className="text-xs text-gray-400 mt-1">{pm.count} transactions · {pct.toFixed(1)}%</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Daily Summary Table */}
                  <div className="bg-white dark:bg-pos-card rounded-2xl border border-gray-200 dark:border-pos-border p-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Daily Summary</h3>
                    {dailyTrend.length === 0 ? (
                      <p className="text-sm text-gray-400">No data.</p>
                    ) : (
                      <div className="overflow-y-auto max-h-64">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100 dark:border-pos-border text-left text-xs text-gray-500 dark:text-gray-400">
                              <th className="pb-2">Date</th>
                              <th className="pb-2 text-right">Sales</th>
                              <th className="pb-2 text-right text-green-600 dark:text-green-400">Profit</th>
                              <th className="pb-2 text-right">Txns</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50 dark:divide-pos-border">
                            {dailyTrend.map(d => (
                              <tr key={d.date} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                <td className="py-2 font-medium text-gray-700 dark:text-gray-300">
                                  {new Date(d.date + "T12:00:00").toLocaleDateString("en-KE", { weekday: "short", month: "short", day: "numeric" })}
                                </td>
                                <td className="py-2 text-right font-bold text-gray-900 dark:text-white">{formatCurrency(d.sales)}</td>
                                <td className="py-2 text-right font-semibold text-green-600 dark:text-green-400">{formatCurrency(d.profit)}</td>
                                <td className="py-2 text-right text-gray-500">{d.transactions}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ── Product Performance ──────────────────────────────────────── */}
            {reportType === "products" && (
              <div className="bg-white dark:bg-pos-card rounded-2xl border border-gray-200 dark:border-pos-border p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Top Selling Products</h3>
                {productPerformance.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-sm">No product sales data for this period.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-pos-border text-left">
                          <th className="pb-3 text-xs font-semibold text-gray-500 dark:text-gray-400">#</th>
                          <th className="pb-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Product</th>
                          <th className="pb-3 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">Units Sold</th>
                          <th className="pb-3 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">Revenue</th>
                          <th className="pb-3 text-xs font-semibold text-green-600 dark:text-green-400 text-right">Profit</th>
                          <th className="pb-3 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">Margin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-pos-border">
                        {productPerformance.map((p, i) => {
                          const margin = p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0;
                          return (
                            <tr key={p.product_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                              <td className="py-3 text-sm text-gray-400">{i + 1}</td>
                              <td className="py-3">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{p.name}</p>
                                <p className="text-xs text-gray-400">{p.category}</p>
                              </td>
                              <td className="py-3 text-sm text-right text-gray-700 dark:text-gray-300 font-medium">{formatNumber(p.units_sold)}</td>
                              <td className="py-3 text-sm text-right font-bold text-primary-600 dark:text-primary-400">{formatCurrency(p.revenue)}</td>
                              <td className="py-3 text-sm text-right font-bold text-green-600 dark:text-green-400">{formatCurrency(p.profit)}</td>
                              <td className="py-3 text-right">
                                <span className={cn(
                                  "inline-block text-xs font-semibold px-2 py-0.5 rounded-full",
                                  margin >= 20 ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" :
                                  margin >= 10 ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400" :
                                  "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                                )}>
                                  {margin.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── Cashier Performance ──────────────────────────────────────── */}
            {reportType === "cashiers" && (
              <div className="space-y-4">
                {cashierPerformance.length === 0 ? (
                  <div className="bg-white dark:bg-pos-card rounded-2xl border border-gray-200 dark:border-pos-border p-10 text-center text-gray-400 text-sm">
                    No cashier data for this period.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {cashierPerformance.map((c, i) => {
                      const avgTicket = c.transactions > 0 ? c.sales / c.transactions : 0;
                      const profitMargin = c.sales > 0 ? (c.profit / c.sales) * 100 : 0;
                      return (
                        <div key={c.cashier_id} className="bg-white dark:bg-pos-card rounded-2xl border border-gray-200 dark:border-pos-border p-5">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-xl">
                              {c.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900 dark:text-white">{c.name}</h4>
                              <p className="text-xs text-gray-400">#{i + 1} by revenue</p>
                            </div>
                          </div>
                          <div className="space-y-2.5 text-sm">
                            {[
                              { label: "Total Revenue",    value: formatCurrency(c.sales),   bold: true  },
                              { label: "Total Profit",     value: formatCurrency(c.profit),  green: true },
                              { label: "Transactions",     value: formatNumber(c.transactions)            },
                              { label: "Items Scanned",    value: formatNumber(c.items)                   },
                              { label: "Avg. Ticket",      value: formatCurrency(avgTicket),  bold: true  },
                              { label: "Profit Margin",    value: `${profitMargin.toFixed(1)}%`, green: true },
                            ].map(row => (
                              <div key={row.label} className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-pos-border last:border-0">
                                <span className="text-gray-500 dark:text-gray-400">{row.label}</span>
                                <span className={cn(
                                  "font-medium",
                                  row.green ? "text-green-600 dark:text-green-400" :
                                  row.bold  ? "text-gray-900 dark:text-white font-bold" :
                                  "text-gray-700 dark:text-gray-300"
                                )}>
                                  {row.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Empty state */}
      {!loading && !data && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-4">
          <BarChart3 className="w-12 h-12 opacity-30" />
          <p className="text-sm">Select a date range to load reports.</p>
        </div>
      )}
    </div>
  );
}

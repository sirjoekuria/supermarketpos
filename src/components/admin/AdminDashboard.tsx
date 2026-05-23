"use client";

import { useState } from "react";
import {
  TrendingUp, DollarSign, ShoppingBag, Package, AlertTriangle,
  BarChart3, Download, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

const DAILY_STATS = {
  totalSales: 48750.0,
  totalTransactions: 142,
  totalItems: 387,
  averageTicket: 343.31,
  mpesaTotal: 32100.0,
  cashTotal: 16650.0,
  comparedToYesterday: 12.5,
};

const RECENT_SALES = [
  { id: "1", receipt: "RCP-001", items: 5, total: 1250.0, method: "mpesa", time: "2 min ago", cashier: "John Doe" },
  { id: "2", receipt: "RCP-002", items: 3, total: 780.0, method: "cash", time: "5 min ago", cashier: "Jane Smith" },
  { id: "3", receipt: "RCP-003", items: 8, total: 2340.0, method: "mpesa", time: "12 min ago", cashier: "John Doe" },
  { id: "4", receipt: "RCP-004", items: 2, total: 450.0, method: "cash", time: "18 min ago", cashier: "Jane Smith" },
  { id: "5", receipt: "RCP-005", items: 6, total: 1890.0, method: "mpesa", time: "25 min ago", cashier: "John Doe" },
];

const LOW_STOCK_ITEMS = [
  { id: "1", name: "Fresh Milk 500ml", stock: 3, minLevel: 10 },
  { id: "2", name: "White Bread 400g", stock: 2, minLevel: 5 },
  { id: "3", name: "Eggs (Tray)", stock: 1, minLevel: 5 },
];

const TOP_PRODUCTS = [
  { id: "1", name: "Sugar 1kg", sales: 45, revenue: 7200.0 },
  { id: "2", name: "Cooking Oil 1L", sales: 38, revenue: 10640.0 },
  { id: "3", name: "Rice 2kg", sales: 32, revenue: 10240.0 },
  { id: "4", name: "Wheat Flour 2kg", sales: 28, revenue: 5880.0 },
  { id: "5", name: "Fresh Milk 500ml", sales: 25, revenue: 1625.0 },
];

const HOURLY_SALES = [
  { hour: "8AM", sales: 3200 },
  { hour: "9AM", sales: 5400 },
  { hour: "10AM", sales: 7800 },
  { hour: "11AM", sales: 9200 },
  { hour: "12PM", sales: 11500 },
  { hour: "1PM", sales: 8900 },
  { hour: "2PM", sales: 6700 },
  { hour: "3PM", sales: 4500 },
];

interface StatCardProps {
  title: string;
  value: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
  trend?: number;
  trendUp?: boolean;
  color: string;
}

function StatCard({ title, value, icon: Icon, trend, trendUp, color }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-pos-card rounded-2xl p-6 border border-gray-200 dark:border-pos-border">
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", color)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend !== undefined && (
          <div className={cn("flex items-center gap-1 text-sm font-medium", trendUp ? "text-green-500" : "text-red-500")}>
            {trendUp ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            {trend}%
          </div>
        )}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const [dateRange, setDateRange] = useState("today");
  const maxSales = Math.max(...HOURLY_SALES.map((d) => d.sales));

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Overview of your supermarket performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-pos-card border border-gray-200 dark:border-pos-border rounded-xl text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors">
            <Download className="w-4 h-4" />Export
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Sales" value={formatCurrency(DAILY_STATS.totalSales)} icon={DollarSign} trend={DAILY_STATS.comparedToYesterday} trendUp={true} color="bg-primary-500" />
        <StatCard title="Transactions" value={formatNumber(DAILY_STATS.totalTransactions)} icon={ShoppingBag} trend={8.2} trendUp={true} color="bg-green-500" />
        <StatCard title="Items Sold" value={formatNumber(DAILY_STATS.totalItems)} icon={Package} trend={3.1} trendUp={false} color="bg-orange-500" />
        <StatCard title="Avg. Ticket" value={formatCurrency(DAILY_STATS.averageTicket)} icon={BarChart3} trend={5.7} trendUp={true} color="bg-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hourly Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-pos-card rounded-2xl border border-gray-200 dark:border-pos-border p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Sales Overview</h3>
          <div className="h-64 flex items-end gap-2">
            {HOURLY_SALES.map((data, idx) => {
              const height = (data.sales / maxSales) * 100;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full bg-primary-500/20 dark:bg-primary-500/30 rounded-t-lg relative group cursor-pointer"
                    style={{ height: `${height}%` }}
                  >
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-primary-500 rounded-t-lg transition-all group-hover:bg-primary-400"
                      style={{ height: "100%" }}
                    />
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {formatCurrency(data.sales)}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{data.hour}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment Methods + Low Stock */}
        <div className="bg-white dark:bg-pos-card rounded-2xl border border-gray-200 dark:border-pos-border p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Payment Methods</h3>
          <div className="space-y-4">
            {[
              { label: "M-Pesa", amount: DAILY_STATS.mpesaTotal, color: "bg-green-500" },
              { label: "Cash", amount: DAILY_STATS.cashTotal, color: "bg-primary-500" },
            ].map(({ label, amount, color }) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-300">{label}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(amount)}</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", color)}
                    style={{ width: `${(amount / DAILY_STATS.totalSales) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {((amount / DAILY_STATS.totalSales) * 100).toFixed(1)}% of total
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              Low Stock Alerts
            </h4>
            <div className="space-y-2">
              {LOW_STOCK_ITEMS.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">
                      Only {item.stock} left (min: {item.minLevel})
                    </p>
                  </div>
                  <button className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-medium rounded-lg transition-colors">
                    Restock
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="bg-white dark:bg-pos-card rounded-2xl border border-gray-200 dark:border-pos-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Sales</h3>
            <button className="text-sm text-primary-600 dark:text-primary-400 hover:underline">View All</button>
          </div>
          <div className="space-y-3">
            {RECENT_SALES.map((sale) => (
              <div
                key={sale.id}
                className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", sale.method === "mpesa" ? "bg-green-100 dark:bg-green-900/20" : "bg-primary-100 dark:bg-primary-900/20")}>
                    <span className={cn("text-xs font-bold", sale.method === "mpesa" ? "text-green-600 dark:text-green-400" : "text-primary-600 dark:text-primary-400")}>
                      {sale.method === "mpesa" ? "M" : "C"}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{sale.receipt}</p>
                    <p className="text-xs text-gray-500">{sale.items} items &mdash; {sale.cashier}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(sale.total)}</p>
                  <p className="text-xs text-gray-400">{sale.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white dark:bg-pos-card rounded-2xl border border-gray-200 dark:border-pos-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Top Products</h3>
            <button className="text-sm text-primary-600 dark:text-primary-400 hover:underline">View All</button>
          </div>
          <div className="space-y-4">
            {TOP_PRODUCTS.map((product, idx) => (
              <div key={product.id} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-500 dark:text-gray-400">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{product.name}</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(product.revenue)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full"
                        style={{ width: `${(product.sales / TOP_PRODUCTS[0].sales) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-12 text-right">{product.sales} sold</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

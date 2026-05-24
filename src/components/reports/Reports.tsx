"use client";

import { useState } from "react";
import {
  BarChart3, TrendingUp, DollarSign, ShoppingBag, Users, Calendar,
  Download, Filter, ChevronDown, FileText, PieChart, Activity
} from "lucide-react";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const SALES_DATA = [
  { date: "2026-04-17", sales: 42500, transactions: 128, items: 342 },
  { date: "2026-04-18", sales: 38900, transactions: 115, items: 298 },
  { date: "2026-04-19", sales: 52100, transactions: 156, items: 412 },
  { date: "2026-04-20", sales: 46700, transactions: 138, items: 367 },
  { date: "2026-04-21", sales: 49300, transactions: 145, items: 389 },
  { date: "2026-04-22", sales: 44500, transactions: 132, items: 356 },
  { date: "2026-04-23", sales: 48750, transactions: 142, items: 387 },
];

const CASHIER_PERFORMANCE = [
  { name: "John Doe", sales: 125000, transactions: 380, avgTicket: 328.95, items: 950 },
  { name: "Jane Smith", sales: 98000, transactions: 310, avgTicket: 316.13, items: 780 },
  { name: "Mike Johnson", sales: 87000, transactions: 275, avgTicket: 316.36, items: 690 },
];

const CATEGORY_SALES = [
  { name: "Groceries", amount: 185000, percentage: 45 },
  { name: "Dairy", amount: 92000, percentage: 22 },
  { name: "Bakery", amount: 58000, percentage: 14 },
  { name: "Beverages", amount: 45000, percentage: 11 },
  { name: "Household", amount: 33000, percentage: 8 },
];

export default function Reports() {
  const [dateRange, setDateRange] = useState("week");
  const [reportType, setReportType] = useState("sales");

  const totalSales = SALES_DATA.reduce((sum, d) => sum + d.sales, 0);
  const totalTransactions = SALES_DATA.reduce((sum, d) => sum + d.transactions, 0);
  const totalItems = SALES_DATA.reduce((sum, d) => sum + d.items, 0);
  const avgTicket = totalSales / totalTransactions;

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
    } catch (error) {
      console.error("Failed to generate PDF", error);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto h-full">
      <div className="hidden lg:flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Detailed insights into your business performance</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="px-4 py-2 bg-white dark:bg-pos-card border border-gray-200 dark:border-pos-border rounded-xl text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors">
            <Download className="w-4 h-4" />Export PDF
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: "sales", label: "Sales Report", icon: BarChart3 },
          { id: "products", label: "Product Performance", icon: ShoppingBag },
          { id: "cashiers", label: "Cashier Performance", icon: Users },
          { id: "inventory", label: "Inventory Report", icon: PieChart },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setReportType(tab.id)} className={cn("flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap", reportType === tab.id ? "bg-primary-600 text-white shadow-lg shadow-primary-600/20" : "bg-white dark:bg-pos-card border border-gray-200 dark:border-pos-border text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800")}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      <div id="report-content" className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-pos-card rounded-2xl p-6 border border-gray-200 dark:border-pos-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Sales</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalSales)}</p>
            <p className="text-xs text-green-500 mt-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" />+12.5% vs last period</p>
          </div>
          <div className="bg-white dark:bg-pos-card rounded-2xl p-6 border border-gray-200 dark:border-pos-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Transactions</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(totalTransactions)}</p>
            <p className="text-xs text-green-500 mt-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" />+8.2% vs last period</p>
          </div>
          <div className="bg-white dark:bg-pos-card rounded-2xl p-6 border border-gray-200 dark:border-pos-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Items Sold</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(totalItems)}</p>
            <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><TrendingUp className="w-3 h-3 rotate-180" />-3.1% vs last period</p>
          </div>
          <div className="bg-white dark:bg-pos-card rounded-2xl p-6 border border-gray-200 dark:border-pos-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Ticket</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(avgTicket)}</p>
            <p className="text-xs text-green-500 mt-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" />+5.7% vs last period</p>
          </div>
        </div>

        {reportType === "sales" && (
          <>
            <div className="bg-white dark:bg-pos-card rounded-2xl border border-gray-200 dark:border-pos-border p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Daily Sales Trend</h3>
              <div className="h-80 flex items-end gap-3">
                {SALES_DATA.map((data, idx) => {
                  const maxSales = Math.max(...SALES_DATA.map((d) => d.sales));
                  const height = (data.sales / maxSales) * 100;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full bg-primary-500/10 dark:bg-primary-500/20 rounded-t-xl relative group cursor-pointer" style={{ height: `${height}%` }}>
                        <div className="absolute bottom-0 left-0 right-0 bg-primary-500 rounded-t-xl transition-all group-hover:bg-primary-400" style={{ height: "100%" }} />
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-medium">{formatCurrency(data.sales)}</div>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(data.date).toLocaleDateString("en-KE", { weekday: "short" })}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-white dark:bg-pos-card rounded-2xl border border-gray-200 dark:border-pos-border p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Sales by Category</h3>
                <div className="space-y-4">
                  {CATEGORY_SALES.map((cat) => (
                    <div key={cat.name}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-700 dark:text-gray-300 font-medium">{cat.name}</span>
                        <span className="text-gray-900 dark:text-white font-bold">{formatCurrency(cat.amount)}</span>
                      </div>
                      <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${cat.percentage}%` }} />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{cat.percentage}% of total sales</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-pos-card rounded-2xl border border-gray-200 dark:border-pos-border p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Cashier Performance</h3>
                <div className="space-y-4">
                  {CASHIER_PERFORMANCE.map((cashier) => (
                    <div key={cashier.name} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-pos-border">
                      <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold">
                        {cashier.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">{cashier.name}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{cashier.transactions} transactions</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(cashier.sales)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(cashier.avgTicket)} avg</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {reportType === "products" && (
          <div className="bg-white dark:bg-pos-card rounded-2xl border border-gray-200 dark:border-pos-border p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Top Selling Products</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-pos-border text-left">
                    <th className="pb-3 text-sm font-semibold text-gray-500 dark:text-gray-400">Product Name</th>
                    <th className="pb-3 text-sm font-semibold text-gray-500 dark:text-gray-400">Category</th>
                    <th className="pb-3 text-sm font-semibold text-gray-500 dark:text-gray-400 text-right">Items Sold</th>
                    <th className="pb-3 text-sm font-semibold text-gray-500 dark:text-gray-400 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-pos-border">
                  {[
                    { name: "Premium Milk 1L", cat: "Dairy", sold: 1450, rev: 145000 },
                    { name: "Whole Wheat Bread", cat: "Bakery", sold: 1200, rev: 96000 },
                    { name: "Local Rice 2kg", cat: "Groceries", sold: 850, rev: 255000 },
                    { name: "Cooking Oil 1L", cat: "Groceries", sold: 720, rev: 216000 },
                    { name: "Fresh Eggs (Tray)", cat: "Dairy", sold: 650, rev: 260000 },
                  ].map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-4 text-sm font-medium text-gray-900 dark:text-white">{p.name}</td>
                      <td className="py-4 text-sm text-gray-500 dark:text-gray-400">{p.cat}</td>
                      <td className="py-4 text-sm text-gray-900 dark:text-white text-right font-medium">{formatNumber(p.sold)}</td>
                      <td className="py-4 text-sm text-gray-900 dark:text-white text-right font-bold text-primary-600 dark:text-primary-400">{formatCurrency(p.rev)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {reportType === "cashiers" && (
          <div className="bg-white dark:bg-pos-card rounded-2xl border border-gray-200 dark:border-pos-border p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Cashier Performance Detailed</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {CASHIER_PERFORMANCE.map((cashier) => (
                <div key={cashier.name} className="p-5 rounded-2xl border border-gray-200 dark:border-pos-border bg-gray-50 dark:bg-gray-800/30">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-xl">
                      {cashier.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white">{cashier.name}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Cashier</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-pos-border">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</span>
                      <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(cashier.sales)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-pos-border">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Transactions</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatNumber(cashier.transactions)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-pos-border">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Items Scanned</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatNumber(cashier.items)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Average Ticket</span>
                      <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(cashier.avgTicket)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {reportType === "inventory" && (
          <div className="bg-white dark:bg-pos-card rounded-2xl border border-gray-200 dark:border-pos-border p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Inventory Value & Status</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30">
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">Total Inventory Value</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(850000)}</p>
              </div>
              <div className="p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/30">
                <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium mb-1">Low Stock Items</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">24</p>
              </div>
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30">
                <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-1">Out of Stock Items</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">8</p>
              </div>
            </div>
            
            <h4 className="font-bold text-gray-900 dark:text-white mb-4">Stock Value by Category</h4>
            <div className="space-y-4">
              {[
                { name: "Groceries", val: 350000, pct: 41 },
                { name: "Dairy", val: 120000, pct: 14 },
                { name: "Beverages", val: 180000, pct: 21 },
                { name: "Household", val: 150000, pct: 18 },
                { name: "Bakery", val: 50000, pct: 6 },
              ].map(cat => (
                <div key={cat.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 dark:text-gray-300 font-medium">{cat.name}</span>
                    <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(cat.val)}</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                    <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${cat.pct}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

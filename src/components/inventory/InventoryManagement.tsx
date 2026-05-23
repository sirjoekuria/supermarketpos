"use client";

import { useState } from "react";
import {
  Package, Search, Plus, Edit2, Trash2, AlertTriangle,
  ArrowUpDown, Filter, Download,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

const MOCK_PRODUCTS: Product[] = [
  { id: "1", barcode: "8901234567890", name: "Fresh Milk 500ml", price: 65.00, cost_price: 50.00, stock_quantity: 50, category_id: "1", unit: "pcs", tax_rate: 16, discount_percent: 0, min_stock_level: 10, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "2", barcode: "8901234567891", name: "White Bread 400g", price: 55.00, cost_price: 40.00, stock_quantity: 3, category_id: "2", unit: "pcs", tax_rate: 16, discount_percent: 5, min_stock_level: 5, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "3", barcode: "8901234567892", name: "Sugar 1kg", price: 160.00, cost_price: 130.00, stock_quantity: 100, category_id: "3", unit: "pcs", tax_rate: 16, discount_percent: 0, min_stock_level: 20, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "4", barcode: "8901234567893", name: "Cooking Oil 1L", price: 280.00, cost_price: 240.00, stock_quantity: 40, category_id: "3", unit: "pcs", tax_rate: 16, discount_percent: 0, min_stock_level: 10, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "5", barcode: "8901234567894", name: "Rice 2kg", price: 320.00, cost_price: 270.00, stock_quantity: 1, category_id: "3", unit: "pcs", tax_rate: 16, discount_percent: 10, min_stock_level: 15, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "6", barcode: "8901234567895", name: "Wheat Flour 2kg", price: 210.00, cost_price: 175.00, stock_quantity: 45, category_id: "3", unit: "pcs", tax_rate: 16, discount_percent: 0, min_stock_level: 10, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "7", barcode: "8901234567896", name: "Eggs (Tray)", price: 450.00, cost_price: 380.00, stock_quantity: 2, category_id: "1", unit: "pcs", tax_rate: 16, discount_percent: 0, min_stock_level: 5, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "8", barcode: "8901234567897", name: "Salt 1kg", price: 35.00, cost_price: 25.00, stock_quantity: 80, category_id: "3", unit: "pcs", tax_rate: 16, discount_percent: 0, min_stock_level: 20, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export default function InventoryManagement() {
  const [search, setSearch] = useState("");
  const [products] = useState<Product[]>(MOCK_PRODUCTS);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.includes(search)
  );

  const stockStatus = (product: Product) => {
    if (product.stock_quantity <= 0) return { label: "Out of Stock", color: "danger" };
    if (product.stock_quantity <= product.min_stock_level) return { label: "Low Stock", color: "warning" };
    return { label: "In Stock", color: "success" };
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your product stock levels
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-pos-card border border-gray-200 dark:border-pos-border text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <Download className="w-4 h-4" />Export
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" />Add Product
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Products", value: products.length, icon: Package, color: "bg-primary-500" },
          { label: "Low Stock", value: products.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= p.min_stock_level).length, icon: AlertTriangle, color: "bg-yellow-500" },
          { label: "Out of Stock", value: products.filter((p) => p.stock_quantity <= 0).length, icon: AlertTriangle, color: "bg-red-500" },
          { label: "Active Items", value: products.filter((p) => p.is_active).length, icon: Package, color: "bg-green-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white dark:bg-pos-card rounded-2xl p-5 border border-gray-200 dark:border-pos-border">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", color)}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="bg-white dark:bg-pos-card rounded-2xl border border-gray-200 dark:border-pos-border overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-pos-border flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or barcode..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            <Filter className="w-4 h-4" />Filter
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            <ArrowUpDown className="w-4 h-4" />Sort
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-pos-border bg-gray-50 dark:bg-gray-800/50">
                {["Product", "Barcode", "Price", "Cost", "Stock", "Status", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-pos-border">
              {filtered.map((product) => {
                const status = stockStatus(product);
                return (
                  <tr
                    key={product.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-lg">
                          📦
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{product.name}</p>
                          <p className="text-xs text-gray-400">{product.unit}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-600 dark:text-gray-300">
                      {product.barcode}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(product.price)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {product.cost_price ? formatCurrency(product.cost_price) : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "text-sm font-bold",
                            product.stock_quantity <= 0
                              ? "text-red-600 dark:text-red-400"
                              : product.stock_quantity <= product.min_stock_level
                              ? "text-yellow-600 dark:text-yellow-400"
                              : "text-gray-900 dark:text-white"
                          )}
                        >
                          {product.stock_quantity}
                        </span>
                        <span className="text-xs text-gray-400">/ min {product.min_stock_level}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "px-2.5 py-1 rounded-full text-xs font-medium",
                          status.color === "success" && "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
                          status.color === "warning" && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
                          status.color === "danger" && "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                        )}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-primary-600 transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No products found</p>
          </div>
        )}
      </div>
    </div>
  );
}

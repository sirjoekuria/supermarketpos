"use client";

import { useState, useEffect } from "react";
import {
  Package, Search, Plus, Edit2, Trash2, AlertTriangle,
  ArrowUpDown, Filter, Download, Menu, Loader2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";
import { useUIStore, useProductStore } from "@/store";

export default function InventoryManagement() {
  const [search, setSearch] = useState("");
  const { toggleSidebar } = useUIStore();
  const { products, isLoading, error, fetchProducts } = useProductStore();

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

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
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto h-full">
      <div className="hidden lg:flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

      {/* Mobile action bar */}
      <div className="flex lg:hidden items-center gap-3">
        <button className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-pos-card border border-gray-200 dark:border-pos-border text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Export</span>
        </button>
        <button className="flex items-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors ml-auto">
          <Plus className="w-4 h-4" />
          <span>Add Product</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Total Products", value: products.length, icon: Package, color: "bg-primary-500" },
          { label: "Low Stock", value: products.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= p.min_stock_level).length, icon: AlertTriangle, color: "bg-yellow-500" },
          { label: "Out of Stock", value: products.filter((p) => p.stock_quantity <= 0).length, icon: AlertTriangle, color: "bg-red-500" },
          { label: "Active Items", value: products.filter((p) => p.is_active).length, icon: Package, color: "bg-green-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white dark:bg-pos-card rounded-2xl p-4 sm:p-5 border border-gray-200 dark:border-pos-border">
            <div className={cn("w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mb-2 sm:mb-3", color)}>
              <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="bg-white dark:bg-pos-card rounded-2xl border border-gray-200 dark:border-pos-border overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-pos-border flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex-1 min-w-[160px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            <Filter className="w-4 h-4" /><span className="hidden sm:inline">Filter</span>
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            <ArrowUpDown className="w-4 h-4" /><span className="hidden sm:inline">Sort</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary-500" />
              <p>Loading inventory from database...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-12 text-red-500">
              <AlertTriangle className="w-8 h-8 mb-4" />
              <p>Error loading products: {error}</p>
              <button 
                onClick={() => fetchProducts()}
                className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-gray-500">
              <Package className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium text-gray-900 dark:text-white">No products found</p>
              <p className="text-sm">Try adjusting your search or add a new product</p>
            </div>
          ) : (
            <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-pos-border bg-gray-50 dark:bg-gray-800/50">
                {[
                  { label: "Product", cls: "" },
                  { label: "Barcode", cls: "hidden md:table-cell" },
                  { label: "Price", cls: "" },
                  { label: "Cost", cls: "hidden sm:table-cell" },
                  { label: "Stock", cls: "" },
                  { label: "Status", cls: "hidden sm:table-cell" },
                  { label: "Actions", cls: "" },
                ].map(({ label, cls }) => (
                  <th
                    key={label}
                    className={cn("text-left px-3 sm:px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider", cls)}
                  >
                    {label}
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
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-base sm:text-lg flex-shrink-0">
                          📦
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{product.name}</p>
                          <p className="text-xs text-gray-400">{product.unit}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 font-mono text-xs text-gray-600 dark:text-gray-300 hidden md:table-cell">
                      {product.barcode}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(product.price)}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                      {product.cost_price ? formatCurrency(product.cost_price) : "—"}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div className="flex items-center gap-1 sm:gap-2">
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
                        <span className="text-xs text-gray-400 hidden sm:inline">/ min {product.min_stock_level}</span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 hidden sm:table-cell">
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
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div className="flex items-center gap-1 sm:gap-2">
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
          )}
        </div>
      </div>
    </div>
  );
}

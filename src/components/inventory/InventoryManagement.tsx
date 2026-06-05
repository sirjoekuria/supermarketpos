"use client";

import { useState, useEffect, type ChangeEvent } from "react";
import {
  Package, Search, Plus, Edit2, Trash2, AlertTriangle,
  ArrowUpDown, Filter, Download, Loader2, ImageIcon, Upload, X,
  TrendingUp, FileUp, Check, CalendarClock, ShieldAlert,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";
import { useProductStore, useBranchStore } from "@/store";

export default function InventoryManagement() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "price" | "stock">("name");
  const [filterBy, setFilterBy] = useState<"all" | "active" | "low_stock" | "out_of_stock" | "expiring_soon" | "expired">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [adjustmentForm, setAdjustmentForm] = useState({ quantity: 0, reason: "adjustment" as const });
  const [receiptForm, setReceiptForm] = useState({ supplier_name: "", notes: "" });
  const [receiptItems, setReceiptItems] = useState<Array<{ product_id: string; quantity_ordered: number; unit_cost: number }>>([]);
  const [bulkImportData, setBulkImportData] = useState("");
  const [importResults, setImportResults] = useState<any>(null);
  const [form, setForm] = useState({
    name: "",
    barcode: "",
    price: "",
    cost_price: "",
    stock_quantity: "",
    min_stock_level: "",
    unit: "",
    tax_rate: "",
    discount_percent: "",
    image_url: "",
    is_active: true,
    expiry_date: "",
  });
  const [actionError, setActionError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { products, isLoading, error, fetchProducts, subscribeToRealtime } = useProductStore();
  const { currentBranchId } = useBranchStore();

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts, currentBranchId]);

  // Real-time sync: refresh stock when any device changes branch_stock or products
  useEffect(() => {
    const unsubscribe = subscribeToRealtime();
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let filtered = products.filter(
    (p) =>
      (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode || "").includes(search)
  );

  const today = new Date(); today.setHours(0,0,0,0);
  const in30Days = new Date(today); in30Days.setDate(today.getDate() + 30);

  const expiryStatus = (product: Product) => {
    if (!product.expiry_date) return "none";
    const exp = new Date(product.expiry_date);
    if (exp < today) return "expired";
    if (exp <= in30Days) return "expiring_soon";
    return "ok";
  };

  if (filterBy === "active") filtered = filtered.filter(p => p.is_active);
  if (filterBy === "low_stock") filtered = filtered.filter(p => p.stock_quantity > 0 && p.stock_quantity <= p.min_stock_level);
  if (filterBy === "out_of_stock") filtered = filtered.filter(p => p.stock_quantity <= 0);
  if (filterBy === "expiring_soon") filtered = filtered.filter(p => expiryStatus(p) === "expiring_soon");
  if (filterBy === "expired") filtered = filtered.filter(p => expiryStatus(p) === "expired");

  filtered = filtered.sort((a, b) => {
    if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
    if (sortBy === "price") return b.price - a.price;
    if (sortBy === "stock") return b.stock_quantity - a.stock_quantity;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedFiltered = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const stockStatus = (product: Product) => {
    if (product.stock_quantity <= 0) return { label: "Out of Stock", color: "danger" };
    if (product.stock_quantity <= product.min_stock_level) return { label: "Low Stock", color: "warning" };
    return { label: "In Stock", color: "success" };
  };

  const openAdd = () => {
    setActionError("");
    setForm({
      name: "",
      barcode: "",
      price: "",
      cost_price: "",
      stock_quantity: "0",
      min_stock_level: "5",
      unit: "pcs",
      tax_rate: "16",
      discount_percent: "0",
      image_url: "",
      is_active: true,
      expiry_date: "",
    });
    setShowAddModal(true);
  };

  const openEdit = (product: Product) => {
    setActionError("");
    setEditingProduct(product);
    setForm({
      name: product.name || "",
      barcode: product.barcode || "",
      price: String(product.price || 0),
      cost_price: product.cost_price ? String(product.cost_price) : "",
      stock_quantity: String(product.stock_quantity || 0),
      min_stock_level: String(product.min_stock_level || 0),
      unit: product.unit || "pcs",
      tax_rate: String(product.tax_rate || 0),
      discount_percent: String(product.discount_percent || 0),
      image_url: product.image_url || "",
      is_active: product.is_active ?? true,
      expiry_date: product.expiry_date || "",
    });
    setShowAddModal(true);
  };

  const handleImageFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setActionError("Please choose an image file.");
      return;
    }
    if (file.size > 1_500_000) {
      setActionError("Please choose an image smaller than 1.5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setActionError("");
      setForm((current) => ({ ...current, image_url: String(reader.result || "") }));
    };
    reader.onerror = () => setActionError("Could not read that image file.");
    reader.readAsDataURL(file);
  };

  const handleCSVUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      setActionError("Please upload a .csv file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === "string") {
        setBulkImportData(text);
        setActionError("");
      }
    };
    reader.onerror = () => setActionError("Failed to read CSV file");
    reader.readAsText(file);
  };

  const handleCreate = async () => {
    setIsSaving(true);
    setActionError("");
    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          barcode: form.barcode.trim(),
          price: Number(form.price),
          cost_price: form.cost_price ? Number(form.cost_price) : null,
          stock_quantity: Number(form.stock_quantity),
          min_stock_level: Number(form.min_stock_level),
          unit: form.unit.trim() || "pcs",
          tax_rate: Number(form.tax_rate) || 0,
          discount_percent: Number(form.discount_percent) || 0,
          image_url: form.image_url.trim() || null,
          is_active: form.is_active,
          expiry_date: form.expiry_date || null,
          branch_id: currentBranchId || null,
        }),
      });
      if (!response.ok) {
        const errData = await response.json();
        setActionError(errData.error || "Failed to create product");
        setIsSaving(false);
        return;
      }
      setShowAddModal(false);
      await fetchProducts();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to create product");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!editingProduct) return;
    setIsSaving(true);
    setActionError("");
    try {
      const response = await fetch("/api/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingProduct.id,
          name: form.name.trim(),
          barcode: form.barcode.trim(),
          price: Number(form.price),
          cost_price: form.cost_price ? Number(form.cost_price) : null,
          stock_quantity: Number(form.stock_quantity),
          min_stock_level: Number(form.min_stock_level),
          unit: form.unit.trim() || "pcs",
          tax_rate: Number(form.tax_rate) || 0,
          discount_percent: Number(form.discount_percent) || 0,
          image_url: form.image_url.trim() || null,
          is_active: form.is_active,
          expiry_date: form.expiry_date || null,
          branch_id: currentBranchId || null,
        }),
      });
      if (!response.ok) {
        const errData = await response.json();
        setActionError(errData.error || "Failed to update product");
        setIsSaving(false);
        return;
      }
      setEditingProduct(null);
      await fetchProducts();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update product");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;
    setIsSaving(true);
    setActionError("");
    try {
      const response = await fetch(`/api/products?id=${deletingProduct.id}`, { method: "DELETE" });
      if (!response.ok) {
        const errData = await response.json();
        setActionError(errData.error || "Failed to delete product");
        setIsSaving(false);
        return;
      }
      setDeletingProduct(null);
      await fetchProducts();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete product");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStockAdjustment = async () => {
    if (!adjustingProduct) return;
    setIsSaving(true);
    setActionError("");
    try {
      const response = await fetch("/api/stock/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: adjustingProduct.id,
          quantity_change: adjustmentForm.quantity,
          reason: adjustmentForm.reason,
          branch_id: currentBranchId || null,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        setActionError(error.error || "Failed to adjust stock");
        setIsSaving(false);
        return;
      }
      setAdjustingProduct(null);
      setAdjustmentForm({ quantity: 0, reason: "adjustment" });
      await fetchProducts();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to adjust stock");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateReceipt = async () => {
    if (!receiptForm.supplier_name || receiptItems.length === 0) {
      setActionError("Missing supplier name or items");
      return;
    }
    setIsSaving(true);
    setActionError("");
    try {
      const items = receiptItems.map(item => ({
        ...item,
        subtotal: item.quantity_ordered * item.unit_cost,
      }));
      const response = await fetch("/api/stock/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplier_name: receiptForm.supplier_name, items, notes: receiptForm.notes, branch_id: currentBranchId || null }),
      });
      if (!response.ok) {
        const error = await response.json();
        setActionError(error.error || "Failed to create receipt");
        setIsSaving(false);
        return;
      }
      setShowReceiptModal(false);
      setReceiptForm({ supplier_name: "", notes: "" });
      setReceiptItems([]);
      await fetchProducts();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to create receipt");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkImport = async () => {
    if (!bulkImportData.trim()) {
      setActionError("CSV data is empty");
      return;
    }
    setIsSaving(true);
    setActionError("");
    try {
      const lines = bulkImportData.trim().split("\n");
      const items = lines
        .map(line => {
          const [barcode, quantity] = line.split(",").map(s => s.trim());
          return { barcode, quantity: parseInt(quantity) };
        })
        .filter(item => item.barcode && !isNaN(item.quantity));

      const response = await fetch("/api/stock/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, reason: "adjustment", branch_id: currentBranchId || null }),
      });
      if (!response.ok) {
        const error = await response.json();
        setActionError(error.error || "Failed to import stock");
        setIsSaving(false);
        return;
      }
      const result = await response.json();
      setImportResults(result);
      setBulkImportData("");
      await fetchProducts();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to import stock");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ["Name", "Barcode", "Price", "Cost", "Stock", "Min Stock", "Unit", "Status"];
    const rows = filtered.map(p => [
      p.name,
      p.barcode,
      p.price,
      p.cost_price ?? "",
      p.stock_quantity,
      p.min_stock_level,
      p.unit,
      stockStatus(p).label,
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="hidden lg:flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your product stock levels</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-pos-card border border-gray-200 dark:border-pos-border text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Download className="w-4 h-4" />Export CSV
          </button>
          <button
            onClick={() => setShowReceiptModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <TrendingUp className="w-4 h-4" />Stock Receipt
          </button>
          <button
            onClick={() => { setShowBulkImport(true); setBulkImportData(""); setImportResults(null); setActionError(""); }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <FileUp className="w-4 h-4" />Bulk Import
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />Add Product
          </button>
        </div>
      </div>

      {/* Mobile action bar */}
      <div className="flex lg:hidden items-center gap-2 flex-wrap">
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-pos-card border border-gray-200 dark:border-pos-border text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <Download className="w-4 h-4" /><span className="hidden sm:inline">Export</span>
        </button>
        <button
          onClick={() => { setShowBulkImport(true); setBulkImportData(""); setImportResults(null); setActionError(""); }}
          className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <FileUp className="w-4 h-4" /><span className="hidden sm:inline">Import</span>
        </button>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors ml-auto"
        >
          <Plus className="w-4 h-4" /><span>Add Product</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Total Products", value: products.length, icon: Package, color: "bg-primary-500" },
          { label: "Low Stock", value: products.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= p.min_stock_level).length, icon: AlertTriangle, color: "bg-yellow-500" },
          { label: "Out of Stock", value: products.filter((p) => p.stock_quantity <= 0).length, icon: AlertTriangle, color: "bg-red-500" },
          { label: "Expiring Soon", value: products.filter((p) => expiryStatus(p) === "expiring_soon").length, icon: CalendarClock, color: "bg-orange-500" },
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
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => { setShowFilterDropdown(!showFilterDropdown); setShowSortDropdown(false); }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-colors",
                filterBy !== "all"
                  ? "bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              )}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">
                {filterBy === "all" ? "Filter" :
                 filterBy === "active" ? "Active" :
                 filterBy === "low_stock" ? "Low Stock" :
                 filterBy === "out_of_stock" ? "Out of Stock" :
                 filterBy === "expiring_soon" ? "Expiring Soon" : "Expired"}
              </span>
            </button>
            {showFilterDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-20 py-1">
                {[
                  { id: "all", label: "All Products" },
                  { id: "active", label: "Active Only" },
                  { id: "low_stock", label: "Low Stock" },
                  { id: "out_of_stock", label: "Out of Stock" },
                  { id: "expiring_soon", label: "Expiring Soon (30d)" },
                  { id: "expired", label: "Expired" },
                ].map(opt => (
                  <button
                    key={opt.id}
                     onClick={() => { setFilterBy(opt.id as any); setShowFilterDropdown(false); setCurrentPage(1); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between"
                  >
                    {opt.label}
                    {filterBy === opt.id && <Check className="w-4 h-4 text-primary-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => { setShowSortDropdown(!showSortDropdown); setShowFilterDropdown(false); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <ArrowUpDown className="w-4 h-4" />
              <span className="hidden sm:inline">
                {sortBy === "name" ? "Name" : sortBy === "price" ? "Price" : "Stock"}
              </span>
            </button>
            {showSortDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-20 py-1">
                {[
                  { id: "name", label: "Product Name" },
                  { id: "price", label: "Price (High to Low)" },
                  { id: "stock", label: "Stock Level" },
                ].map(opt => (
                  <button
                    key={opt.id}
                     onClick={() => { setSortBy(opt.id as any); setShowSortDropdown(false); setCurrentPage(1); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between"
                  >
                    {opt.label}
                    {sortBy === opt.id && <Check className="w-4 h-4 text-primary-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="text-xs text-gray-400 ml-auto hidden sm:inline">
            {filtered.length} of {products.length} products
          </span>
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
              <button
                onClick={openAdd}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Product
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-pos-border bg-gray-50 dark:bg-gray-800/50">
                  {[
                    { label: "Product", cls: "" },
                    { label: "Barcode", cls: "hidden md:table-cell" },
                    { label: "Price", cls: "" },
                    { label: "Stock", cls: "" },
                    { label: "Expiry", cls: "hidden sm:table-cell" },
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
                {pagedFiltered.map((product) => {
                  const status = stockStatus(product);
                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-base sm:text-lg flex-shrink-0 overflow-hidden">
                            {product.image_url ? (
                              <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              "📦"
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">{product.name}</p>
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
                         {(() => {
                           const es = expiryStatus(product);
                           if (es === "none") return <span className="text-xs text-gray-400">—</span>;
                           const fmt = new Date(product.expiry_date!).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
                           return (
                             <span className={cn(
                               "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                               es === "expired" && "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
                               es === "expiring_soon" && "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
                               es === "ok" && "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
                             )}>
                               {es === "expired" && <ShieldAlert className="w-3 h-3" />}
                               {es === "expiring_soon" && <CalendarClock className="w-3 h-3" />}
                               {fmt}
                             </span>
                           );
                         })()}
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
                          <button
                            onClick={() => {
                              setAdjustingProduct(product);
                              setAdjustmentForm({ quantity: 0, reason: "adjustment" });
                              setActionError("");
                            }}
                            className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-400 hover:text-blue-500 transition-colors"
                            title="Adjust stock"
                          >
                            <TrendingUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEdit(product)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-primary-600 transition-colors"
                            title="Edit product"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setActionError(""); setDeletingProduct(product); }}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                            title="Delete product"
                          >
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

        {/* Inventory Pagination */}
        {!isLoading && filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-gray-200 dark:border-pos-border bg-gray-50 dark:bg-gray-800/40">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-pos-card border border-gray-200 dark:border-pos-border text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              &larr; Previous
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Page {currentPage} of {totalPages} &nbsp;&middot;&nbsp; {filtered.length} items
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-pos-card border border-gray-200 dark:border-pos-border text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next &rarr;
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {(editingProduct || showAddModal) && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-white dark:bg-pos-card rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-200 dark:border-pos-border sticky top-0 bg-white dark:bg-pos-card z-10 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingProduct ? "Edit Product" : "Add New Product"}
              </h2>
              <button
                onClick={() => { setEditingProduct(null); setShowAddModal(false); }}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-4 rounded-xl border border-gray-200 dark:border-pos-border p-4">
                <div className="aspect-square rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-pos-border overflow-hidden flex items-center justify-center">
                  {form.image_url ? (
                    <img src={form.image_url} alt={form.name || "Product image"} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-10 h-10 text-gray-400" />
                  )}
                </div>
                <div className="space-y-3">
                  <label className="space-y-1.5 block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Product Image URL</span>
                    <input
                      type="url"
                      value={form.image_url}
                      onChange={(e) => setForm((current) => ({ ...current, image_url: e.target.value }))}
                      placeholder="https://example.com/product.jpg"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium cursor-pointer transition-colors">
                      <Upload className="w-4 h-4" />
                      Upload Image
                      <input type="file" accept="image/*" onChange={handleImageFile} className="sr-only" />
                    </label>
                    {form.image_url && (
                      <button
                        type="button"
                        onClick={() => setForm((current) => ({ ...current, image_url: "" }))}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-pos-border text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <X className="w-4 h-4" /> Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {[
                { key: "name", label: "Name *", type: "text" },
                { key: "barcode", label: "Barcode *", type: "text" },
                { key: "price", label: "Price *", type: "number" },
                { key: "cost_price", label: "Cost Price", type: "number" },
                { key: "stock_quantity", label: "Stock Quantity", type: "number" },
                { key: "min_stock_level", label: "Minimum Stock", type: "number" },
                { key: "unit", label: "Unit", type: "text" },
                { key: "tax_rate", label: "Tax Rate (%)", type: "number" },
                { key: "discount_percent", label: "Discount (%)", type: "number" },
              ].map(({ key, label, type }) => (
                <label key={key} className="space-y-1.5">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
                  <input
                    type={type}
                    value={form[key as keyof typeof form] as string}
                    onChange={(e) => setForm((current) => ({ ...current, [key]: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </label>
              ))}

              {/* Expiry Date */}
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <CalendarClock className="w-4 h-4 text-orange-500" /> Expiry Date
                  <span className="text-xs text-gray-400 font-normal">(leave blank for non-perishable)</span>
                </span>
                <input
                  type="date"
                  value={form.expiry_date}
                  onChange={(e) => setForm((current) => ({ ...current, expiry_date: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {form.expiry_date && (() => {
                  const exp = new Date(form.expiry_date); const t = new Date(); t.setHours(0,0,0,0);
                  if (exp < t) return <p className="text-xs text-red-500 flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> This date is in the past — product will be marked as expired</p>;
                  const diff = Math.ceil((exp.getTime() - t.getTime()) / 86400000);
                  if (diff <= 30) return <p className="text-xs text-orange-500 flex items-center gap-1"><CalendarClock className="w-3 h-3" /> Expires in {diff} day{diff !== 1 ? "s" : ""}</p>;
                  return null;
                })()}
              </label>

              <label className="sm:col-span-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((current) => ({ ...current, is_active: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                Active product (available for sale)
              </label>

              {actionError && (
                <p className="sm:col-span-2 text-sm text-red-600 dark:text-red-400">{actionError}</p>
              )}
            </div>

            <div className="p-5 border-t border-gray-200 dark:border-pos-border flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-pos-card">
              <button
                onClick={() => { setEditingProduct(null); setShowAddModal(false); }}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-pos-border text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={editingProduct ? handleSave : handleCreate}
                disabled={isSaving || !form.name.trim() || !form.barcode.trim() || !form.price}
                className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white text-sm font-medium"
              >
                {isSaving ? "Saving..." : (editingProduct ? "Save Changes" : "Create Product")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-pos-card rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Delete Product</h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Are you sure you want to delete <strong>{deletingProduct.name}</strong>? This cannot be undone.
              </p>
              {actionError && (
                <p className="mt-3 text-sm text-red-600 dark:text-red-400">{actionError}</p>
              )}
            </div>
            <div className="p-5 border-t border-gray-200 dark:border-pos-border flex justify-end gap-3">
              <button
                onClick={() => setDeletingProduct(null)}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-pos-border text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white text-sm font-medium"
              >
                {isSaving ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-pos-card rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b border-gray-200 dark:border-pos-border">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Adjust Stock</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{adjustingProduct.name}</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Current Stock: <strong className="text-gray-900 dark:text-white">{adjustingProduct.stock_quantity} {adjustingProduct.unit}</strong>
                </p>
              </div>
              <label className="space-y-1.5 block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Adjustment Type</span>
                <select
                  value={adjustmentForm.reason}
                  onChange={(e) => setAdjustmentForm(prev => ({ ...prev, reason: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="adjustment">Stock Adjustment</option>
                  <option value="return">Return</option>
                  <option value="loss">Loss/Damage</option>
                  <option value="correction">Correction</option>
                </select>
              </label>
              <label className="space-y-1.5 block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Quantity Change (use negative to reduce)</span>
                <input
                  type="number"
                  value={adjustmentForm.quantity}
                  onChange={(e) => setAdjustmentForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                  placeholder="e.g. +5 or -3"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </label>
              {adjustmentForm.quantity !== 0 && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-sm text-blue-800 dark:text-blue-300">
                  New stock will be: <strong>{adjustingProduct.stock_quantity + adjustmentForm.quantity} {adjustingProduct.unit}</strong>
                </div>
              )}
              {actionError && <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>}
            </div>
            <div className="p-5 border-t border-gray-200 dark:border-pos-border flex justify-end gap-3">
              <button
                onClick={() => setAdjustingProduct(null)}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-pos-border text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleStockAdjustment}
                disabled={isSaving || adjustmentForm.quantity === 0}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white text-sm font-medium"
              >
                {isSaving ? "Adjusting..." : "Adjust Stock"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Receipt Modal */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-white dark:bg-pos-card rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-200 dark:border-pos-border sticky top-0 bg-white dark:bg-pos-card z-10 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Stock Receipt</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Record incoming stock from supplier</p>
              </div>
              <button onClick={() => { setShowReceiptModal(false); setReceiptForm({ supplier_name: "", notes: "" }); setReceiptItems([]); setActionError(""); }} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <label className="space-y-1.5 block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Supplier Name *</span>
                <input
                  type="text"
                  value={receiptForm.supplier_name}
                  onChange={(e) => setReceiptForm(prev => ({ ...prev, supplier_name: e.target.value }))}
                  placeholder="Enter supplier name"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </label>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Receipt Items</h3>
                </div>
                <div className="mb-3">
                  <select
                    value=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const product = products.find(p => p.id === e.target.value);
                      if (product) {
                        setReceiptItems(items => [...items, { product_id: product.id, quantity_ordered: 1, unit_cost: product.cost_price || product.price }]);
                      }
                      e.target.value = "";
                    }}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">+ Add product to receipt...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {receiptItems.length > 0 ? (
                    receiptItems.map((item, idx) => {
                      const product = products.find(p => p.id === item.product_id);
                      return (
                        <div key={idx} className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{product?.name}</p>
                          </div>
                          <input
                            type="number"
                            value={item.quantity_ordered}
                            onChange={(e) => setReceiptItems(items => items.map((it, i) => i === idx ? { ...it, quantity_ordered: parseInt(e.target.value) || 1 } : it))}
                            placeholder="Qty"
                            className="w-16 px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-center"
                          />
                          <input
                            type="number"
                            value={item.unit_cost}
                            onChange={(e) => setReceiptItems(items => items.map((it, i) => i === idx ? { ...it, unit_cost: parseFloat(e.target.value) || 0 } : it))}
                            placeholder="Cost"
                            className="w-20 px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-center"
                          />
                          <button
                            onClick={() => setReceiptItems(items => items.filter((_, i) => i !== idx))}
                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 rounded transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-gray-500 italic p-3">No items added yet — select products above</p>
                  )}
                </div>
              </div>

              <label className="space-y-1.5 block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes</span>
                <textarea
                  value={receiptForm.notes}
                  onChange={(e) => setReceiptForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes"
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </label>

              {actionError && <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>}
            </div>

            <div className="p-5 border-t border-gray-200 dark:border-pos-border flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-pos-card">
              <button
                onClick={() => { setShowReceiptModal(false); setReceiptForm({ supplier_name: "", notes: "" }); setReceiptItems([]); setActionError(""); }}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-pos-border text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateReceipt}
                disabled={isSaving || !receiptForm.supplier_name || receiptItems.length === 0}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white text-sm font-medium"
              >
                {isSaving ? "Creating..." : "Create Receipt"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-white dark:bg-pos-card rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-200 dark:border-pos-border sticky top-0 bg-white dark:bg-pos-card z-10 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Bulk Import Stock</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Upload a CSV or paste data to update stock levels</p>
              </div>
              <button onClick={() => { setShowBulkImport(false); setBulkImportData(""); setImportResults(null); setActionError(""); }} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {!importResults ? (
                <>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-sm text-blue-800 dark:text-blue-300">
                    <p className="font-bold mb-2">CSV Format:</p>
                    <p className="font-mono bg-white dark:bg-gray-800 px-3 py-2 rounded border border-blue-200 dark:border-blue-800 inline-block">barcode,quantity</p>
                    <p className="mt-2 text-xs opacity-80">Example:<br />847123984,50<br />992138472,120<br />345678,-2 (to reduce)</p>
                  </div>

                  {/* CSV File Upload */}
                  <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Upload className="w-6 h-6 text-gray-400 group-hover:text-primary-500 transition-colors" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">Click to upload a <strong>.csv</strong> file</p>
                    </div>
                    <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
                  </label>

                  <div className="flex items-center gap-4">
                    <div className="h-px bg-gray-200 dark:bg-pos-border flex-1" />
                    <span className="text-sm text-gray-500 font-medium">OR paste CSV data</span>
                    <div className="h-px bg-gray-200 dark:bg-pos-border flex-1" />
                  </div>

                  <textarea
                    value={bulkImportData}
                    onChange={(e) => setBulkImportData(e.target.value)}
                    placeholder={"barcode,quantity\n847123984,50\n992138472,120"}
                    rows={6}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
                  />
                  {actionError && <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>}
                </>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center flex-shrink-0 text-green-600">
                      <Check className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-green-800 dark:text-green-300">Import Complete</h4>
                      <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                        Successfully updated {importResults.successful?.length ?? importResults.successful ?? 0} items.
                      </p>
                    </div>
                  </div>
                  {(importResults.failed?.length > 0 || importResults.errors?.length > 0) && (
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl">
                      <h4 className="font-bold text-red-800 dark:text-red-300 mb-2">Failed Items</h4>
                      <ul className="text-sm text-red-700 dark:text-red-400 space-y-1 list-disc pl-5">
                        {(importResults.failed || importResults.errors || []).slice(0, 5).map((f: any, i: number) => (
                          <li key={i}>{typeof f === "string" ? f : `Barcode ${f.barcode}: ${f.reason}`}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <button
                    onClick={() => { setImportResults(null); setBulkImportData(""); }}
                    className="text-sm text-primary-600 hover:underline"
                  >
                    Import more
                  </button>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-gray-200 dark:border-pos-border flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-pos-card">
              <button
                onClick={() => { setShowBulkImport(false); setBulkImportData(""); setImportResults(null); setActionError(""); }}
                className="px-4 py-2 border border-gray-200 dark:border-pos-border rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Close
              </button>
              {!importResults && (
                <button
                  onClick={handleBulkImport}
                  disabled={isSaving || !bulkImportData.trim()}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  {isSaving ? "Importing..." : "Process Import"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

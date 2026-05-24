"use client";

import { useState, useEffect, useRef } from "react";
import {
  ScanLine, ShoppingCart, CreditCard, Banknote, Monitor, Search, X,
  Receipt, Loader2, CheckCircle2, AlertCircle, Smartphone, Split,
  LogOut, Moon, Sun, Menu,
} from "lucide-react";
import { useCartStore, useAuthStore, useUIStore, useSettingsStore, useProductStore } from "@/store";
import { formatCurrency, generateReceiptNumber, debounce } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";
import BarcodeScanner from "./BarcodeScanner";
import Cart from "./Cart";
import MpesaPayment from "./MpesaPayment";
import ReceiptComponent from "./Receipt";
import CustomerDisplay from "./CustomerDisplay";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CompletedSale = any;

type SplitPaymentMethod = "cash" | "mpesa" | "card";

export default function POSScreen() {
  const { items, addItem, clearCart, getTotals } = useCartStore();
  const { user, logout } = useAuthStore();
  const { darkMode, toggleDarkMode, customerDisplay, toggleCustomerDisplay, toggleSidebar } = useUIStore();
  const { settings } = useSettingsStore();
  const { products, isLoading, error: productsError, fetchProducts } = useProductStore();

  const [showScanner, setShowScanner] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [showReceipt, setShowReceipt] = useState(false);
  const [completedSale, setCompletedSale] = useState<CompletedSale>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cashReceived, setCashReceived] = useState("");
  const [splitPayments, setSplitPayments] = useState<Record<SplitPaymentMethod, string>>({
    cash: "",
    mpesa: "",
    card: "",
  });
  const [splitReferences, setSplitReferences] = useState<Record<"mpesa" | "card", string>>({
    mpesa: "",
    card: "",
  });
  const [error, setError] = useState("");
  const [mobileTab, setMobileTab] = useState<"products" | "cart">("products");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const totals = getTotals();
  const parseAmount = (value: string) => {
    const amount = Number(value);
    return Number.isFinite(amount) && amount > 0 ? amount : 0;
  };
  const splitPaidTotal = Math.round(
    parseAmount(splitPayments.cash) +
      parseAmount(splitPayments.mpesa) +
      parseAmount(splitPayments.card)
  );
  const splitBalance = Math.max(totals.total - splitPaidTotal, 0);
  const splitChange = Math.max(splitPaidTotal - totals.total, 0);
  const splitBreakdown = (Object.entries(splitPayments) as [SplitPaymentMethod, string][])
    .map(([method, value]) => ({
      method,
      amount: parseAmount(value),
      reference:
        method === "mpesa" || method === "card"
          ? splitReferences[method].trim() || undefined
          : undefined,
    }))
    .filter((payment) => payment.amount > 0);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    let barcodeBuffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.key) return; // guard against undefined key (virtual keyboards, extensions)
      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 100) barcodeBuffer = "";
      lastKeyTime = currentTime;

      if (e.key === "Enter" && barcodeBuffer.length > 5) {
        handleBarcodeScan(barcodeBuffer.trim());
        barcodeBuffer = "";
      } else if (e.key.length === 1) {
        barcodeBuffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBarcodeScan = (barcode: string) => {
    const product = products.find((p) => p.barcode === barcode);
    if (product) {
      addItem(product);
      setError("");
    } else {
      setError(`Product not found: ${barcode}`);
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleSearch = debounce((...args: unknown[]) => {
    const query = args[0] as string;
    if (!query.trim()) { setSearchResults([]); return; }
    const results = products.filter(
      (p) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.barcode.includes(query)
    );
    setSearchResults(results);
  }, 300);

  const handlePayment = async (mpesaTransactionId?: string) => {
    if (items.length === 0) return;
    if (paymentMethod === "split" && splitPaidTotal < totals.total) {
      setError(`Split payment is short by ${formatCurrency(splitBalance)}`);
      return;
    }

    setIsProcessing(true);
    setError("");
    try {
      const receiptNum = generateReceiptNumber();
      const saleItems = items.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price,
        subtotal: item.product.price * item.quantity,
        tax_amount: (item.product.price * item.quantity) * (item.product.tax_rate / 100),
        discount_amount: item.discount || 0,
        total: item.total,
      }));

      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receipt_number: receiptNum,
          subtotal: totals.subtotal,
          tax_amount: totals.taxAmount,
          discount_amount: totals.discountAmount,
          total: totals.total,
          payment_method: paymentMethod,
          payment_status: "completed",
          items: saleItems,
          split_payments: paymentMethod === "split" ? splitBreakdown : undefined,
          actor: user
            ? {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
              }
            : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Failed to record sale: ${data.error || "Server error"}`);
      }

      // Prepare UI state for receipt
      const sale = {
        id: data.sale.id,
        receipt_number: receiptNum,
        items: [...items],
        subtotal: totals.subtotal,
        tax_amount: totals.taxAmount,
        discount_amount: totals.discountAmount,
        total: totals.total,
        payment_method: paymentMethod,
        payment_status: "completed",
        mpesa_transaction_id: mpesaTransactionId,
        split_payments: paymentMethod === "split" ? splitBreakdown : undefined,
        cashier_id: user?.id || "",
        cashier: user,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setCompletedSale(sale);
      setShowReceipt(true);
      clearCart();
      setShowPayment(false);
      setCashReceived("");
      setSplitPayments({ cash: "", mpesa: "", card: "" });
      setSplitReferences({ mpesa: "", card: "" });
      setMobileTab("products");
    } catch (err: any) {
      setError(err.message || "Payment processing failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMpesaSuccess = (transactionId: string) => { handlePayment(transactionId); };
  const handleMpesaFailure = (err: string) => { setError(err); setIsProcessing(false); };

  const cashChange =
    paymentMethod === "cash" && cashReceived
      ? parseFloat(cashReceived) - totals.total
      : 0;

  return (
    <div className={cn("h-screen flex flex-col bg-gray-50 dark:bg-pos-dark transition-colors", darkMode && "dark")}>
      {/* Header */}
      <header className="h-16 bg-white dark:bg-pos-card border-b border-gray-200 dark:border-pos-border flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Mobile hamburger menu */}
          <button
            onClick={() => toggleSidebar()}
            className="lg:hidden p-2 -ml-2 mr-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">
              {settings?.shop_name || "SuperMarket POS"}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
              {user?.full_name || "Cashier"} &mdash; {user?.role || "cashier"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={toggleCustomerDisplay}
            className={cn(
              "p-2.5 rounded-xl transition-all",
              customerDisplay
                ? "bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            )}
            title="Toggle Customer Display"
          >
            <Monitor className="w-5 h-5" />
          </button>
          <button
            onClick={toggleDarkMode}
            className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            onClick={() => logout()}
            className="p-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Mobile Tab Selector — only shown on small screens */}
      <div className="lg:hidden flex border-b border-gray-200 dark:border-pos-border bg-white dark:bg-pos-card flex-shrink-0">
        <button
          onClick={() => setMobileTab("products")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all border-b-2",
            mobileTab === "products"
              ? "border-primary-500 text-primary-600 dark:text-primary-400"
              : "border-transparent text-gray-500 dark:text-gray-400"
          )}
        >
          <Search className="w-4 h-4" />
          Products
        </button>
        <button
          onClick={() => setMobileTab("cart")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all border-b-2 relative",
            mobileTab === "cart"
              ? "border-primary-500 text-primary-600 dark:text-primary-400"
              : "border-transparent text-gray-500 dark:text-gray-400"
          )}
        >
          <ShoppingCart className="w-4 h-4" />
          Cart
          {items.length > 0 && (
            <span className="absolute top-2 right-[calc(50%-20px)] w-5 h-5 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {items.length}
            </span>
          )}
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel — Product Grid */}
        <div
          className={cn(
            "flex-1 flex flex-col min-w-0",
            // On mobile: hide unless "products" tab is selected
            mobileTab !== "products" ? "hidden lg:flex" : "flex"
          )}
        >
          {/* Search Bar */}
          <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-pos-border bg-white dark:bg-pos-card flex-shrink-0">
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={() => setShowScanner(true)}
                className="flex items-center gap-2 px-3 sm:px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-all active:scale-[0.98] shadow-lg shadow-primary-600/20 flex-shrink-0"
              >
                <ScanLine className="w-5 h-5" />
                <span className="hidden sm:inline">Scan</span>
              </button>
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    handleSearch(e.target.value);
                  }}
                  placeholder="Search products..."
                  className="w-full pl-11 pr-10 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSearchResults([]);
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-3 flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm animate-in slide-in-from-top">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="mt-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl shadow-lg max-h-64 overflow-y-auto">
                {searchResults.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => {
                      addItem(product);
                      setSearchQuery("");
                      setSearchResults([]);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-gray-500">{product.unit}</span>
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.barcode}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary-600 dark:text-primary-400">
                        {formatCurrency(product.price)}
                      </p>
                      <p className="text-xs text-gray-400">Stock: {product.stock_quantity}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary-500" />
                <p>Loading products...</p>
              </div>
            ) : productsError ? (
              <div className="flex flex-col items-center justify-center h-full text-red-500">
                <AlertCircle className="w-8 h-8 mb-4" />
                <p>Error loading products: {productsError}</p>
                <button 
                  onClick={() => fetchProducts()}
                  className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <span className="text-4xl mb-4 opacity-50">📦</span>
                <p className="text-lg font-medium text-gray-900 dark:text-white">No products found</p>
                <p className="text-sm">Please add some products in the database.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-3">
                {products.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addItem(product)}
                    className="group bg-white dark:bg-pos-card border border-gray-200 dark:border-pos-border rounded-xl p-3 sm:p-4 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-lg transition-all active:scale-[0.97] text-left flex flex-col"
                  >
                    <div className="w-full aspect-square rounded-lg bg-gray-100 dark:bg-gray-700 mb-2 sm:mb-3 flex items-center justify-center relative overflow-hidden">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl sm:text-3xl">📦</span>
                      )}
                      {product.stock_quantity <= 0 && (
                        <div className="absolute inset-0 bg-white/60 dark:bg-black/60 flex items-center justify-center backdrop-blur-[1px]">
                          <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">Out of Stock</span>
                        </div>
                      )}
                    </div>
                    <h3 className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-1 flex-1">
                      {product.name}
                    </h3>
                    <div className="flex items-center justify-between w-full mt-auto">
                      <span className="text-sm sm:text-lg font-bold text-primary-600 dark:text-primary-400">
                        {formatCurrency(product.price)}
                      </span>
                      {product.discount_percent > 0 && (
                        <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] sm:text-xs font-medium rounded-full">
                          -{product.discount_percent}%
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Floating Checkout Bar on mobile when cart has items */}
          {items.length > 0 && (
            <div className="lg:hidden p-3 bg-white dark:bg-pos-card border-t border-gray-200 dark:border-pos-border flex-shrink-0">
              <button
                onClick={() => setShowPayment(true)}
                className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-all active:scale-[0.98] shadow-lg shadow-primary-600/20 flex items-center justify-center gap-2"
              >
                <CreditCard className="w-5 h-5" />
                Checkout {formatCurrency(totals.total)}
                <span className="bg-white/20 text-white text-xs font-bold rounded-full px-2 py-0.5 ml-1">
                  {items.reduce((s, i) => s + i.quantity, 0)} items
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Right Panel — Cart */}
        <div
          className={cn(
            "w-full lg:w-auto lg:max-w-md bg-white dark:bg-pos-card border-l border-gray-200 dark:border-pos-border flex flex-col flex-shrink-0",
            // On mobile: show only if "cart" tab is selected
            mobileTab !== "cart" ? "hidden lg:flex" : "flex"
          )}
        >
          <Cart />
          {items.length > 0 && (
            <div className="p-4 border-t border-gray-200 dark:border-pos-border space-y-3 flex-shrink-0">
              <button
                onClick={() => setShowPayment(true)}
                className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-lg transition-all active:scale-[0.98] shadow-lg shadow-primary-600/20 flex items-center justify-center gap-2"
              >
                <CreditCard className="w-5 h-5" />
                Checkout {formatCurrency(totals.total)}
              </button>
              <button
                onClick={clearCart}
                className="w-full py-2.5 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 text-sm font-medium transition-colors"
              >
                Clear Cart
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white dark:bg-pos-card rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-pos-border flex-shrink-0">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Payment</h3>
              <button
                onClick={() => { setShowPayment(false); setCashReceived(""); }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="text-center mb-6">
                <p className="text-sm text-gray-500 dark:text-gray-400">Amount Due</p>
                <p className="text-4xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(totals.total)}
                </p>
              </div>

              {/* Payment Method Selection */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { id: "cash", label: "Cash", icon: Banknote, color: "primary" },
                  { id: "mpesa", label: "M-Pesa", icon: Smartphone, color: "green" },
                  { id: "card", label: "Card", icon: CreditCard, color: "primary" },
                  { id: "split", label: "Split", icon: Split, color: "primary" },
                ].map(({ id, label, icon: Icon, color }) => (
                  <button
                    key={id}
                    onClick={() => {
                      setPaymentMethod(id);
                      setError("");
                    }}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                      paymentMethod === id
                        ? color === "green"
                          ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                          : "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                        : "border-gray-200 dark:border-pos-border hover:border-gray-300 dark:hover:border-gray-600"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-8 h-8",
                        paymentMethod === id
                          ? color === "green"
                            ? "text-green-500"
                            : "text-primary-500"
                          : "text-gray-400"
                      )}
                    />
                    <span
                      className={cn(
                        "font-medium text-sm",
                        paymentMethod === id
                          ? color === "green"
                            ? "text-green-600 dark:text-green-400"
                            : "text-primary-600 dark:text-primary-400"
                          : "text-gray-600 dark:text-gray-400"
                      )}
                    >
                      {label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Cash Payment */}
              {paymentMethod === "cash" && (
                <div className="space-y-4">
                  {error && (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {error}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Cash Received
                    </label>
                    <input
                      type="number"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      placeholder="Enter amount..."
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-gray-900 dark:text-white text-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
                      autoFocus
                    />
                  </div>
                  {cashChange > 0 && (
                    <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                      <span className="text-green-700 dark:text-green-400 font-medium">Change</span>
                      <span className="text-2xl font-bold text-green-700 dark:text-green-400">
                        {formatCurrency(cashChange)}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => handlePayment()}
                    disabled={parseFloat(cashReceived) < totals.total || isProcessing}
                    className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-xl font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <><Loader2 className="w-5 h-5 animate-spin" />Processing...</>
                    ) : (
                      <><CheckCircle2 className="w-5 h-5" />Complete Payment</>
                    )}
                  </button>
                </div>
              )}

              {/* M-Pesa Payment */}
              {paymentMethod === "mpesa" && (
                <MpesaPayment
                  amount={totals.total}
                  onSuccess={handleMpesaSuccess}
                  onFailure={handleMpesaFailure}
                  onCancel={() => setShowPayment(false)}
                />
              )}

              {/* Card */}
              {paymentMethod === "card" && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <p className="text-gray-900 dark:text-white font-medium">Card Reader Required</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Please connect a card reader device.</p>
                </div>
              )}

              {/* Split Payment */}
              {paymentMethod === "split" && (
                <div className="space-y-4">
                  {error && (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {error}
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Paid</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(splitPaidTotal)}</p>
                    </div>
                    <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Balance</p>
                      <p className={cn("text-sm font-bold", splitBalance > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400")}>
                        {formatCurrency(splitBalance)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Change</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(splitChange)}</p>
                    </div>
                  </div>

                  {[
                    { method: "cash" as const, label: "Cash", icon: Banknote },
                    { method: "mpesa" as const, label: "M-Pesa", icon: Smartphone },
                    { method: "card" as const, label: "Card", icon: CreditCard },
                  ].map(({ method, label, icon: Icon }) => {
                    const otherPaid = splitPaidTotal - parseAmount(splitPayments[method]);
                    const remainingForMethod = Math.max(totals.total - otherPaid, 0);

                    return (
                      <div key={method} className="rounded-xl border border-gray-200 dark:border-pos-border p-4 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            <Icon className="w-4 h-4 text-gray-400" />
                            {label}
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              setSplitPayments((current) => ({
                                ...current,
                                [method]: remainingForMethod > 0 ? String(remainingForMethod) : "",
                              }))
                            }
                            className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
                          >
                            Fill balance
                          </button>
                        </div>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={splitPayments[method]}
                          onChange={(e) =>
                            setSplitPayments((current) => ({ ...current, [method]: e.target.value }))
                          }
                          placeholder="0"
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-gray-900 dark:text-white text-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        {(method === "mpesa" || method === "card") && (
                          <input
                            type="text"
                            value={splitReferences[method]}
                            onChange={(e) =>
                              setSplitReferences((current) => ({ ...current, [method]: e.target.value }))
                            }
                            placeholder={method === "mpesa" ? "M-Pesa code" : "Card reference"}
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        )}
                      </div>
                    );
                  })}

                  <button
                    onClick={() => handlePayment()}
                    disabled={splitPaidTotal < totals.total || isProcessing}
                    className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-xl font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <><Loader2 className="w-5 h-5 animate-spin" />Processing...</>
                    ) : (
                      <><CheckCircle2 className="w-5 h-5" />Complete Split Payment</>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && completedSale && (
        <ReceiptComponent
          sale={completedSale}
          settings={
            settings || {
              id: "1",
              shop_name: "SuperMarket POS",
              tax_rate: 16,
              currency: "KES",
              mpesa_enabled: true,
              dark_mode_default: false,
              created_at: "",
              updated_at: "",
            }
          }
          onClose={() => setShowReceipt(false)}
          onPrint={() => {}}
        />
      )}

      <BarcodeScanner
        isOpen={showScanner}
        onScan={handleBarcodeScan}
        onClose={() => setShowScanner(false)}
      />
      {customerDisplay && <CustomerDisplay />}
    </div>
  );
}

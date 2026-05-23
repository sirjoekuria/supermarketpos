"use client";

import { useState, useEffect, useRef } from "react";
import {
  ScanLine, ShoppingCart, CreditCard, Banknote, Monitor, Search, X,
  Receipt, Loader2, CheckCircle2, AlertCircle, Smartphone, Split,
  LogOut, Moon, Sun,
} from "lucide-react";
import { useCartStore, useAuthStore, useUIStore, useSettingsStore } from "@/store";
import { formatCurrency, generateReceiptNumber, debounce } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";
import BarcodeScanner from "./BarcodeScanner";
import Cart from "./Cart";
import MpesaPayment from "./MpesaPayment";
import ReceiptComponent from "./Receipt";
import CustomerDisplay from "./CustomerDisplay";

const MOCK_PRODUCTS: Product[] = [
  { id: "1", barcode: "8901234567890", name: "Fresh Milk 500ml", price: 65.00, stock_quantity: 50, category_id: "1", unit: "pcs", tax_rate: 16, discount_percent: 0, min_stock_level: 10, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "2", barcode: "8901234567891", name: "White Bread 400g", price: 55.00, stock_quantity: 30, category_id: "2", unit: "pcs", tax_rate: 16, discount_percent: 5, min_stock_level: 5, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "3", barcode: "8901234567892", name: "Sugar 1kg", price: 160.00, stock_quantity: 100, category_id: "3", unit: "pcs", tax_rate: 16, discount_percent: 0, min_stock_level: 20, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "4", barcode: "8901234567893", name: "Cooking Oil 1L", price: 280.00, stock_quantity: 40, category_id: "3", unit: "pcs", tax_rate: 16, discount_percent: 0, min_stock_level: 10, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "5", barcode: "8901234567894", name: "Rice 2kg", price: 320.00, stock_quantity: 60, category_id: "3", unit: "pcs", tax_rate: 16, discount_percent: 10, min_stock_level: 15, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "6", barcode: "8901234567895", name: "Wheat Flour 2kg", price: 210.00, stock_quantity: 45, category_id: "3", unit: "pcs", tax_rate: 16, discount_percent: 0, min_stock_level: 10, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "7", barcode: "8901234567896", name: "Eggs (Tray)", price: 450.00, stock_quantity: 20, category_id: "1", unit: "pcs", tax_rate: 16, discount_percent: 0, min_stock_level: 5, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "8", barcode: "8901234567897", name: "Salt 1kg", price: 35.00, stock_quantity: 80, category_id: "3", unit: "pcs", tax_rate: 16, discount_percent: 0, min_stock_level: 20, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CompletedSale = any;

export default function POSScreen() {
  const { items, addItem, clearCart, getTotals } = useCartStore();
  const { user, logout } = useAuthStore();
  const { darkMode, toggleDarkMode, customerDisplay, toggleCustomerDisplay } = useUIStore();
  const { settings } = useSettingsStore();

  const [showScanner, setShowScanner] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [showReceipt, setShowReceipt] = useState(false);
  const [completedSale, setCompletedSale] = useState<CompletedSale>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cashReceived, setCashReceived] = useState("");
  const [error, setError] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const totals = getTotals();

  useEffect(() => {
    let barcodeBuffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
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
    const product = MOCK_PRODUCTS.find((p) => p.barcode === barcode);
    if (product) {
      addItem(product);
      setError("");
    } else {
      setError(`Product not found: ${barcode}`);
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleSearch = debounce((query: string) => {
    if (!query.trim()) { setSearchResults([]); return; }
    const results = MOCK_PRODUCTS.filter(
      (p) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.barcode.includes(query)
    );
    setSearchResults(results);
  }, 300);

  const handlePayment = async () => {
    if (items.length === 0) return;
    setIsProcessing(true);
    try {
      const receiptNum = generateReceiptNumber();
      const sale = {
        id: receiptNum,
        receipt_number: receiptNum,
        items: [...items],
        subtotal: totals.subtotal,
        tax_amount: totals.taxAmount,
        discount_amount: totals.discountAmount,
        total: totals.total,
        payment_method: paymentMethod,
        payment_status: "completed",
        cashier_id: user?.id || "demo",
        cashier: user,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setCompletedSale(sale);
      setShowReceipt(true);
      clearCart();
      setShowPayment(false);
      setCashReceived("");
    } catch {
      setError("Payment processing failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMpesaSuccess = () => { handlePayment(); };
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
          <div className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
              {settings?.shop_name || "SuperMarket POS"}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {user?.full_name || "Cashier"} &mdash; {user?.role || "cashier"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel — Product Grid */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Search Bar */}
          <div className="p-4 border-b border-gray-200 dark:border-pos-border bg-white dark:bg-pos-card flex-shrink-0">
            <div className="flex gap-3">
              <button
                onClick={() => setShowScanner(true)}
                className="flex items-center gap-2 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-all active:scale-[0.98] shadow-lg shadow-primary-600/20 flex-shrink-0"
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
                  placeholder="Search products or type barcode..."
                  className="w-full pl-11 pr-10 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
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
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {MOCK_PRODUCTS.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addItem(product)}
                  className="group bg-white dark:bg-pos-card border border-gray-200 dark:border-pos-border rounded-xl p-4 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-lg transition-all active:scale-[0.98] text-left"
                >
                  <div className="w-full aspect-square rounded-lg bg-gray-100 dark:bg-gray-700 mb-3 flex items-center justify-center">
                    <span className="text-2xl">📦</span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-1">
                    {product.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{product.barcode}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                      {formatCurrency(product.price)}
                    </span>
                    {product.discount_percent > 0 && (
                      <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                        -{product.discount_percent}%
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel — Cart */}
        <div className="w-full max-w-md bg-white dark:bg-pos-card border-l border-gray-200 dark:border-pos-border flex flex-col flex-shrink-0">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-pos-card rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-pos-border">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Payment</h3>
              <button
                onClick={() => { setShowPayment(false); setCashReceived(""); }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6">
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
                    onClick={() => setPaymentMethod(id)}
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
                        "font-medium",
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
                    onClick={handlePayment}
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

              {/* Card / Split */}
              {(paymentMethod === "card" || paymentMethod === "split") && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {paymentMethod === "card" ? "Card Reader Required" : "Split Payment"}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {paymentMethod === "card"
                      ? "Please connect a card reader device."
                      : "Split payment functionality coming soon."}
                  </p>
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

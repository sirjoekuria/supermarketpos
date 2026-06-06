"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ScanLine, ShoppingCart, CreditCard, Banknote, Monitor, Search, X,
  Receipt, Loader2, CheckCircle2, AlertCircle, Smartphone, Split,
  LogOut, Moon, Sun, Menu, Gift, Lock, WifiOff, Wifi, RefreshCw, User,
} from "lucide-react";
import { useCartStore, useAuthStore, useUIStore, useSettingsStore, useProductStore, useBranchStore } from "@/store";
import ManagerAuth from "./ManagerAuth";
import { formatCurrency, generateReceiptNumber, debounce } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";
import BarcodeScanner from "./BarcodeScanner";
import Cart from "./Cart";
import MpesaPayment from "./MpesaPayment";
import ReceiptComponent from "./Receipt";
import CustomerDisplay from "./CustomerDisplay";
import ScanFeedback from "./ScanFeedback";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CompletedSale = any;

type SplitPaymentMethod = "cash" | "mpesa";

export default function POSScreen() {
  const {
    items, addItem: addCartItem, clearCart, getTotals,
    selectedCustomer, pointsRedeemed, setSelectedCustomer, setPointsRedeemed
  } = useCartStore();
  const { user, logout } = useAuthStore();
  const { darkMode, toggleDarkMode, customerDisplay, toggleCustomerDisplay, toggleSidebar } = useUIStore();
  const { settings } = useSettingsStore();
  const { products, isLoading, error: productsError, fetchProducts, subscribeToRealtime } = useProductStore();
  const { currentBranchId } = useBranchStore();

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
  });
  const [splitReferences, setSplitReferences] = useState<Record<"mpesa", string>>({
    mpesa: "",
  });
  const [error, setError] = useState("");
  const [mobileTab, setMobileTab] = useState<"products" | "cart">("products");
  const [showVoidAuth, setShowVoidAuth] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const getExpiryStatus = (product: Product) => {
    if (!product.expiry_date) return "none";
    const today = new Date(); today.setHours(0,0,0,0);
    const exp = new Date(product.expiry_date);
    if (exp < today) return "expired";
    const in30Days = new Date(today); in30Days.setDate(today.getDate() + 30);
    if (exp <= in30Days) return "expiring_soon";
    return "ok";
  };

  const tryAddItem = (product: Product) => {
    if (product.stock_quantity <= 0) {
      setError(`Cannot add ${product.name}. It is out of stock.`);
      setTimeout(() => setError(""), 5000);
      return false;
    }

    const cartItem = items.find(i => i.product.id === product.id);
    const currentQty = cartItem ? cartItem.quantity : 0;
    if (currentQty >= product.stock_quantity) {
      setError(`Cannot add more ${product.name}. Only ${product.stock_quantity} in stock.`);
      setTimeout(() => setError(""), 5000);
      return false;
    }

    const status = getExpiryStatus(product);
    if (status === "expired") {
      setError(`Cannot add ${product.name}. It expired on ${new Date(product.expiry_date!).toLocaleDateString("en-GB")}`);
      setTimeout(() => setError(""), 5000);
      return false;
    }
    addCartItem(product);
    return true;
  };

  // ── Checkout Loyalty Point Lookup State ─────────────────────────────────────
  const [checkoutPhone, setCheckoutPhone] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [showCheckoutQuickReg, setShowCheckoutQuickReg] = useState(false);
  const [checkoutNewName, setCheckoutNewName] = useState("");
  const [showLoyaltyPrompt, setShowLoyaltyPrompt] = useState(false);

  // ── Online / Offline detection ─────────────────────────────────────────────
  const [isOnline, setIsOnline] = useState(true);
  const [syncingOffline, setSyncingOffline] = useState(false);

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  // ── Auto-sync offline queue when network recovers ─────────────────────────
  const syncOfflineQueue = useCallback(async () => {
    const raw = localStorage.getItem("pos_offline_queue");
    if (!raw) return;
    let queue: any[] = [];
    try { queue = JSON.parse(raw); } catch { return; }
    if (!queue.length) return;

    setSyncingOffline(true);
    const failed: any[] = [];
    for (const payload of queue) {
      try {
        const res = await fetch("/api/sales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) failed.push(payload);
      } catch {
        failed.push(payload);
      }
    }
    localStorage.setItem("pos_offline_queue", JSON.stringify(failed));
    setSyncingOffline(false);
    if (failed.length === 0) {
      fetchProducts(); // refresh stock after sync
    }
  }, [fetchProducts]);

  useEffect(() => {
    if (isOnline) syncOfflineQueue();
  }, [isOnline, syncOfflineQueue]);

  // ── Pull-to-refresh ────────────────────────────────────────────────────────
  const pullStartY = useRef<number | null>(null);
  const [pullDelta, setPullDelta] = useState(0);
  const PULL_THRESHOLD = 70;

  const onTouchStart = (e: React.TouchEvent) => {
    // Only trigger at top of scroll
    const el = e.currentTarget as HTMLDivElement;
    if (el.scrollTop === 0) pullStartY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (pullStartY.current === null) return;
    const delta = Math.max(0, e.touches[0].clientY - pullStartY.current);
    setPullDelta(Math.min(delta, PULL_THRESHOLD * 1.5));
  };
  const onTouchEnd = () => {
    if (pullDelta >= PULL_THRESHOLD) fetchProducts();
    pullStartY.current = null;
    setPullDelta(0);
  };

  // ── Scan feedback state ────────────────────────────────────────────────
  const [scanFeedback, setScanFeedback] = useState<{
    show: boolean;
    type: "success" | "error";
    message: string;
    barcode: string;
  }>({
    show: false,
    type: "success",
    message: "",
    barcode: "",
  });
  const scanFeedbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  const totals = getTotals();
  const netTotal = totals.total - pointsRedeemed;

  const parseAmount = (value: string) => {
    const amount = Number(value);
    return Number.isFinite(amount) && amount > 0 ? amount : 0;
  };
  const splitPaidTotal = Math.round(
    parseAmount(splitPayments.cash) +
      parseAmount(splitPayments.mpesa)
  );
  const splitBalance = Math.max(netTotal - splitPaidTotal, 0);
  const splitChange = Math.max(splitPaidTotal - netTotal, 0);
  const splitBreakdown = (Object.entries(splitPayments) as [SplitPaymentMethod, string][])
    .map(([method, value]) => ({
      method,
      amount: parseAmount(value),
      reference:
        method === "mpesa"
          ? splitReferences[method].trim() || undefined
          : undefined,
    }))
    .filter((payment) => payment.amount > 0);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts, currentBranchId]);

  // Real-time sync: refresh stock when any device changes branch_stock or products
  useEffect(() => {
    const unsubscribe = subscribeToRealtime();
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "pos-cart") {
        useCartStore.persist.rehydrate();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    let barcodeBuffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.key) return; // guard against undefined key (virtual keyboards, extensions)
      // Don't capture keypresses when user is typing in a text field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
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

    // Helper: flash the ScanFeedback overlay
    const flash = (type: "success" | "error", msg: string) => {
      // Reset to false first so the component re-triggers even for duplicate barcodes
      if (scanFeedbackTimerRef.current) clearTimeout(scanFeedbackTimerRef.current);
      setScanFeedback({ show: false, type, message: msg, barcode });
      // Let one render pass before turning show on
      scanFeedbackTimerRef.current = setTimeout(() => {
        setScanFeedback({ show: true, type, message: msg, barcode });
      }, 10);
    };

    if (product) {
      const added = tryAddItem(product);
      if (added) {
        setError("");
        flash("success", `${product.name}`);
      } else {
        flash("error", `Expired: ${product.name}`);
      }
    } else {
      setError(`Product not found: ${barcode}`);
      flash("error", `Not found: ${barcode}`);
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

  const handleCheckoutPhoneLookup = async () => {
    if (!checkoutPhone.trim()) {
      setLookupError("Please enter a phone number.");
      return;
    }
    setIsLookingUp(true);
    setLookupError("");
    setShowCheckoutQuickReg(false);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(
        `/api/customers?search=${encodeURIComponent(checkoutPhone)}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
      const data = await response.json();
      if (response.ok) {
        // Phone match: exact digits or ends-with comparison (min 9 digits)
        const sanitizedSearch = checkoutPhone.replace(/\D/g, "");
        const matched = data.customers?.find((c: any) => {
          const sanitizedCustPhone = (c.phone || "").replace(/\D/g, "");
          return (
            sanitizedCustPhone === sanitizedSearch ||
            (sanitizedCustPhone.length >= 9 &&
              sanitizedSearch.length >= 9 &&
              sanitizedCustPhone.endsWith(sanitizedSearch))
          );
        });

        if (matched) {
          setSelectedCustomer(matched);
          setCheckoutPhone("");
          setLookupError("");
          setShowLoyaltyPrompt(false);
        } else {
          setLookupError("Customer not registered. Proceeding without points.");
        }
      } else {
        setLookupError(data.error || "Failed to search customer.");
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        setLookupError("Request timed out. Check your internet connection.");
      } else {
        setLookupError("Connection error. Please try again.");
      }
    } finally {
      setIsLookingUp(false);
    }
  };


  const handleCheckoutQuickRegSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutNewName.trim() || !checkoutPhone.trim()) {
      setLookupError("Name and phone are required.");
      return;
    }
    setIsLookingUp(true);
    setLookupError("");
    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: checkoutNewName, phone: checkoutPhone }),
      });
      const data = await response.json();
      if (response.ok) {
        setSelectedCustomer(data.customer);
        setCheckoutPhone("");
        setCheckoutNewName("");
        setShowCheckoutQuickReg(false);
        setLookupError("");
      } else {
        setLookupError(data.error || "Failed to register customer.");
      }
    } catch (err) {
      setLookupError("Connection error.");
    } finally {
      setIsLookingUp(false);
    }
  };

  const handlePayment = async (mpesaTransactionId?: string) => {
    if (items.length === 0) return;
    if (paymentMethod === "split" && splitPaidTotal < netTotal) {
      setError(`Split payment is short by ${formatCurrency(splitBalance)}`);
      return;
    }

    setIsProcessing(true);
    setError("");
    try {
      const receiptNum = generateReceiptNumber();
      const saleItems = items.map((item) => {
        const itemProfit = (item.product.price - (item.product.cost_price || 0)) * item.quantity - (item.discount || 0);
        return {
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.product.price,
          cost_price: item.product.cost_price || 0,
          subtotal: item.product.price * item.quantity,
          tax_amount: (item.product.price * item.quantity) * (item.product.tax_rate / 100),
          discount_amount: item.discount || 0,
          total: item.total,
          profit: itemProfit,
        };
      });

      const currentBranchId = useBranchStore.getState().currentBranchId;
      const totalProfit = saleItems.reduce((sum, item) => sum + item.profit, 0);
      const payload = {
        receipt_number: receiptNum,
        mpesa_transaction_id: mpesaTransactionId || null,
        subtotal: totals.subtotal,
        tax_amount: totals.taxAmount,
        discount_amount: totals.discountAmount + (pointsRedeemed * 1),
        total: netTotal,
        payment_method: paymentMethod,
        payment_status: "completed",
        items: saleItems,
        split_payments: paymentMethod === "split" ? splitBreakdown : undefined,
        customer_id: selectedCustomer?.id || null,
        points_redeemed: pointsRedeemed,
        actor: user ? { id: user.id, email: user.email, full_name: user.full_name, role: user.role } : undefined,
        branch_id: currentBranchId || null,
        total_profit: totalProfit,
      };

      // ── Offline mode or Instant Payment (Cash) optimistic execution ────
      const isInstantPayment = paymentMethod === "cash";

      if (!isOnline || isInstantPayment) {
        const raw = localStorage.getItem("pos_offline_queue") || "[]";
        const queue = JSON.parse(raw);
        
        // If actually offline, queue the payload right away
        if (!isOnline) {
          queue.push(payload);
          localStorage.setItem("pos_offline_queue", JSON.stringify(queue));
        }

        const optimisticPoints = selectedCustomer ? Math.floor(netTotal / 100) : 0;
        const newLoyaltyBalance = selectedCustomer
          ? (selectedCustomer.points_balance - pointsRedeemed + optimisticPoints)
          : undefined;
        const offlineSale = {
          id: `offline-${receiptNum}`,
          receipt_number: receiptNum,
          items: [...items],
          subtotal: totals.subtotal,
          tax_amount: totals.taxAmount,
          discount_amount: totals.discountAmount,
          total: netTotal,
          total_profit: totalProfit,
          payment_method: paymentMethod,
          payment_status: isOnline ? "completed" : "pending_sync",
          mpesa_transaction_id: mpesaTransactionId,
          split_payments: paymentMethod === "split" ? splitBreakdown : undefined,
          customer_id: selectedCustomer?.id || "",
          customer: selectedCustomer || undefined,
          points_earned: optimisticPoints,
          points_redeemed: pointsRedeemed,
          loyalty: selectedCustomer ? {
            points_earned: optimisticPoints,
            points_redeemed: pointsRedeemed,
            final_points_balance: newLoyaltyBalance,
          } : undefined,
          cashier_id: user?.id || "",
          cashier: user,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          offline: !isOnline,
        };

        setCompletedSale(offlineSale);
        setShowReceipt(true);
        clearCart();
        setShowPayment(false);
        setCashReceived("");
        setSplitPayments({ cash: "", mpesa: "" });
        setSplitReferences({ mpesa: "" });
        setMobileTab("products");

        // Fire API request in background if online
        if (isOnline) {
          fetch("/api/sales", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }).then(async (res) => {
            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              console.warn("Background checkout failed, saving offline:", errData.error);
              const curQueue = JSON.parse(localStorage.getItem("pos_offline_queue") || "[]");
              curQueue.push(payload);
              localStorage.setItem("pos_offline_queue", JSON.stringify(curQueue));
            } else {
              fetchProducts(); // Refresh stocks in background
            }
          }).catch((err) => {
            console.warn("Background checkout connection error, saving offline:", err);
            const curQueue = JSON.parse(localStorage.getItem("pos_offline_queue") || "[]");
            curQueue.push(payload);
            localStorage.setItem("pos_offline_queue", JSON.stringify(curQueue));
          });
        }

        setIsProcessing(false);
        return;
      }

      // ── Online mode (M-Pesa or Split): submit to server synchronously ──────
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
        total: netTotal,
        total_profit: totalProfit,
        payment_method: paymentMethod,
        payment_status: "completed",
        mpesa_transaction_id: mpesaTransactionId,
        split_payments: paymentMethod === "split" ? splitBreakdown : undefined,
        customer_id: selectedCustomer?.id || "",
        customer: selectedCustomer || undefined,
        points_earned: data.loyalty?.points_earned || 0,
        points_redeemed: pointsRedeemed,
        loyalty: data.loyalty || undefined,
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
      setSplitPayments({ cash: "", mpesa: "" });
      setSplitReferences({ mpesa: "" });
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
      ? parseFloat(cashReceived) - netTotal
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

      {/* Offline / Syncing Banner */}
      {(!isOnline || syncingOffline) && (
        <div className={cn(
          "flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold flex-shrink-0",
          !isOnline
            ? "bg-red-600 text-white"
            : "bg-amber-500 text-white"
        )}>
          {!isOnline ? (
            <><WifiOff className="w-3.5 h-3.5" /> Offline &mdash; Sales will be queued and synced when connection is restored.</>
          ) : (
            <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Syncing {JSON.parse(localStorage.getItem("pos_offline_queue") || "[]").length} offline sale(s)...</>
          )}
        </div>
      )}

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
            "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all border-b-2",
            mobileTab === "cart"
              ? "border-primary-500 text-primary-600 dark:text-primary-400"
              : "border-transparent text-gray-500 dark:text-gray-400"
          )}
        >
          <ShoppingCart className="w-4 h-4" />
          Cart
          {items.length > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-primary-500 text-white text-xs rounded-full font-bold">
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
                {searchResults.map((product) => {
                  const expiry = getExpiryStatus(product);
                  return (
                    <button
                      key={product.id}
                      onClick={() => {
                        const added = tryAddItem(product);
                        if (added) {
                          setSearchQuery("");
                          setSearchResults([]);
                        }
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 relative">
                        <span className="text-xs font-medium text-gray-500">{product.unit}</span>
                        {expiry === "expired" && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-600 rounded-full flex items-center justify-center text-[8px] font-bold text-white">!</span>
                        )}
                        {expiry === "expiring_soon" && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full flex items-center justify-center text-[8px] font-bold text-white">!</span>
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-gray-900 dark:text-white flex flex-wrap items-center gap-1.5">
                          {product.name}
                          {expiry === "expired" && (
                            <span className="text-[10px] text-red-600 font-bold bg-red-50 dark:bg-red-950/20 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-900">Expired</span>
                          )}
                          {expiry === "expiring_soon" && (
                            <span className="text-[10px] text-amber-600 font-bold bg-amber-50 dark:bg-amber-950/20 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900">Expiring Soon</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">{product.barcode}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary-600 dark:text-primary-400">
                          {formatCurrency(product.price)}
                        </p>
                        <p className="text-xs text-gray-400">Stock: {product.stock_quantity}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Product Grid */}
          <div
            className="flex-1 overflow-y-auto p-3 sm:p-4 relative"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {/* Pull-to-refresh indicator */}
            {pullDelta > 10 && (
              <div
                className="absolute top-0 left-0 right-0 flex items-center justify-center z-10 pointer-events-none transition-all"
                style={{ height: `${pullDelta * 0.6}px` }}
              >
                <div className={cn(
                  "flex items-center gap-2 text-xs font-semibold text-primary-600 dark:text-primary-400",
                  pullDelta >= PULL_THRESHOLD && "text-green-600 dark:text-green-400"
                )}>
                  <RefreshCw className={cn("w-4 h-4", pullDelta >= PULL_THRESHOLD && "animate-spin")} />
                  {pullDelta >= PULL_THRESHOLD ? "Release to refresh" : "Pull to refresh"}
                </div>
              </div>
            )}
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
                {products.map((product) => {
                  const expiry = getExpiryStatus(product);
                  return (
                    <button
                      key={product.id}
                      onClick={() => tryAddItem(product)}
                      className={cn(
                        "group bg-white dark:bg-pos-card border border-gray-200 dark:border-pos-border rounded-xl p-3 sm:p-4 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-lg transition-all active:scale-[0.97] text-left flex flex-col relative",
                        expiry === "expired" && "opacity-75"
                      )}
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
                          <div className="absolute inset-0 bg-white/60 dark:bg-black/60 flex items-center justify-center backdrop-blur-[1px] z-10">
                            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">Out of Stock</span>
                          </div>
                        )}
                        {expiry === "expired" && (
                          <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md z-10">
                            <AlertCircle className="w-3 h-3" />
                            <span>Expired</span>
                          </div>
                        )}
                        {expiry === "expiring_soon" && (
                          <div className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md z-10">
                            <AlertCircle className="w-3 h-3" />
                            <span>Expiring Soon</span>
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
                  );
                })}
              </div>
            )}
          </div>

          {/* Floating Checkout Bar on mobile when cart has items */}
          {items.length > 0 && (
            <div className="lg:hidden p-3 bg-white dark:bg-pos-card border-t border-gray-200 dark:border-pos-border flex-shrink-0">
              <button
                onClick={() => {
                  setSelectedCustomer(null);
                  setPointsRedeemed(0);
                  setCheckoutPhone("");
                  setLookupError("");
                  setShowCheckoutQuickReg(false);
                  setCheckoutNewName("");
                  setShowLoyaltyPrompt(false);
                  setShowPayment(true);
                }}
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
                onClick={() => {
                  setSelectedCustomer(null);
                  setPointsRedeemed(0);
                  setCheckoutPhone("");
                  setLookupError("");
                  setShowCheckoutQuickReg(false);
                  setCheckoutNewName("");
                  setShowLoyaltyPrompt(false);
                  setShowPayment(true);
                }}
                className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-lg transition-all active:scale-[0.98] shadow-lg shadow-primary-600/20 flex items-center justify-center gap-2"
              >
                <CreditCard className="w-5 h-5" />
                Checkout {formatCurrency(totals.total)}
              </button>
              <button
                onClick={() => setShowVoidAuth(true)}
                className="w-full py-2.5 text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300 text-sm font-medium transition-colors flex items-center justify-center gap-1"
                title="Requires manager authorization"
              >
                <Lock className="w-3.5 h-3.5" />
                Void Transaction
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-0 sm:p-4">
          <div className="bg-white dark:bg-[#121417] text-gray-900 dark:text-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-lg overflow-hidden max-h-[90vh] flex flex-col font-sans">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-6 px-6 pt-6 flex-shrink-0">
              <div className="w-8"></div>
              <h1 className="text-lg font-semibold tracking-wide">Payment</h1>
              <button 
                onClick={() => {
                  setShowPayment(false);
                  setCashReceived("");
                  setCheckoutPhone("");
                  setLookupError("");
                  setShowCheckoutQuickReg(false);
                  setCheckoutNewName("");
                  setShowLoyaltyPrompt(false);
                  setIsLookingUp(false);
                }}
                className="text-gray-500 hover:text-gray-900 dark:text-white dark:hover:opacity-70 transition-opacity p-2"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 flex flex-col space-y-6 pb-6 custom-scrollbar">
              
              {/* Net Amount Card */}
              <section className="px-6">
                <div 
                  className="rounded-3xl p-6 text-center text-gray-800 relative overflow-hidden" 
                  style={{ 
                    background: "linear-gradient(180deg, #ffffff 0%, #e8f5e9 100%)", 
                    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6), 0 0 40px rgba(76, 175, 80, 0.15)" 
                  }}
                >
                  <p className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-1 relative z-10">Net Amount Due</p>
                  <p className="text-5xl font-extrabold text-[#1b4332] relative z-10 font-mono">
                    {formatCurrency(netTotal)}
                  </p>
                  {pointsRedeemed > 0 && (
                    <p className="text-sm text-green-700 font-bold mt-2 flex items-center justify-center gap-1.5 relative z-10">
                      <Gift className="w-4 h-4" />
                      Points applied: -{formatCurrency(pointsRedeemed * 1)} ({pointsRedeemed} pts)
                    </p>
                  )}
                  {/* Decorative background circle */}
                  <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-green-500/10 rounded-full blur-2xl pointer-events-none"></div>
                  <div className="absolute -top-10 -left-10 w-32 h-32 bg-green-500/10 rounded-full blur-2xl pointer-events-none"></div>
                </div>
              </section>

              {/* LOYALTY SECTION INTEGRATION */}
              <section className="px-6">
                {selectedCustomer ? (
                  <div className="bg-amber-50 dark:bg-[#1c1e22] border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-amber-500 flex items-center gap-1.5">
                        <Gift className="w-4 h-4" />
                        Loyalty Rewards
                      </h4>
                      <span className="text-[10px] bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full font-bold">
                        {selectedCustomer.points_balance} pts available
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-normal">
                      {selectedCustomer.name} has {selectedCustomer.points_balance} points. <strong className="text-amber-500">1 Point = 1 KES.</strong> (Max: {Math.min(selectedCustomer.points_balance, Math.floor(totals.total * 0.5))} points).
                    </p>

                    {selectedCustomer.points_balance >= 100 ? (
                      <div className="space-y-3 pt-1">
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min="0"
                            max={Math.min(selectedCustomer.points_balance, Math.floor(totals.total * 0.5))}
                            placeholder="Points to redeem..."
                            value={pointsRedeemed || ""}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              const maxLimit = Math.min(selectedCustomer.points_balance, Math.floor(totals.total * 0.5));
                              if (val > maxLimit) {
                                setPointsRedeemed(maxLimit);
                              } else {
                                setPointsRedeemed(val);
                              }
                            }}
                            className="flex-1 px-3.5 py-2.5 text-sm bg-white dark:bg-[#121417] border border-amber-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white font-mono focus:outline-none focus:border-amber-500 transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const maxLimit = Math.min(selectedCustomer.points_balance, Math.floor(totals.total * 0.5));
                              setPointsRedeemed(pointsRedeemed === maxLimit ? 0 : maxLimit);
                            }}
                            className={cn(
                              "px-3.5 py-2.5 border rounded-xl text-xs font-bold transition-all flex-shrink-0 active:scale-95",
                              pointsRedeemed > 0
                                ? "bg-amber-600 border-amber-600 text-white shadow-md shadow-amber-600/20"
                                : "bg-white dark:bg-[#121417] border border-amber-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-[#1c1e22]"
                            )}
                          >
                            {pointsRedeemed > 0 ? "Reset" : "Redeem Max"}
                          </button>
                        </div>
                        {pointsRedeemed > 0 && pointsRedeemed < 100 && (
                          <p className="text-[10px] text-red-400 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Minimum redemption is 100 points.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-3 bg-amber-950/30 border border-amber-900/50 rounded-xl text-amber-400 text-xs">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        Balance is too low (Need {100 - selectedCustomer.points_balance} more).
                      </div>
                    )}
                  </div>
                ) : showLoyaltyPrompt ? (
                  <div className="bg-indigo-50 dark:bg-[#1c1e22] border border-indigo-200 dark:border-indigo-500/20 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-indigo-400 flex items-center gap-1.5">
                        <User className="w-4 h-4" />
                        Add Loyalty Points
                      </h4>
                      <button onClick={() => setShowLoyaltyPrompt(false)} className="text-gray-500 hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                          <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <input
                            type="tel"
                            placeholder="Phone number..."
                            value={checkoutPhone}
                            onChange={(e) => {
                              setCheckoutPhone(e.target.value);
                              setLookupError("");
                            }}
                            className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-white dark:bg-[#121417] border border-amber-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleCheckoutPhoneLookup}
                          disabled={isLookingUp}
                          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white rounded-xl text-xs font-bold transition-all flex-shrink-0 active:scale-95 flex items-center gap-1.5"
                        >
                          {isLookingUp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                          Lookup
                        </button>
                      </div>
                      {lookupError && (
                        <p className="text-[10px] text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> {lookupError}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <button
                      onClick={() => setShowLoyaltyPrompt(true)}
                      className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-full text-sm font-semibold transition-colors flex items-center gap-2"
                    >
                      <Gift className="w-4 h-4" /> Add Loyalty Points
                    </button>
                  </div>
                )}
              </section>

              {/* Payment Methods Grid */}
              <section className="grid grid-cols-2 gap-4 px-6">
                {[
                  { id: "cash", label: "Cash", icon: Banknote },
                  { id: "mpesa", label: "M-Pesa", icon: Smartphone },
                  { id: "split", label: "Split", icon: Split },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => {
                      setPaymentMethod(id);
                      setError("");
                    }}
                    className={cn(
                      "rounded-xl p-4 flex flex-col items-center justify-center transition-all",
                      paymentMethod === id
                        ? "bg-green-50 dark:bg-[#1c1e22] border-2 border-[#4caf50] text-[#4caf50]"
                        : "bg-gray-50 dark:bg-[#1c1e22] border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-[#4caf50] hover:text-[#4caf50] dark:hover:border-[#4caf50] dark:hover:text-[#4caf50]"
                    )}
                    style={paymentMethod === id ? { boxShadow: "0 0 25px rgba(76, 175, 80, 0.3)" } : {}}
                  >
                    <Icon className="w-6 h-6 mb-2" />
                    <span className={cn("text-sm", paymentMethod === id ? "font-semibold" : "font-medium")}>
                      {label}
                    </span>
                  </button>
                ))}
              </section>

              {/* Dynamic Payment Method View */}
              {paymentMethod === "cash" && (
                <section className="px-6 flex-grow flex flex-col">
                  <div className="bg-gray-50 dark:bg-[#1c1e22] rounded-2xl p-5 border border-gray-200 dark:border-gray-800 flex flex-col space-y-4">
                    <h2 className="text-[#4caf50] font-semibold text-sm uppercase tracking-wide">Cash Payment</h2>
                    {error && (
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-red-900/20 border border-red-500/30 rounded-xl text-red-400 text-sm">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {error}
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Cash Received
                      </label>
                      <input
                        type="number"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        placeholder="Enter amount..."
                        className="w-full px-4 py-4 bg-white dark:bg-[#121417] border border-amber-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white text-xl font-mono focus:outline-none focus:border-[#4caf50] transition-colors"
                        autoFocus
                      />
                    </div>
                    {cashChange > 0 && (
                      <div className="flex justify-between items-center p-4 bg-[#4caf50]/10 border border-[#4caf50]/20 rounded-xl">
                        <span className="text-[#4caf50] font-medium">Change Due</span>
                        <span className="text-2xl font-bold text-[#4caf50] font-mono">
                          {formatCurrency(cashChange)}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() => handlePayment()}
                      disabled={parseFloat(cashReceived) < netTotal || isProcessing}
                      className="w-full py-4 bg-gradient-to-b from-[#66bb6a] to-[#388e3c] hover:opacity-90 disabled:opacity-50 text-white rounded-3xl font-bold transition-transform active:scale-[0.98] shadow-[0_8px_15px_rgba(0,0,0,0.3)] mt-auto"
                    >
                      {isProcessing ? (
                        <span className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Processing...</span>
                      ) : (
                        <span className="flex items-center justify-center gap-2"><CheckCircle2 className="w-5 h-5" /> Complete Payment</span>
                      )}
                    </button>
                  </div>
                </section>
              )}

              {paymentMethod === "mpesa" && (
                <div className="px-6 flex-grow flex flex-col">
                  <MpesaPayment
                    amount={totals.total}
                    onSuccess={handleMpesaSuccess}
                    onFailure={handleMpesaFailure}
                    onCancel={() => setShowPayment(false)}
                  />
                </div>
              )}


              {paymentMethod === "split" && (
                <section className="px-6 flex-grow flex flex-col">
                  <div className="bg-gray-50 dark:bg-[#1c1e22] rounded-2xl p-5 border border-gray-200 dark:border-gray-800 space-y-4">
                    <h2 className="text-[#4caf50] font-semibold text-sm uppercase tracking-wide mb-2">Split Payment</h2>
                    
                    {error && (
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-red-900/20 border border-red-500/30 rounded-xl text-red-400 text-sm">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {error}
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-3 text-center mb-4">
                      <div className="rounded-xl bg-white dark:bg-[#121417] p-3 border border-gray-200 dark:border-gray-800">
                        <p className="text-xs text-gray-500">Paid</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(splitPaidTotal)}</p>
                      </div>
                      <div className="rounded-xl bg-white dark:bg-[#121417] p-3 border border-gray-200 dark:border-gray-800">
                        <p className="text-xs text-gray-500">Balance</p>
                        <p className={cn("text-sm font-bold", splitBalance > 0 ? "text-orange-400" : "text-[#4caf50]")}>
                          {formatCurrency(splitBalance)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white dark:bg-[#121417] p-3 border border-gray-200 dark:border-gray-800">
                        <p className="text-xs text-gray-500">Change</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(splitChange)}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {[
                        { method: "cash" as const, label: "Cash", icon: Banknote },
                        { method: "mpesa" as const, label: "M-Pesa", icon: Smartphone },
                      ].map(({ method, label, icon: Icon }) => {
                        const otherPaid = splitPaidTotal - parseAmount(splitPayments[method]);
                        const remainingForMethod = Math.max(totals.total - otherPaid, 0);

                        return (
                          <div key={method} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#121417] p-4 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300">
                                <Icon className="w-4 h-4 text-gray-500" />
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
                                className="text-xs font-bold text-[#4caf50] hover:text-[#388e3c] transition-colors"
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
                              className="w-full px-4 py-3 bg-gray-50 dark:bg-[#1c1e22] border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white text-lg font-mono focus:outline-none focus:border-[#4caf50] transition-colors"
                            />
                            {method === "mpesa" && (
                              <input
                                type="text"
                                value={splitReferences[method]}
                                onChange={(e) =>
                                  setSplitReferences((current) => ({ ...current, [method]: e.target.value }))
                                }
                                placeholder="M-Pesa code"
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#1c1e22] border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white text-sm focus:outline-none focus:border-[#4caf50] transition-colors"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => handlePayment()}
                      disabled={splitPaidTotal < netTotal || isProcessing}
                      className="w-full py-4 mt-4 bg-gradient-to-b from-[#66bb6a] to-[#388e3c] hover:opacity-90 disabled:opacity-50 text-white rounded-3xl font-bold transition-transform active:scale-[0.98] shadow-[0_8px_15px_rgba(0,0,0,0.3)]"
                    >
                      {isProcessing ? (
                        <span className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Processing...</span>
                      ) : (
                        <span className="flex items-center justify-center gap-2"><CheckCircle2 className="w-5 h-5" /> Complete Split Payment</span>
                      )}
                    </button>
                  </div>
                </section>
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

      <ManagerAuth
        isOpen={showVoidAuth}
        onClose={() => setShowVoidAuth(false)}
        onAuthorize={() => {
          clearCart();
          setShowVoidAuth(false);
          setMobileTab("products");
        }}
        action="Void entire transaction"
      />
      {customerDisplay && <CustomerDisplay />}

      {/* ── Barcode scan audio-visual feedback overlay ── */}
      <ScanFeedback
        show={scanFeedback.show}
        type={scanFeedback.type}
        message={scanFeedback.message}
        barcode={scanFeedback.barcode}
        duration={850}
        position="top"
        enableSound={true}
        onAnimationComplete={() =>
          setScanFeedback((prev) => ({ ...prev, show: false }))
        }
      />
    </div>
  );
}


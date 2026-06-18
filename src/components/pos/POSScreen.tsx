"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ScanLine, ShoppingCart, CreditCard, Banknote, Monitor, Search, X,
  Receipt, Loader2, CheckCircle2, AlertCircle, Smartphone, Split,
  LogOut, Moon, Sun, Menu, Gift, Lock, WifiOff, Wifi, RefreshCw, User,
  Phone, XCircle
} from "lucide-react";
import { useCartStore, useAuthStore, useUIStore, useSettingsStore, useProductStore, useBranchStore, useShiftStore } from "@/store";
import { formatCurrency, generateReceiptNumber, debounce } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";
import dynamic from "next/dynamic";
import Cart from "./Cart";
import ScanFeedback from "./ScanFeedback";

// Lazy-load heavy, conditionally-rendered components to speed up initial page load
const ManagerAuth = dynamic(() => import("./ManagerAuth"), { ssr: false });
const BarcodeScanner = dynamic(() => import("./BarcodeScanner"), { ssr: false });
const MpesaPayment = dynamic(() => import("./MpesaPayment"), { ssr: false });
const ReceiptComponent = dynamic(() => import("./Receipt"), { ssr: false });
const CustomerDisplay = dynamic(() => import("./CustomerDisplay"), { ssr: false });

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
  const [splitMpesaPhone, setSplitMpesaPhone] = useState("");
  const [splitMpesaStatus, setSplitMpesaStatus] = useState<"idle" | "initiating" | "pending" | "success" | "failed">("idle");
  const [splitMpesaCountdown, setSplitMpesaCountdown] = useState(60);
  const [splitMpesaCheckoutRequestId, setSplitMpesaCheckoutRequestId] = useState("");
  const [splitMpesaError, setSplitMpesaError] = useState("");
  const [error, setError] = useState("");
  const [mobileTab, setMobileTab] = useState<"products" | "cart">("products");
  const [showVoidAuth, setShowVoidAuth] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { activeShift, openShift, closeShift } = useShiftStore();
  const [showCloseShift, setShowCloseShift] = useState(false);
  const [shiftCashInput, setShiftCashInput] = useState("");
  const [shiftError, setShiftError] = useState("");

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
  const [redeemPointsInput, setRedeemPointsInput] = useState("");
  const [redeemError, setRedeemError] = useState("");

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
    imageUrl?: string;
  }>({
    show: false,
    type: "success",
    message: "",
    barcode: "",
    imageUrl: undefined,
  });
  const scanFeedbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  const totals = getTotals();
  const netTotal = totals.total - pointsRedeemed;
  const maxRedeemPoints = selectedCustomer
    ? Math.min(selectedCustomer.points_balance, Math.floor(totals.subtotal * 0.5))
    : 0;

  const handleApplyRedeemPoints = () => {
    const points = parseInt(redeemPointsInput, 10);
    if (!selectedCustomer) return;
    if (!Number.isFinite(points) || points <= 0) {
      setRedeemError("Enter a valid number of points.");
      return;
    }
    if (points < 100) {
      setRedeemError("Minimum redemption is 100 points.");
      return;
    }
    if (points > selectedCustomer.points_balance) {
      setRedeemError(`Insufficient balance. Available: ${selectedCustomer.points_balance} pts.`);
      return;
    }
    if (points > maxRedeemPoints) {
      setRedeemError(`Maximum redeemable: ${maxRedeemPoints} pts (50% of order).`);
      return;
    }
    setPointsRedeemed(points);
    setRedeemError("");
    setRedeemPointsInput("");
    setShowLoyaltyPrompt(false);
  };

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
    if (selectedCustomer) {
      setSplitMpesaPhone(selectedCustomer.phone || "");
    } else {
      setSplitMpesaPhone("");
    }
  }, [selectedCustomer]);

  const validateSplitPhone = (phoneStr: string): boolean => {
    const cleaned = phoneStr.replace(/\D/g, "");
    return cleaned.length >= 9 && cleaned.length <= 12;
  };

  const formatSplitPhoneForAPI = (phoneStr: string): string => {
    const cleaned = phoneStr.replace(/\D/g, "");
    if (cleaned.startsWith("254")) return cleaned;
    if (cleaned.startsWith("0")) return "254" + cleaned.substring(1);
    if (cleaned.startsWith("7")) return "254" + cleaned;
    return cleaned;
  };

  const initiateSplitSTKPush = async () => {
    const mpesaAmount = parseAmount(splitPayments.mpesa);
    if (mpesaAmount < 1) {
      setSplitMpesaError("M-Pesa amount must be at least KES 1");
      return;
    }
    if (!validateSplitPhone(splitMpesaPhone)) {
      setSplitMpesaError("Please enter a valid Safaricom phone number");
      return;
    }
    setSplitMpesaStatus("initiating");
    setSplitMpesaError("");
    try {
      const response = await fetch("/api/mpesa/stkpush", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: formatSplitPhoneForAPI(splitMpesaPhone),
          amount: mpesaAmount,
          accountReference: `SPLIT-${Date.now()}`,
          transactionDesc: "Split Payment M-Pesa",
        }),
      });
      const data = await response.json();
      if (data.success && data.checkoutRequestId) {
        setSplitMpesaCheckoutRequestId(data.checkoutRequestId);
        setSplitMpesaStatus("pending");
        setSplitMpesaCountdown(60);
      } else {
        throw new Error(data.message || "Failed to initiate payment");
      }
    } catch (err: any) {
      const msg = err.message || "Failed to initiate M-Pesa payment";
      setSplitMpesaStatus("failed");
      setSplitMpesaError(msg);
    }
  };

  // Polling for split payment STK status
  useEffect(() => {
    if (splitMpesaStatus !== "pending" || !splitMpesaCheckoutRequestId) return;

    let active = true;
    let timeoutId: NodeJS.Timeout;
    let countdownTimer: NodeJS.Timeout;
    const pollStart = Date.now();

    const finishSuccess = (receipt: string) => {
      if (!active) return;
      active = false;
      clearTimeout(timeoutId);
      clearInterval(countdownTimer);
      setSplitMpesaStatus("success");
      
      // Auto-populate M-Pesa code reference in split references
      setSplitReferences((current) => ({
        ...current,
        mpesa: receipt,
      }));
    };

    const finishFailure = (message: string) => {
      if (!active) return;
      active = false;
      clearTimeout(timeoutId);
      clearInterval(countdownTimer);
      setSplitMpesaStatus("failed");
      setSplitMpesaError(message);
    };

    const checkStatus = async () => {
      if (!active) return;
      const elapsed = (Date.now() - pollStart) / 1000;
      try {
        const response = await fetch(
          `/api/mpesa/query?checkoutRequestId=${encodeURIComponent(splitMpesaCheckoutRequestId)}&elapsed=${elapsed.toFixed(1)}`,
          { cache: "no-store" }
        );
        const data = await response.json();
        if (!active) return;

        if (data.status === "success") {
          finishSuccess(data.mpesaReceiptNumber || "");
          return;
        }
        if (data.status === "failed") {
          finishFailure(data.message || "Payment failed");
          return;
        }
      } catch (err) {
        console.error("Split M-Pesa status check error:", err);
      }

      if (active) {
        const nextInterval = elapsed < 15 ? 200 : 500;
        timeoutId = setTimeout(checkStatus, nextInterval);
      }
    };

    checkStatus();

    countdownTimer = setInterval(() => {
      setSplitMpesaCountdown((prev) => {
        if (prev <= 1) {
          finishFailure("Payment timed out. Customer did not enter their PIN within 60 seconds.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      active = false;
      clearTimeout(timeoutId);
      clearInterval(countdownTimer);
    };
  }, [splitMpesaStatus, splitMpesaCheckoutRequestId]);

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
    const trimmed = barcode.trim();
    const product = products.find(
      (p) => p.barcode === trimmed || p.barcode.endsWith(trimmed) || trimmed.endsWith(p.barcode)
    );

    const flash = (type: "success" | "error", msg: string, imageUrl?: string) => {
      if (scanFeedbackTimerRef.current) clearTimeout(scanFeedbackTimerRef.current);
      setScanFeedback({ show: false, type, message: msg, barcode: trimmed, imageUrl });
      scanFeedbackTimerRef.current = setTimeout(() => {
        setScanFeedback({ show: true, type, message: msg, barcode: trimmed, imageUrl });
      }, 10);
    };

    if (product) {
      const added = tryAddItem(product);
      if (added) {
        setError("");
        flash("success", product.name, product.image_url);
      } else {
        flash("error", `Expired: ${product.name}`, product.image_url);
      }
    } else {
      setError(`Product not found: ${trimmed}`);
      flash("error", `Not found: ${trimmed}`);
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
          setShowCheckoutQuickReg(false);
          setShowLoyaltyPrompt(false);
        } else {
          setLookupError("Customer not found.");
          setShowCheckoutQuickReg(true);
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
        setShowLoyaltyPrompt(false);
      } else {
        setLookupError(data.error || "Failed to register customer.");
      }
    } catch (err) {
      setLookupError("Connection error.");
    } finally {
      setIsLookingUp(false);
    }
  };

  const getPaymentTenderDetails = () => {
    if (paymentMethod === "cash" && cashReceived) {
      const tendered = parseFloat(cashReceived) || 0;
      return { cash_tendered: tendered, change_due: Math.max(tendered - netTotal, 0) };
    }
    if (paymentMethod === "split") {
      return { cash_tendered: splitPaidTotal, change_due: splitChange };
    }
    return { cash_tendered: undefined, change_due: 0 };
  };

  const handlePayment = async (mpesaTransactionId?: string) => {
    if (items.length === 0) return;
    if (paymentMethod === "split" && splitPaidTotal < netTotal) {
      setError(`Split payment is short by ${formatCurrency(splitBalance)}`);
      return;
    }

    const tenderDetails = getPaymentTenderDetails();
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

      // ── Optimistic checkout: cash & confirmed M-Pesa show receipt immediately ────
      const isInstantPayment = paymentMethod === "cash" || paymentMethod === "mpesa";

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
          customer: selectedCustomer
            ? { ...selectedCustomer, points_balance: newLoyaltyBalance ?? selectedCustomer.points_balance }
            : undefined,
          points_earned: optimisticPoints,
          points_redeemed: pointsRedeemed,
          loyalty: selectedCustomer ? {
            points_earned: optimisticPoints,
            points_redeemed: pointsRedeemed,
            final_points_balance: newLoyaltyBalance,
          } : undefined,
          cash_tendered: tenderDetails.cash_tendered,
          change_due: tenderDetails.change_due,
          cashier_id: user?.id || "",
          cashier: user,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          offline: !isOnline,
        };

        setCompletedSale(offlineSale);

        // Trigger Loyalty SMS (Offline/Optimistic)
        if (settings?.sms_loyalty_enabled && selectedCustomer && (optimisticPoints > 0 || pointsRedeemed > 0)) {
          fetch("/api/sms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: selectedCustomer.phone,
              message: `Hi ${selectedCustomer.name.split(" ")[0]}, you earned ${optimisticPoints} pts and redeemed ${pointsRedeemed} pts. New Balance: ${newLoyaltyBalance} pts. Thank you for shopping with ${settings.shop_name || "us"}!`,
              apiKey: settings.sms_api_key,
              username: settings.sms_username,
            }),
          }).catch((err) => console.error("SMS Error:", err));
        }

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
        customer: selectedCustomer && data.loyalty
          ? { ...selectedCustomer, points_balance: data.loyalty.final_points_balance }
          : selectedCustomer || undefined,
        points_earned: data.loyalty?.points_earned || 0,
        points_redeemed: pointsRedeemed,
        loyalty: data.loyalty || undefined,
        cash_tendered: tenderDetails.cash_tendered,
        change_due: tenderDetails.change_due,
        cashier_id: user?.id || "",
        cashier: user,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setCompletedSale(sale);

      // Trigger Loyalty SMS (Online)
      if (settings?.sms_loyalty_enabled && selectedCustomer && (data.loyalty?.points_earned > 0 || pointsRedeemed > 0)) {
        fetch("/api/sms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: selectedCustomer.phone,
            message: `Hi ${selectedCustomer.name.split(" ")[0]}, you earned ${data.loyalty.points_earned} pts and redeemed ${pointsRedeemed} pts. New Balance: ${data.loyalty.final_points_balance} pts. Thank you for shopping with ${settings.shop_name || "us"}!`,
            apiKey: settings.sms_api_key,
            username: settings.sms_username,
          }),
        }).catch((err) => console.error("SMS Error:", err));
      }

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
          {activeShift && (
            <button
              onClick={() => setShowCloseShift(true)}
              className="hidden sm:flex p-2.5 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 text-gray-500 dark:text-gray-400 hover:text-amber-500 transition-colors items-center gap-2"
              title="Close Shift"
            >
              <Lock className="w-5 h-5" />
            </button>
          )}
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
        
        {/* Shift Management Modals */}
        {!activeShift && user?.role !== "admin" && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-pos-card rounded-3xl shadow-xl max-w-md w-full p-6 text-center space-y-4 relative">
               <button onClick={logout} className="absolute top-4 right-4 text-gray-400 hover:text-red-500"><LogOut className="w-5 h-5"/></button>
               <Lock className="w-12 h-12 text-primary-500 mx-auto" />
               <h2 className="text-xl font-bold text-gray-900 dark:text-white">Shift Closed</h2>
               <p className="text-sm text-gray-500 dark:text-gray-400">Please open a new shift to start processing sales.</p>
               {shiftError && <p className="text-xs text-red-500">{shiftError}</p>}
               <div className="text-left mt-4">
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Starting Cash in Drawer</label>
                 <input 
                   type="number" 
                   value={shiftCashInput} 
                   onChange={(e) => setShiftCashInput(e.target.value)}
                   placeholder="0.00"
                   className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-gray-900 dark:text-white text-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary-500" 
                 />
               </div>
               <button 
                 onClick={async () => {
                   setIsProcessing(true);
                   try {
                     setShiftError("");
                     await openShift(user!.id, parseFloat(shiftCashInput) || 0, currentBranchId || undefined);
                     setShiftCashInput("");
                   } catch (err: any) {
                     setShiftError(err.message);
                   } finally {
                     setIsProcessing(false);
                   }
                 }}
                 disabled={!user || isProcessing}
                 className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold flex items-center justify-center gap-2"
               >
                 {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Open Shift"}
               </button>
            </div>
          </div>
        )}

        {/* Close Shift Modal */}
        {showCloseShift && activeShift && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-pos-card rounded-3xl shadow-xl max-w-md w-full p-6 text-center space-y-4 relative">
               <button onClick={() => setShowCloseShift(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"><X className="w-5 h-5"/></button>
               <Lock className="w-12 h-12 text-amber-500 mx-auto" />
               <h2 className="text-xl font-bold text-gray-900 dark:text-white">Close Shift</h2>
               <p className="text-sm text-gray-500 dark:text-gray-400">Count the physical cash in your drawer and enter it below.</p>
               {shiftError && <p className="text-xs text-red-500">{shiftError}</p>}
               <div className="text-left mt-4">
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Actual Cash in Drawer</label>
                 <input 
                   type="number" 
                   value={shiftCashInput} 
                   onChange={(e) => setShiftCashInput(e.target.value)}
                   placeholder="0.00"
                   className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-gray-900 dark:text-white text-lg font-mono focus:outline-none focus:ring-2 focus:ring-amber-500" 
                 />
               </div>
               <button 
                 onClick={async () => {
                   setIsProcessing(true);
                   try {
                     setShiftError("");
                     await closeShift(activeShift.id, parseFloat(shiftCashInput) || 0);
                     setShiftCashInput("");
                     setShowCloseShift(false);
                     logout(); // Typically log out after shift closes
                   } catch (err: any) {
                     setShiftError(err.message);
                   } finally {
                     setIsProcessing(false);
                   }
                 }}
                 disabled={!user || isProcessing || shiftCashInput === ""}
                 className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold flex items-center justify-center gap-2"
               >
                 {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Close Shift"}
               </button>
            </div>
          </div>
        )}

        {/* Left Panel — Product Grid */}
        <div
          className={cn(
            "flex-1 flex flex-col min-w-0 lg:w-1/2 lg:max-w-[50%]",
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
                  setCheckoutPhone("");
                  setLookupError("");
                  setShowCheckoutQuickReg(false);
                  setCheckoutNewName("");
                  setRedeemError("");
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
            "w-full lg:w-1/2 lg:min-w-[50%] bg-white dark:bg-pos-card border-l border-gray-200 dark:border-pos-border flex flex-col flex-shrink-0",
            // On mobile: show only if "cart" tab is selected
            mobileTab !== "cart" ? "hidden lg:flex" : "flex"
          )}
        >
          <Cart />
          {items.length > 0 && (
            <div className="p-4 border-t border-gray-200 dark:border-pos-border space-y-3 flex-shrink-0">
              <button
                onClick={() => {
                  setCheckoutPhone("");
                  setLookupError("");
                  setShowCheckoutQuickReg(false);
                  setCheckoutNewName("");
                  setRedeemError("");
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

      {/* Payment — full screen on desktop, bottom sheet on mobile */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-stretch justify-center lg:justify-stretch bg-black/60 lg:bg-[#0f1117] backdrop-blur-md lg:backdrop-blur-none p-0">
          <div className="bg-white dark:bg-[#0f1117] text-gray-900 dark:text-white rounded-t-3xl lg:rounded-none shadow-2xl lg:shadow-none w-full lg:max-w-none h-[95vh] lg:h-full max-h-[95vh] lg:max-h-none overflow-hidden flex flex-col font-sans">
            
            {/* Header */}
            <div className="flex justify-between items-center px-6 lg:px-10 pt-5 lg:pt-6 pb-3 lg:pb-4 flex-shrink-0 border-b border-gray-100 dark:border-gray-800">
              <div className="w-8 lg:hidden"></div>
              <h1 className="text-lg lg:text-2xl font-semibold tracking-wide text-gray-900 dark:text-white lg:flex-1 lg:text-left">Payment</h1>
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
                className="text-gray-400 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white transition-colors p-2"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Two-Column Layout: Left (Amount + Methods) | Right (Payment Details) */}
            <div className="flex-1 overflow-hidden min-h-0">
              <div className="flex flex-col lg:flex-row h-full min-h-0">
                
                {/* LEFT COLUMN — Amount + Payment Methods */}
                <div className="lg:w-[420px] xl:w-[480px] flex-shrink-0 p-5 lg:p-8 space-y-5 lg:space-y-6 border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-gray-800 overflow-y-auto">
                  
                  {/* Net Amount Due Card */}
                  <div className="rounded-2xl p-6 lg:p-8 text-center relative overflow-hidden bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-700/50 shadow-lg">
                    <p className="text-xs lg:text-sm font-bold tracking-widest uppercase text-gray-500 dark:text-gray-400 mb-2">Net Amount Due</p>
                    <p className="text-4xl lg:text-6xl font-extrabold text-[#0d7a3e] dark:text-[#4ade80] font-mono">
                      {formatCurrency(netTotal)}
                    </p>
                    {pointsRedeemed > 0 && (
                      <p className="text-xs text-green-600 dark:text-green-400 font-bold mt-2 flex items-center justify-center gap-1.5">
                        <Gift className="w-3.5 h-3.5" />
                        Points: -{formatCurrency(pointsRedeemed)} ({pointsRedeemed} pts)
                      </p>
                    )}
                  </div>

                  {/* Loyalty Points */}
                  <div className="flex justify-center">
                    {selectedCustomer ? (
                      <div className="w-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-xl p-3 space-y-2">
                        <div className="text-center">
                          <p className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1.5">
                            <User className="w-3.5 h-3.5" />
                            {selectedCustomer.name}
                          </p>
                          <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                            {selectedCustomer.points_balance} pts available
                          </p>
                          {pointsRedeemed > 0 && (
                            <p className="text-xs text-green-600 dark:text-green-400 font-bold mt-1">
                              Redeemed: {pointsRedeemed} pts (-{formatCurrency(pointsRedeemed)})
                            </p>
                          )}
                        </div>
                        {pointsRedeemed === 0 && maxRedeemPoints >= 100 && (
                          <div className="space-y-1.5">
                            <input
                              type="number"
                              min={100}
                              max={maxRedeemPoints}
                              value={redeemPointsInput}
                              onChange={(e) => { setRedeemPointsInput(e.target.value); setRedeemError(""); }}
                              placeholder={`Redeem pts (max ${maxRedeemPoints})`}
                              className="w-full px-3 py-2 bg-white dark:bg-[#0f1117] border border-amber-200 dark:border-amber-700/50 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:border-amber-400"
                            />
                            <button
                              onClick={handleApplyRedeemPoints}
                              className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors"
                            >
                              Apply Points Discount
                            </button>
                          </div>
                        )}
                        {redeemError && (
                          <p className="text-xs text-red-500 text-center">{redeemError}</p>
                        )}
                        <div className="flex gap-2">
                          {pointsRedeemed > 0 && (
                            <button
                              onClick={() => { setPointsRedeemed(0); setRedeemPointsInput(""); }}
                              className="flex-1 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:underline"
                            >
                              Clear redemption
                            </button>
                          )}
                          <button
                            onClick={() => { setSelectedCustomer(null); setPointsRedeemed(0); setRedeemPointsInput(""); setRedeemError(""); }}
                            className="flex-1 py-1.5 text-xs font-semibold text-gray-500 hover:underline"
                          >
                            Remove customer
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setShowLoyaltyPrompt(true); setLookupError(""); setShowCheckoutQuickReg(false); }}
                        className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-500 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700/30 rounded-full text-sm font-semibold transition-colors flex items-center gap-2"
                      >
                        <Gift className="w-4 h-4" /> Add Loyalty Points
                      </button>
                    )}
                  </div>

                  {/* Payment Method Buttons — 2x2 Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: "cash", label: "Cash", icon: Banknote },
                      { id: "mpesa", label: "M-Pesa", icon: Smartphone },
                      { id: "card", label: "Card", icon: CreditCard },
                      { id: "split", label: "Split", icon: Split },
                    ].map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        onClick={() => { setPaymentMethod(id); setError(""); }}
                        className={cn(
                          "rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all border-2",
                          paymentMethod === id
                            ? "bg-green-50 dark:bg-green-900/20 border-[#0d7a3e] dark:border-[#4ade80] text-[#0d7a3e] dark:text-[#4ade80] shadow-[0_0_20px_rgba(76,175,80,0.15)] dark:shadow-[0_0_20px_rgba(74,222,128,0.2)]"
                            : "bg-white dark:bg-[#1a1f2e] border-gray-200 dark:border-gray-700/50 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
                        )}
                      >
                        <Icon className="w-7 h-7" />
                        <span className="text-sm font-medium">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* RIGHT COLUMN — Payment Details */}
                <div className="flex-1 p-5 lg:p-8 min-h-0 overflow-y-auto flex flex-col">
                  
                  {/* Cash Payment */}
                  {paymentMethod === "cash" && (
                    <div className="h-full flex flex-col">
                      <div className="bg-gray-50 dark:bg-[#1a1f2e] rounded-2xl p-5 border border-gray-200 dark:border-gray-700/50 flex flex-col space-y-4 flex-1">
                        <h2 className="text-[#0d7a3e] dark:text-[#4ade80] font-semibold text-sm uppercase tracking-wide">Cash Payment</h2>
                        {error && (
                          <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl text-red-500 dark:text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                          </div>
                        )}
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Cash Received</label>
                          <input
                            type="number"
                            value={cashReceived}
                            onChange={(e) => setCashReceived(e.target.value)}
                            placeholder="Enter amount..."
                            className="w-full px-4 py-4 bg-white dark:bg-[#0f1117] border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white text-xl font-mono focus:outline-none focus:border-[#0d7a3e] dark:focus:border-[#4ade80] transition-colors"
                            autoFocus
                          />
                        </div>
                        {cashChange > 0 && (
                          <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-xl">
                            <span className="text-[#0d7a3e] dark:text-[#4ade80] font-medium">Change Due</span>
                            <span className="text-2xl font-bold text-[#0d7a3e] dark:text-[#4ade80] font-mono">
                              {formatCurrency(cashChange)}
                            </span>
                          </div>
                        )}
                        <button
                          onClick={() => handlePayment()}
                          disabled={parseFloat(cashReceived) < netTotal || isProcessing}
                          className="w-full py-4 bg-[#0d7a3e] dark:bg-[#4ade80] hover:bg-[#0a6332] dark:hover:bg-[#22c55e] disabled:opacity-50 text-white dark:text-[#0f1117] rounded-2xl font-bold transition-all active:scale-[0.98] shadow-lg mt-auto"
                        >
                          {isProcessing ? (
                            <span className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Processing...</span>
                          ) : (
                            <span className="flex items-center justify-center gap-2"><CheckCircle2 className="w-5 h-5" /> Complete Payment</span>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* M-Pesa Payment */}
                  {paymentMethod === "mpesa" && (
                    <div className="h-full">
                      <MpesaPayment
                        amount={netTotal}
                        onSuccess={handleMpesaSuccess}
                        onFailure={handleMpesaFailure}
                        onCancel={() => setShowPayment(false)}
                      />
                    </div>
                  )}

                  {/* Card Payment */}
                  {paymentMethod === "card" && (
                    <div className="h-full flex flex-col">
                      <div className="bg-gray-50 dark:bg-[#1a1f2e] rounded-2xl p-5 border border-gray-200 dark:border-gray-700/50 flex flex-col space-y-4 flex-1">
                        <h2 className="text-[#0d7a3e] dark:text-[#4ade80] font-semibold text-sm uppercase tracking-wide">Card Payment</h2>
                        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                          <CreditCard className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                          <p className="text-gray-500 dark:text-gray-400 font-medium mb-2">Card Terminal</p>
                          <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs">
                            Please use the connected card terminal to process this payment of <strong>{formatCurrency(netTotal)}</strong>
                          </p>
                        </div>
                        <button
                          onClick={() => handlePayment()}
                          disabled={isProcessing}
                          className="w-full py-4 bg-[#0d7a3e] dark:bg-[#4ade80] hover:bg-[#0a6332] dark:hover:bg-[#22c55e] disabled:opacity-50 text-white dark:text-[#0f1117] rounded-2xl font-bold transition-all active:scale-[0.98] shadow-lg mt-auto"
                        >
                          {isProcessing ? (
                            <span className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Processing...</span>
                          ) : (
                            <span className="flex items-center justify-center gap-2"><CheckCircle2 className="w-5 h-5" /> Confirm Card Payment</span>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Split Payment */}
                  {paymentMethod === "split" && (
                    <div className="h-full flex flex-col">
                      <div className="bg-gray-50 dark:bg-[#1a1f2e] rounded-2xl p-5 border border-gray-200 dark:border-gray-700/50 space-y-4 flex-1">
                        <h2 className="text-[#0d7a3e] dark:text-[#4ade80] font-semibold text-sm uppercase tracking-wide">Split Payment</h2>
                        
                        {error && (
                          <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl text-red-500 dark:text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div className="rounded-xl bg-white dark:bg-[#0f1117] p-3 border border-gray-200 dark:border-gray-700/50">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Paid</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(splitPaidTotal)}</p>
                          </div>
                          <div className="rounded-xl bg-white dark:bg-[#0f1117] p-3 border border-gray-200 dark:border-gray-700/50">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Balance</p>
                            <p className={cn("text-sm font-bold", splitBalance > 0 ? "text-orange-500 dark:text-orange-400" : "text-[#0d7a3e] dark:text-[#4ade80]")}>
                              {formatCurrency(splitBalance)}
                            </p>
                          </div>
                          <div className="rounded-xl bg-white dark:bg-[#0f1117] p-3 border border-gray-200 dark:border-gray-700/50">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Change</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(splitChange)}</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {[
                            { method: "cash" as const, label: "Cash", icon: Banknote },
                            { method: "mpesa" as const, label: "M-Pesa", icon: Smartphone },
                          ].map(({ method, label, icon: Icon }) => {
                            const otherPaid = splitPaidTotal - parseAmount(splitPayments[method]);
                            const remainingForMethod = Math.max(netTotal - otherPaid, 0);

                            return (
                              <div key={method} className="rounded-xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#0f1117] p-4 space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                  <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300">
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
                                    className="text-xs font-bold text-[#0d7a3e] dark:text-[#4ade80] hover:opacity-80 transition-opacity"
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
                                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white text-lg font-mono focus:outline-none focus:border-[#0d7a3e] dark:focus:border-[#4ade80] transition-colors"
                                />
                                {method === "mpesa" && (
                                  <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                                    {parseAmount(splitPayments.mpesa) > 0 && (
                                      <div className="space-y-2 bg-gray-50 dark:bg-[#1a1f2e]/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                                        <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                          STK Push Verification
                                        </div>

                                        {splitMpesaStatus === "idle" && (
                                          <div className="space-y-2">
                                            <div className="relative">
                                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                              <input
                                                type="tel"
                                                value={splitMpesaPhone}
                                                onChange={(e) => {
                                                  setSplitMpesaPhone(e.target.value);
                                                  setSplitMpesaError("");
                                                }}
                                                placeholder="Phone (e.g. 0712345678)"
                                                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#0f1117] border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#0d7a3e] dark:focus:border-[#4ade80]"
                                              />
                                            </div>
                                            {splitMpesaError && (
                                              <p className="text-xs text-red-500 flex items-center gap-1">
                                                <AlertCircle className="w-3.5 h-3.5" />
                                                {splitMpesaError}
                                              </p>
                                            )}
                                            <button
                                              type="button"
                                              onClick={initiateSplitSTKPush}
                                              className="w-full py-2 bg-[#0d7a3e] hover:bg-[#0a6332] dark:bg-[#4ade80] dark:text-[#0f1117] dark:hover:bg-[#22c55e] text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow"
                                            >
                                              Send STK Push (KES {parseAmount(splitPayments.mpesa)})
                                            </button>
                                          </div>
                                        )}

                                        {splitMpesaStatus === "initiating" && (
                                          <div className="flex items-center justify-center gap-2 py-2">
                                            <Loader2 className="w-4 h-4 animate-spin text-[#0d7a3e] dark:text-[#4ade80]" />
                                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                                              Contacting Safaricom...
                                            </span>
                                          </div>
                                        )}

                                        {splitMpesaStatus === "pending" && (
                                          <div className="space-y-2">
                                            <div className="flex items-center justify-between text-xs">
                                              <div className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400">
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                <span>Waiting for PIN: {splitMpesaCountdown}s</span>
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() => setSplitMpesaStatus("idle")}
                                                className="text-red-500 hover:underline font-semibold"
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-normal">
                                              Customer has been sent a payment prompt. Please ask them to enter their PIN.
                                            </p>
                                          </div>
                                        )}

                                        {splitMpesaStatus === "success" && (
                                          <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg text-green-700 dark:text-green-400">
                                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                                            <div className="text-xs font-semibold">
                                              STK Push Verified! Reference: {splitReferences[method]}
                                            </div>
                                          </div>
                                        )}

                                        {splitMpesaStatus === "failed" && (
                                          <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-xs font-bold text-red-600 dark:text-red-400">
                                              <XCircle className="w-3.5 h-3.5 shrink-0" />
                                              <span>Failed: {splitMpesaError}</span>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSplitMpesaStatus("idle");
                                                setSplitMpesaError("");
                                              }}
                                              className="text-xs font-bold text-primary-600 hover:underline"
                                            >
                                              Retry STK Push
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                                        M-Pesa Confirmation Code (Manual / Verified)
                                      </label>
                                      <input
                                        type="text"
                                        value={splitReferences[method]}
                                        onChange={(e) =>
                                          setSplitReferences((current) => ({
                                            ...current,
                                            [method]: e.target.value.toUpperCase(),
                                          }))
                                        }
                                        placeholder="e.g. QKL1A2B3C4"
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white text-sm focus:outline-none focus:border-[#0d7a3e] dark:focus:border-[#4ade80] transition-colors uppercase font-mono font-bold"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <button
                          onClick={() => handlePayment()}
                          disabled={splitPaidTotal < netTotal || isProcessing}
                          className="w-full py-4 bg-[#0d7a3e] dark:bg-[#4ade80] hover:bg-[#0a6332] dark:hover:bg-[#22c55e] disabled:opacity-50 text-white dark:text-[#0f1117] rounded-2xl font-bold transition-all active:scale-[0.98] shadow-lg mt-auto"
                        >
                          {isProcessing ? (
                            <span className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Processing...</span>
                          ) : (
                            <span className="flex items-center justify-center gap-2"><CheckCircle2 className="w-5 h-5" /> Complete Split Payment</span>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loyalty Lookup Modal */}
      {showLoyaltyPrompt && !selectedCustomer && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-0 sm:p-4">
          <div className="bg-white dark:bg-[#0f1117] text-gray-900 dark:text-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md overflow-hidden">
            <div className="flex justify-between items-center px-6 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Gift className="w-5 h-5 text-indigo-500" /> Loyalty Points
              </h2>
              <button
                onClick={() => {
                  setShowLoyaltyPrompt(false);
                  setCheckoutPhone("");
                  setLookupError("");
                  setShowCheckoutQuickReg(false);
                  setCheckoutNewName("");
                }}
                className="text-gray-400 hover:text-gray-900 dark:hover:text-white p-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Look up a customer by phone to earn or redeem loyalty points.
              </p>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">Phone Number</label>
                <input
                  type="tel"
                  value={checkoutPhone}
                  onChange={(e) => { setCheckoutPhone(e.target.value); setLookupError(""); }}
                  placeholder="e.g. 0712345678"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
              </div>
              {lookupError && (
                <p className="text-sm text-red-500 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {lookupError}
                </p>
              )}
              <button
                onClick={handleCheckoutPhoneLookup}
                disabled={isLookingUp || !checkoutPhone.trim()}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
              >
                {isLookingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {isLookingUp ? "Searching..." : "Look Up Customer"}
              </button>
              {showCheckoutQuickReg && (
                <form onSubmit={handleCheckoutQuickRegSubmit} className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Quick Register New Customer</p>
                  <input
                    type="text"
                    value={checkoutNewName}
                    onChange={(e) => setCheckoutNewName(e.target.value)}
                    placeholder="Customer name"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={isLookingUp}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl font-bold transition-colors"
                  >
                    {isLookingUp ? "Registering..." : "Register & Apply"}
                  </button>
                </form>
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
        imageUrl={scanFeedback.imageUrl}
        duration={1200}
        position="top"
        enableSound={true}
        onAnimationComplete={() =>
          setScanFeedback((prev) => ({ ...prev, show: false }))
        }
      />
    </div>
  );
}


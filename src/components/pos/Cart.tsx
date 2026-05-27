"use client";

import { useState, useEffect } from "react";
import {
  Minus, Plus, Trash2, ShoppingCart, Tag, Percent,
  User, UserCheck, Search, X, Star, UserPlus, Loader2, Check,
  AlertCircle, Gift, Lock, Eye
} from "lucide-react";
import { useCartStore } from "@/store";
import { useAuthStore } from "@/store";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Customer } from "@/types";
import ManagerAuth from "./ManagerAuth";
import AuditLog from "./AuditLog";

export default function Cart() {
  const {
    items, removeItem, updateQuantity, updateDiscount, getTotals,
    selectedCustomer, setSelectedCustomer
  } = useCartStore();
  const { user } = useAuthStore();

  const [discountInput, setDiscountInput] = useState<Record<string, string>>({});
  const [showManagerAuth, setShowManagerAuth] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: string; data: any } | null>(null);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const totals = getTotals();

  // Loyalty Customer Search state
  const [custSearch, setCustSearch] = useState("");
  const [custResults, setCustResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Quick Register inline state
  const [showQuickReg, setShowQuickReg] = useState(false);
  const [regForm, setRegForm] = useState({ name: "", phone: "" });
  const [regError, setRegError] = useState("");
  const [regSuccess, setRegSuccess] = useState(false);

  // Search customers on typing
  useEffect(() => {
    if (!custSearch.trim()) {
      setCustResults([]);
      setShowDropdown(false);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`/api/customers?search=${encodeURIComponent(custSearch)}`);
        const data = await response.json();
        if (response.ok) {
          setCustResults(data.customers || []);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error("Failed to query customers:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [custSearch]);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustSearch("");
    setCustResults([]);
    setShowDropdown(false);
    setShowQuickReg(false);
  };

  const handleQuickRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    setRegSuccess(false);

    if (!regForm.name.trim() || !regForm.phone.trim()) {
      setRegError("Name and phone are required.");
      return;
    }

    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(regForm),
      });
      const data = await response.json();

      if (response.ok) {
        setRegSuccess(true);
        setSelectedCustomer(data.customer);
        setRegForm({ name: "", phone: "" });
        setTimeout(() => {
          setShowQuickReg(false);
          setRegSuccess(false);
        }, 1500);
      } else {
        setRegError(data.error || "Registration failed.");
      }
    } catch (err) {
      setRegError("Network connection failed.");
    }
  };

  const handleRemoveItemAuth = (productId: string, productName: string) => {
    setPendingAction({ type: "remove_item", data: { productId, productName } });
    setShowManagerAuth(true);
  };

  const handleApplyDiscountAuth = (productId: string, productName: string) => {
    setPendingAction({ type: "apply_discount", data: { productId, productName } });
    setShowManagerAuth(true);
  };

  const handleManagerAuthorize = (managerId: string) => {
    if (!pendingAction) return;

    const { type, data } = pendingAction;
    const timestamp = new Date().toISOString();

    if (type === "remove_item") {
      const item = items.find(i => i.product.id === data.productId);
      removeItem(data.productId);
      setAuditLog([...auditLog, {
        id: Date.now().toString(),
        action: "remove_item",
        description: `Removed item from cart`,
        itemName: data.productName,
        manager: { name: user?.full_name || "Unknown", email: user?.email || "" },
        timestamp,
        authorizedAt: timestamp,
      }]);
    }

    setPendingAction(null);
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-gray-400 dark:text-gray-500">
        <ShoppingCart className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-lg font-medium">Your cart is empty</p>
        <p className="text-sm mt-1">Scan or search for products to add</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-pos-card overflow-hidden">
      
      {/* ── CUSTOMER & LOYALTY SELECTOR PANEL ── */}
      {selectedCustomer && (
        <div className="p-4 border-b border-gray-200 dark:border-pos-border bg-gray-50/50 dark:bg-gray-800/20 flex-shrink-0 relative">
          {/* Active Customer Display Card */}
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-primary-500/10 to-indigo-500/10 border border-primary-500/30 rounded-xl animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-5 h-5 text-primary-500" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">
                  {selectedCustomer.name}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {selectedCustomer.phone}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 flex-shrink-0">
                <Star className="w-3 h-3 fill-current" />
                {selectedCustomer.points_balance}
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
                title="Remove Customer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {items.map((item) => (
          <div
            key={item.product.id}
            className="group bg-white dark:bg-gray-800/30 rounded-xl p-3 border border-gray-100 dark:border-pos-border hover:border-primary-200 dark:hover:border-primary-700 transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="w-14 h-14 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                {item.product.image_url ? (
                  <img
                    src={item.product.image_url}
                    alt={item.product.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <Tag className="w-6 h-6 text-gray-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                  {item.product.name}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {item.product.barcode}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                    {formatCurrency(item.product.price)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        updateQuantity(item.product.id, item.quantity - 1)
                      }
                      className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-medium text-gray-900 dark:text-white">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        updateQuantity(item.product.id, item.quantity + 1)
                      }
                      className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <Percent className="w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountInput[item.product.id] ?? item.discount}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDiscountInput((prev) => ({
                        ...prev,
                        [item.product.id]: val,
                      }));
                      const numVal = parseFloat(val);
                      if (!isNaN(numVal) && numVal >= 0 && numVal <= 100) {
                        updateDiscount(item.product.id, numVal);
                      }
                    }}
                    className="w-16 px-2 py-1 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder="0%"
                  />
                  <span className="text-xs text-gray-400">discount</span>
                </div>
              </div>

              <button
                onClick={() => handleRemoveItemAuth(item.product.id, item.product.name)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 flex-shrink-0 relative group/trash"
                title="Requires manager authorization"
              >
                <Trash2 className="w-4 h-4" />
                <Lock className="w-2.5 h-2.5 absolute -top-0.5 -right-0.5 text-amber-500" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Cart Totals */}
      <div className="border-t border-gray-200 dark:border-pos-border bg-gray-50 dark:bg-gray-800/20 p-4 space-y-2 flex-shrink-0">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
          <span className="text-gray-900 dark:text-white font-medium">
            {formatCurrency(totals.subtotal)}
          </span>
        </div>
        {totals.discountAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Discount</span>
            <span className="text-green-600 dark:text-green-400 font-medium">
              -{formatCurrency(totals.discountAmount)}
            </span>
          </div>
        )}

        {/* Estimated Earning Display (if customer selected) */}
        {selectedCustomer && (
          <div className="flex justify-between text-xs text-amber-600 dark:text-amber-400 font-semibold border-t border-dashed border-gray-200 dark:border-gray-700/50 pt-2">
            <span className="flex items-center gap-1">
              <Gift className="w-3.5 h-3.5" />
              Estimated Earning
            </span>
            <span>+{Math.floor(totals.total / 100)} pts</span>
          </div>
        )}

        <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between">
          <span className="text-base font-bold text-gray-900 dark:text-white">Total</span>
          <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
            {formatCurrency(totals.total)}
          </span>
        </div>

        {auditLog.length > 0 && (
          <button
            onClick={() => setShowAuditLog(true)}
            className="w-full mt-2 py-2 text-xs font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            <Eye className="w-3.5 h-3.5" />
            View Manager Actions ({auditLog.length})
          </button>
        )}
      </div>

      <ManagerAuth
        isOpen={showManagerAuth}
        onClose={() => { setShowManagerAuth(false); setPendingAction(null); }}
        onAuthorize={handleManagerAuthorize}
        action={pendingAction ? `${pendingAction.type.replace(/_/g, " ")}: ${pendingAction.data.productName || "transaction"}` : ""}
      />

      <AuditLog
        entries={auditLog}
        isOpen={showAuditLog}
        onClose={() => setShowAuditLog(false)}
      />
    </div>
  );
}

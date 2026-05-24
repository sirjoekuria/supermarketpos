"use client";

import { useState, useEffect } from "react";
import {
  Minus, Plus, Trash2, ShoppingCart, Tag, Percent,
  User, UserCheck, Search, X, Star, UserPlus, Loader2, Check
} from "lucide-react";
import { useCartStore } from "@/store";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Customer } from "@/types";

export default function Cart() {
  const {
    items, removeItem, updateQuantity, updateDiscount, getTotals,
    selectedCustomer, setSelectedCustomer
  } = useCartStore();

  const [discountInput, setDiscountInput] = useState<Record<string, string>>({});
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
      <div className="p-4 border-b border-gray-200 dark:border-pos-border bg-gray-50/50 dark:bg-gray-800/20 flex-shrink-0 relative">
        {selectedCustomer ? (
          /* Active Customer Display Card */
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
        ) : showQuickReg ? (
          /* Inline Registration Form */
          <form onSubmit={handleQuickRegister} className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl space-y-3 animate-in slide-in-from-top duration-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Quick Registration
              </span>
              <button
                type="button"
                onClick={() => { setShowQuickReg(false); setRegError(""); }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {regError && (
              <div className="text-[10px] text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {regError}
              </div>
            )}

            {regSuccess && (
              <div className="text-[10px] text-green-500 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                Registered successfully!
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Name"
                value={regForm.name}
                onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                className="px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                required
              />
              <input
                type="tel"
                placeholder="Phone"
                value={regForm.phone}
                onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                className="px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                required
              />
            </div>
            
            <button
              type="submit"
              className="w-full py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-bold"
            >
              Add & Apply to Cart
            </button>
          </form>
        ) : (
          /* Search Input Area */
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Assign loyalty customer (name/phone)..."
              value={custSearch}
              onChange={(e) => setCustSearch(e.target.value)}
              className="w-full pl-9 pr-16 py-2.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {isSearching ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
              ) : (
                <button
                  onClick={() => {
                    setShowQuickReg(true);
                    setRegForm({ name: "", phone: custSearch.match(/^\+?[0-9]*$/) ? custSearch : "" });
                  }}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-white rounded"
                  title="Quick Add Customer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Floating Customer Search dropdown */}
        {showDropdown && custResults.length > 0 && (
          <div className="absolute top-full left-4 right-4 z-30 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl shadow-2xl max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/50">
            {custResults.map((cust) => (
              <button
                key={cust.id}
                onClick={() => handleSelectCustomer(cust)}
                className="w-full px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left flex items-center justify-between"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{cust.name}</p>
                  <p className="text-[10px] text-gray-500">{cust.phone}</p>
                </div>
                <div className="flex items-center gap-1 bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  <Star className="w-2.5 h-2.5 fill-current" />
                  {cust.points_balance}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

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
                onClick={() => removeItem(item.product.id)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
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
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Tax (VAT)</span>
          <span className="text-gray-900 dark:text-white font-medium">
            {formatCurrency(totals.taxAmount)}
          </span>
        </div>
        
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
      </div>
    </div>
  );
}

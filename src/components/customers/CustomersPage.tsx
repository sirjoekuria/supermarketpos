"use client";

import { useEffect, useState } from "react";
import {
  Users, Search, Plus, UserPlus, Gift, Star, Award, ShieldAlert,
  ArrowUpRight, ArrowDownLeft, Settings, History, Loader2,
  X, Check, AlertCircle, RefreshCw, Smartphone, Mail, Calendar, ChevronLeft,
} from "lucide-react";
import { useAuthStore } from "@/store";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Customer, PointTransaction } from "@/types";

export default function CustomersPage() {
  const { user } = useAuthStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [history, setHistory] = useState<PointTransaction[]>([]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Pagination
  const PAGE_SIZE = 15;
  const [currentPage, setCurrentPage] = useState(1);

  const [showRegModal, setShowRegModal] = useState(false);
  const [regForm, setRegForm] = useState({ name: "", phone: "", email: "" });
  const [regError, setRegError] = useState("");
  const [regSuccess, setRegSuccess] = useState(false);
  
  // Adjustment Panel State
  const [showAdjustPanel, setShowAdjustPanel] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ amount: "", reason: "" });
  const [adjustError, setAdjustError] = useState("");
  const [adjustSuccess, setAdjustSuccess] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Fetch Customers list
  const fetchCustomers = async (search = "") => {
    setIsLoading(true);
    setCurrentPage(1); // reset to page 1 on any new fetch
    try {
      const response = await fetch(`/api/customers?search=${encodeURIComponent(search)}`);
      const data = await response.json();
      if (response.ok) {
        setCustomers(data.customers || []);
      } else {
        console.error("Failed to load customers:", data.error);
      }
    } catch (err) {
      console.error("Customers fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Customer Points History
  const fetchHistory = async (customerId: string) => {
    setIsHistoryLoading(true);
    try {
      const response = await fetch(`/api/customers/${customerId}/history`);
      const data = await response.json();
      if (response.ok) {
        setHistory(data.history || []);
      } else {
        console.error("Failed to load point history:", data.error);
      }
    } catch (err) {
      console.error("Point history fetch error:", err);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      fetchHistory(selectedCustomer.id);
    } else {
      setHistory([]);
    }
  }, [selectedCustomer]);

  // Handle Search Input
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers(searchQuery);
  };

  // Pagination helpers
  const totalPages = Math.max(1, Math.ceil(customers.length / PAGE_SIZE));
  const pagedCustomers = customers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Handle Customer Selection
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowAdjustPanel(false);
    setAdjustForm({ amount: "", reason: "" });
    setAdjustError("");
    setAdjustSuccess(false);
  };

  // Handle Register Customer Submit
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    setRegSuccess(false);

    if (!regForm.name.trim() || !regForm.phone.trim()) {
      setRegError("Name and Phone number are required.");
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
        setRegForm({ name: "", phone: "", email: "" });
        fetchCustomers();
        setTimeout(() => {
          setShowRegModal(false);
          setRegSuccess(false);
        }, 1500);
      } else {
        setRegError(data.error || "Failed to register customer.");
      }
    } catch (err) {
      setRegError("A network error occurred. Please try again.");
    }
  };

  // Handle Adjust Points Balance Submit
  const handleAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdjustError("");
    setAdjustSuccess(false);

    if (!selectedCustomer) return;
    const amount = Number(adjustForm.amount);

    if (isNaN(amount) || amount === 0) {
      setAdjustError("Please specify a valid positive or negative points adjustment amount.");
      return;
    }

    const newBalance = selectedCustomer.points_balance + amount;
    if (newBalance < 0) {
      setAdjustError(`Points balance cannot drop below 0. Max reduction possible: ${selectedCustomer.points_balance} points.`);
      return;
    }

    if (!adjustForm.reason.trim()) {
      setAdjustError("Please provide an audit trail reason for this points correction.");
      return;
    }

    setIsAdjusting(true);
    try {
      const response = await fetch(`/api/customers/${selectedCustomer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          points_balance: newBalance,
          adjustment_reason: adjustForm.reason.trim(),
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

      if (response.ok) {
        setAdjustSuccess(true);
        setSelectedCustomer(data.customer);
        setAdjustForm({ amount: "", reason: "" });
        fetchCustomers();
        setTimeout(() => {
          setShowAdjustPanel(false);
          setAdjustSuccess(false);
        }, 2000);
      } else {
        setAdjustError(data.error || "Failed to adjust customer points.");
      }
    } catch (err) {
      setAdjustError("Network error. Could not connect to API.");
    } finally {
      setIsAdjusting(false);
    }
  };

  // Determine loyalty tier based on point balance
  const getLoyaltyTier = (points: number) => {
    if (points >= 5000) return { name: "Platinum VIP", color: "from-teal-600 to-emerald-600", border: "border-teal-400" };
    if (points >= 1500) return { name: "Gold Elite", color: "from-amber-500 to-yellow-600", border: "border-amber-400" };
    if (points >= 500) return { name: "Silver Choice", color: "from-slate-400 to-slate-600", border: "border-slate-300" };
    return { name: "Bronze Member", color: "from-orange-500 to-amber-700", border: "border-orange-600" };
  };

  const currentTier = selectedCustomer ? getLoyaltyTier(selectedCustomer.points_balance) : null;

  return (
    <div className="flex h-full bg-gray-50 dark:bg-pos-dark text-gray-900 dark:text-white overflow-hidden">
      
      {/* LEFT COLUMN: Customer Listing & Search */}
      <div className={cn(
        "w-full lg:w-96 flex-col border-r border-gray-200 dark:border-pos-border bg-white dark:bg-pos-card",
        selectedCustomer ? "hidden lg:flex" : "flex"
      )}>
        
        {/* Search & Actions Header */}
        <div className="p-4 border-b border-gray-200 dark:border-pos-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <Users className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              </div>
              <h2 className="text-lg font-bold">Loyalty Customers</h2>
            </div>
            <button
              onClick={() => setShowRegModal(true)}
              className="p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center gap-1.5 text-xs font-semibold shadow-md shadow-primary-600/10 transition-all active:scale-95"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Register
            </button>
          </div>

          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  fetchCustomers("");
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>
        </div>

        {/* Customer List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500 mb-2" />
              <p className="text-xs">Loading customers...</p>
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto opacity-20 mb-3" />
              <p className="text-sm font-medium">No customers found</p>
              <p className="text-xs mt-1">Register a customer to start loyalty tracking.</p>
            </div>
          ) : (
            pagedCustomers.map((cust) => {
              const tier = getLoyaltyTier(cust.points_balance);
              const isSelected = selectedCustomer?.id === cust.id;

              return (
                <button
                  key={cust.id}
                  onClick={() => handleSelectCustomer(cust)}
                  className={cn(
                    "w-full text-left p-4 flex items-center justify-between transition-colors",
                    isSelected
                      ? "bg-primary-50/50 dark:bg-primary-900/10 border-l-4 border-primary-500"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800/40"
                  )}
                >
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                      {cust.name}
                    </h4>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Smartphone className="w-3 h-3" />
                      {cust.phone}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full text-xs font-bold w-fit ml-auto">
                      <Star className="w-3 h-3 fill-current" />
                      {cust.points_balance}
                    </div>
                    <span className="text-[10px] text-gray-400 block mt-1">
                      {tier.name}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Pagination Controls */}
        {!isLoading && customers.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-pos-border flex-shrink-0 bg-white dark:bg-pos-card">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Prev
            </button>
            <span className="text-xs text-gray-500">
              Page {currentPage} of {totalPages} &nbsp;·&nbsp; {customers.length} total
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Customer Details & Points Audit Timeline */}
      <div className={cn(
        "flex-1 flex-col overflow-hidden bg-gray-50 dark:bg-pos-dark",
        selectedCustomer ? "flex" : "hidden lg:flex"
      )}>
        {selectedCustomer ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Customer Details Header Panel */}
            <div className="p-6 sm:p-8 bg-white dark:bg-pos-card border-b border-gray-200 dark:border-pos-border flex-shrink-0">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                
                {/* Premium Loyalty Card Graphic */}
                <div className={cn(
                  "relative w-full md:w-80 h-44 rounded-2xl p-5 text-white flex flex-col justify-between overflow-hidden shadow-xl bg-gradient-to-br",
                  currentTier?.color
                )}>
                  {/* Decorative Elements */}
                  <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4">
                    <Gift className="w-48 h-48" />
                  </div>
                  <div className="absolute right-4 top-4 bg-white/20 p-2.5 rounded-xl backdrop-blur-md">
                    <Star className="w-6 h-6 fill-white text-white" />
                  </div>

                  <div>
                    <span className="text-xs uppercase tracking-widest font-semibold opacity-75">
                      Loyalty Rewards Card
                    </span>
                    <h3 className="text-xl font-bold mt-1 tracking-wide truncate">
                      {selectedCustomer.name}
                    </h3>
                    <p className="text-xs font-mono opacity-80 mt-0.5">{selectedCustomer.phone}</p>
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider opacity-60">Balance</p>
                      <p className="text-3xl font-bold leading-none font-mono">
                        {selectedCustomer.points_balance} <span className="text-sm font-sans font-medium">pts</span>
                      </p>
                    </div>
                    <span className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold backdrop-blur-md transition-colors">
                      {currentTier?.name}
                    </span>
                  </div>
                </div>

                {/* Profile Stats Columns */}
                <div className="flex-1 space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2 lg:hidden">
                      <button 
                        onClick={() => setSelectedCustomer(null)}
                        className="p-1.5 -ml-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <span className="text-sm font-semibold text-gray-500">Back to List</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                      {selectedCustomer.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2">
                      <span className="flex items-center gap-1.5 text-sm text-gray-500">
                        <Smartphone className="w-4 h-4" />
                        {selectedCustomer.phone}
                      </span>
                      {selectedCustomer.email && (
                        <span className="flex items-center gap-1.5 text-sm text-gray-500">
                          <Mail className="w-4 h-4" />
                          {selectedCustomer.email}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        Joined {new Date(selectedCustomer.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl border border-gray-100 dark:border-pos-border">
                      <p className="text-xs text-gray-400 uppercase tracking-wider">Points Value</p>
                      <p className="text-2xl font-bold text-primary-600 dark:text-primary-400 mt-1">
                        {formatCurrency(selectedCustomer.points_balance)}
                      </p>
                    </div>
                    
                    {/* Admin Adjustments Tool */}
                    <div className="flex items-end">
                      {(user?.role === "admin" || user?.role === "manager") ? (
                        <button
                          onClick={() => {
                            setShowAdjustPanel(!showAdjustPanel);
                            setAdjustError("");
                            setAdjustSuccess(false);
                          }}
                          className={cn(
                            "px-4 py-3 border rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all w-full",
                            showAdjustPanel
                              ? "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800"
                              : "bg-white dark:bg-gray-800 border-gray-200 dark:border-pos-border text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                          )}
                        >
                          <Settings className="w-4 h-4" />
                          {showAdjustPanel ? "Cancel Adjustment" : "Correct Balance"}
                        </button>
                      ) : (
                        <div className="w-full flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/10 border border-yellow-200 dark:border-yellow-900/30 rounded-xl text-yellow-600 dark:text-yellow-400 text-xs">
                          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                          Manager credentials needed to adjust points.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Adjust Points Balance Form */}
            {showAdjustPanel && (
              <div className="p-6 bg-yellow-50 dark:bg-yellow-950/10 border-b border-yellow-200 dark:border-yellow-900/30 flex-shrink-0 animate-in slide-in-from-top duration-300">
                <h4 className="font-bold text-yellow-800 dark:text-yellow-400 flex items-center gap-2 text-sm">
                  <ShieldAlert className="w-4 h-4" />
                  Manual Points Correction
                </h4>
                <p className="text-xs text-yellow-700 dark:text-yellow-400/70 mt-1">
                  Adjust points balance manually. E.g. input `200` to credit points, or `-150` to deduct points.
                </p>

                <form onSubmit={handleAdjustment} className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-500">Points Offset</label>
                    <input
                      type="number"
                      placeholder="e.g. 100 or -50"
                      value={adjustForm.amount}
                      onChange={(e) => setAdjustForm({ ...adjustForm, amount: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-lg text-gray-900 dark:text-white"
                      required
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500">Audit Trail Reason</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Why is this balance correction being made?"
                        value={adjustForm.reason}
                        onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-lg text-gray-900 dark:text-white"
                        required
                      />
                      <button
                        type="submit"
                        disabled={isAdjusting}
                        className="px-4 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-bold text-sm transition-colors flex items-center gap-2 flex-shrink-0"
                      >
                        {isAdjusting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                      </button>
                    </div>
                  </div>
                </form>

                {adjustError && (
                  <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30 rounded-lg text-red-700 dark:text-red-400 text-xs">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {adjustError}
                  </div>
                )}

                {adjustSuccess && (
                  <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-green-100 dark:bg-green-950/30 border border-green-200 dark:border-green-900/30 rounded-lg text-green-700 dark:text-green-400 text-xs">
                    <Check className="w-4 h-4 flex-shrink-0" />
                    Points adjusted successfully!
                  </div>
                )}
              </div>
            )}

            {/* Audit History Timeline */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <History className="w-5 h-5 text-gray-400" />
                  Transaction Ledger History
                </h3>
                <button
                  onClick={() => fetchHistory(selectedCustomer.id)}
                  className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 hover:text-white"
                  title="Reload History"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {isHistoryLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-500 mb-2" />
                  <p className="text-xs">Loading points history...</p>
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                  <Gift className="w-12 h-12 mx-auto opacity-10 mb-3" />
                  <p className="text-sm font-medium">No ledger records yet</p>
                  <p className="text-xs mt-1">This customer has not earned or redeemed points yet.</p>
                </div>
              ) : (
                <div className="relative border-l border-gray-200 dark:border-gray-800 ml-4 space-y-6">
                  {history.map((pt) => {
                    const isCredit = pt.points > 0;
                    const isEarn = pt.type === "earn";
                    const isRedeem = pt.type === "redeem";
                    const isAdjustment = pt.type === "adjust";

                    return (
                      <div key={pt.id} className="relative pl-6 animate-in fade-in slide-in-from-bottom duration-300">
                        {/* Timeline Node Badge */}
                        <div className={cn(
                          "absolute -left-[13px] top-1.5 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-pos-dark",
                          isCredit
                            ? "bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400"
                            : "bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400"
                        )}>
                          {isCredit ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          )}
                        </div>

                        {/* Transaction Card */}
                        <div className="bg-white dark:bg-pos-card border border-gray-200 dark:border-pos-border rounded-xl p-4 flex items-center justify-between gap-4 shadow-sm">
                          <div>
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                              isEarn && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                              isRedeem && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                              isAdjustment && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                              !isEarn && !isRedeem && !isAdjustment && "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                            )}>
                              {pt.type}
                            </span>
                            <p className="text-sm font-semibold mt-2 text-gray-900 dark:text-white">
                              {pt.reference}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                              <span>{new Date(pt.created_at).toLocaleString()}</span>
                              {pt.sale && (
                                <span className="font-mono text-primary-500 font-medium">
                                  {pt.sale.receipt_number}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-right">
                            <span className={cn(
                              "text-lg font-mono font-bold block",
                              isCredit ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                            )}>
                              {isCredit ? "+" : ""}{pt.points}
                            </span>
                            <span className="text-[10px] text-gray-400 block mt-1">
                              Bal: {pt.balance_after}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <Award className="w-20 h-20 text-gray-300 dark:text-gray-700 mb-4 animate-bounce" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">No Customer Selected</h3>
            <p className="text-sm mt-1">Select a customer from the registry to view point accounts.</p>
          </div>
        )}
      </div>

      {/* REGISTRATION MODAL */}
      {showRegModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-pos-card border border-gray-200 dark:border-pos-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in scale-in duration-300">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-pos-border">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary-500" />
                Register New Customer
              </h3>
              <button
                onClick={() => { setShowRegModal(false); setRegError(""); }}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegister} className="p-6 space-y-4">
              {regError && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {regError}
                </div>
              )}

              {regSuccess && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-600 dark:text-green-400 text-sm">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  Customer registered successfully!
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-500">Full Name *</label>
                <input
                  type="text"
                  placeholder="Enter name..."
                  value={regForm.name}
                  onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-500">Phone Number *</label>
                <input
                  type="tel"
                  placeholder="e.g. +254 700 000000"
                  value={regForm.phone}
                  onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-500">Email Address (Optional)</label>
                <input
                  type="email"
                  placeholder="e.g. john@doe.com"
                  value={regForm.email}
                  onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-primary-600/10 active:scale-98"
              >
                Register & Create Card
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { 
  Smartphone, 
  Search, 
  Filter, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  Link as LinkIcon, 
  FileText,
  DollarSign,
  TrendingUp,
  Clock,
  Layers
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAuthStore } from "@/store";
import toast from "react-hot-toast";

type MpesaTransaction = {
  id: string;
  sale_id: string | null;
  merchant_request_id: string | null;
  checkout_request_id: string | null;
  phone_number: string;
  amount: number;
  status: string;
  account_reference: string | null;
  result_code: number | null;
  result_desc: string | null;
  mpesa_receipt_number: string | null;
  transaction_date: string | null;
  created_at: string;
  updated_at: string;
  customer_name: string | null;
  sales?: {
    receipt_number: string;
  } | null;
};

export default function MpesaManagement() {
  const { user } = useAuthStore();
  const [transactions, setTransactions] = useState<MpesaTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formCode, setFormCode] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formName, setFormName] = useState("");
  const [formError, setFormError] = useState("");

  const limit = 15;
  const offset = (page - 1) * limit;

  // Stats
  const [stats, setStats] = useState({
    totalAmount: 0,
    linkedCount: 0,
    unlinkedCount: 0,
    pendingCount: 0,
  });

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/mpesa/transactions?search=${encodeURIComponent(search)}&status=${status}&limit=${limit}&offset=${offset}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load transactions.");
      setTransactions(data.transactions || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch M-Pesa records.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch summary stats
  const loadStats = async () => {
    try {
      // Fetch all for local stats computation or we can query status groups
      const res = await fetch(`/api/mpesa/transactions?limit=200`);
      const data = await res.json();
      if (res.ok && data.transactions) {
        const txs: MpesaTransaction[] = data.transactions;
        const totalAmount = txs
          .filter(t => t.status === "success")
          .reduce((sum, t) => sum + Number(t.amount), 0);
        const linkedCount = txs.filter(t => t.sale_id !== null).length;
        const unlinkedCount = txs.filter(t => t.sale_id === null && t.status === "success").length;
        const pendingCount = txs.filter(t => t.status === "pending").length;
        setStats({ totalAmount, linkedCount, unlinkedCount, pendingCount });
      }
    } catch (err) {
      console.error("Failed to load statistics:", err);
    }
  };

  useEffect(() => {
    loadTransactions();
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadTransactions();
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formCode || !formAmount || !formPhone) {
      setFormError("Code, Amount, and Phone Number are required.");
      return;
    }

    if (formCode.length < 8) {
      setFormError("Transaction code must be at least 8 characters (e.g. QKL1A2B3C4).");
      return;
    }

    const amt = parseFloat(formAmount);
    if (isNaN(amt) || amt <= 0) {
      setFormError("Please enter a valid positive amount.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/mpesa/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mpesa_receipt_number: formCode.trim().toUpperCase(),
          amount: amt,
          phone_number: formPhone.trim(),
          customer_name: formName.trim() || "Manual Payment",
          actor: user ? { id: user.id, email: user.email, full_name: user.full_name, role: user.role } : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save transaction.");

      toast.success("Transaction code registered successfully.");
      setShowAddModal(false);
      // Reset form
      setFormCode("");
      setFormAmount("");
      setFormPhone("");
      setFormName("");
      // Refresh
      loadTransactions();
      loadStats();
    } catch (err: any) {
      setFormError(err.message || "Failed to save record.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction record?")) return;

    try {
      const response = await fetch(
        `/api/mpesa/transactions?id=${id}&actor=${encodeURIComponent(JSON.stringify(user))}`,
        { method: "DELETE" }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to delete record.");

      toast.success("Transaction deleted successfully.");
      loadTransactions();
      loadStats();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete record.");
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="p-4 sm:p-6 space-y-6 overflow-y-auto h-full w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Smartphone className="w-7 h-7 text-green-500" />
            M-Pesa Verification Audits
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Audit payments, resolve confirmation issues, and register manual transactions
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold shadow-lg shadow-green-600/20 hover:shadow-green-600/30 transition-all text-sm active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Add M-Pesa Record
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-pos-card border border-gray-200 dark:border-pos-border rounded-2xl p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-950/20 flex items-center justify-center text-green-500">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total M-Pesa Vol</p>
            <h3 className="text-lg font-black text-gray-900 dark:text-white mt-0.5">{formatCurrency(stats.totalAmount)}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-pos-card border border-gray-200 dark:border-pos-border rounded-2xl p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center text-blue-500">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Checked Out (Linked)</p>
            <h3 className="text-lg font-black text-gray-900 dark:text-white mt-0.5">{stats.linkedCount} transactions</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-pos-card border border-gray-200 dark:border-pos-border rounded-2xl p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-500">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Unlinked (Available)</p>
            <h3 className="text-lg font-black text-gray-900 dark:text-white mt-0.5">{stats.unlinkedCount} codes</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-pos-card border border-gray-200 dark:border-pos-border rounded-2xl p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center text-amber-500">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">STK Push Pending</p>
            <h3 className="text-lg font-black text-gray-900 dark:text-white mt-0.5">{stats.pendingCount} active</h3>
          </div>
        </div>
      </div>

      {/* Main List Table Area */}
      <div className="bg-white dark:bg-pos-card border border-gray-200 dark:border-pos-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
        {/* Filters */}
        <div className="p-4 border-b border-gray-200 dark:border-pos-border flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50/50 dark:bg-gray-800/10">
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code, phone, name..."
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </form>

          <div className="flex gap-2 w-full md:w-auto items-center justify-end">
            <Filter className="w-4 h-4 text-gray-400 mr-1" />
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Transactions</option>
              <option value="success">Success</option>
              <option value="unlinked">Available (Unlinked)</option>
              <option value="linked">Used (Linked)</option>
              <option value="pending">Pending STK</option>
              <option value="failed">Failed STK</option>
            </select>
          </div>
        </div>

        {/* Loading Spinner */}
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin text-green-600 mb-3" />
            Loading transaction logs...
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400 font-medium">
            No transactions found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/40 border-b border-gray-200 dark:border-pos-border text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">
                  <th className="px-6 py-4">Time</th>
                  <th className="px-6 py-4">Receipt Code</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Customer Details</th>
                  <th className="px-6 py-4">Status / Connection</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-pos-border">
                {transactions.map((tx) => {
                  const isLinked = tx.sale_id !== null;
                  return (
                    <tr key={tx.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {formatDate(tx.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-sm text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
                          {tx.mpesa_receipt_number || "PENDING"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="font-semibold text-gray-900 dark:text-white">{tx.customer_name || "Unknown Customer"}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{tx.phone_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {tx.status === "success" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200/50 dark:border-green-900/50">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Successful
                            </span>
                          ) : tx.status === "failed" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200/50 dark:border-red-900/50">
                              <XCircle className="w-3.5 h-3.5" /> Failed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/50">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Pending STK
                            </span>
                          )}

                          {isLinked ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/30">
                              <LinkIcon className="w-3.5 h-3.5" /> Linked: {tx.sales?.receipt_number}
                            </span>
                          ) : tx.status === "success" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/30">
                              <FileText className="w-3.5 h-3.5" /> Unused
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap text-sm">
                        <button
                          disabled={isLinked}
                          onClick={() => handleDeleteTransaction(tx.id)}
                          className="p-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                          title={isLinked ? "Cannot delete linked transaction" : "Delete record"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 dark:border-pos-border flex items-center justify-between">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || isLoading}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  Page <span className="font-bold text-gray-900 dark:text-white">{page}</span> of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || isLoading}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-pos-card border border-gray-200 dark:border-pos-border rounded-2xl max-w-md w-full shadow-2xl overflow-hidden relative animate-fade-in">
            <div className="bg-gradient-to-r from-green-600 to-green-500 px-6 py-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Register M-Pesa Code
              </h3>
              <p className="text-green-100 text-xs mt-0.5">Input details of a successful customer cash transfer</p>
            </div>

            <form onSubmit={handleAddTransaction} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl flex gap-2 items-start text-xs font-semibold text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  M-Pesa Transaction Code
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. QKL1A2B3C4"
                  maxLength={12}
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-gray-900 dark:text-white font-mono font-bold uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    Amount Paid (KES)
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="500"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-gray-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    Sender Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="0712345678"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-gray-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Sender Full Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Jane Doe"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-gray-100 dark:border-pos-border mt-5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-gray-150 hover:bg-gray-250 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white rounded-xl text-sm font-bold shadow-lg shadow-green-600/20 transition-all"
                >
                  {isSaving && <Loader2 className="w-4.5 h-4.5 animate-spin" />}
                  Register Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

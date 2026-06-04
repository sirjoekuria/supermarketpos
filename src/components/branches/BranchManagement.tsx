"use client";

import { useState, useEffect } from "react";
import {
  GitBranch, Plus, Edit2, X, Loader2, AlertTriangle,
  MapPin, Phone, CheckCircle, XCircle, Building2, Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBranchStore } from "@/store";
import type { Branch } from "@/types";

const emptyForm = { name: "", address: "", phone: "", is_active: true };

export default function BranchManagement() {
  const { branches, fetchBranches, isLoadingBranches } = useBranchStore();
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { fetchBranches(); }, [fetchBranches]);

  const openAdd = () => {
    setEditingBranch(null);
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  };

  const openEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setForm({
      name: branch.name,
      address: branch.address ?? "",
      phone: branch.phone ?? "",
      is_active: branch.is_active,
    });
    setError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Branch name is required"); return; }
    setIsSaving(true);
    setError("");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const method = editingBranch ? "PATCH" : "POST";
      const body = editingBranch ? { id: editingBranch.id, ...form } : form;
      const res = await fetch("/api/branches", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        let errMsg = `Server error (${res.status})`;
        try {
          const d = await res.json();
          errMsg = d.error || errMsg;
        } catch { /* response not JSON */ }
        setError(errMsg);
        return;
      }

      setShowModal(false);
      fetchBranches().catch(() => {});
    } catch (e: unknown) {
      clearTimeout(timeout);
      if (e instanceof Error && e.name === "AbortError") {
        setError("Request timed out. Check your connection and try again.");
      } else {
        setError(e instanceof Error ? e.message : "Failed to save branch");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async (branch: Branch) => {
    if (!confirm(`Deactivate "${branch.name}"?`)) return;
    setIsSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/branches?id=${branch.id}`, { method: "DELETE" });
      if (!res.ok) {
        let errMsg = `Failed to deactivate (${res.status})`;
        try { const d = await res.json(); errMsg = d.error || errMsg; } catch { /* not JSON */ }
        setError(errMsg);
        return;
      }
      fetchBranches().catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to deactivate branch");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary-500" /> Branch Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage store locations and branches
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Branch
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Branches", value: branches.length, color: "bg-primary-500" },
          { label: "Active", value: branches.filter(b => b.is_active).length, color: "bg-green-500" },
          { label: "Inactive", value: branches.filter(b => !b.is_active).length, color: "bg-gray-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white dark:bg-pos-card rounded-2xl p-4 border border-gray-200 dark:border-pos-border">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-2", color)}>
              <GitBranch className="w-4 h-4 text-white" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Branch List */}
      <div className="bg-white dark:bg-pos-card rounded-2xl border border-gray-200 dark:border-pos-border overflow-hidden">
        {isLoadingBranches ? (
          <div className="flex items-center justify-center p-12 text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mr-3 text-primary-500" /> Loading branches…
          </div>
        ) : branches.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-gray-500">
            <Building2 className="w-12 h-12 mb-4 opacity-30" />
            <p className="font-medium text-gray-900 dark:text-white">No branches yet</p>
            <p className="text-sm mt-1">Add your first branch to get started</p>
            <button
              onClick={openAdd}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Branch
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-pos-border">
            {branches.map((branch) => (
              <div
                key={branch.id}
                className="flex items-start gap-4 p-4 sm:p-5 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5",
                  branch.is_active ? "bg-primary-100 dark:bg-primary-900/30" : "bg-gray-100 dark:bg-gray-800"
                )}>
                  <Building2 className={cn(
                    "w-5 h-5",
                    branch.is_active ? "text-primary-600 dark:text-primary-400" : "text-gray-400"
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 dark:text-white">{branch.name}</p>
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                      branch.is_active
                        ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                        : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                    )}>
                      {branch.is_active
                        ? <><CheckCircle className="w-3 h-3" /> Active</>
                        : <><XCircle className="w-3 h-3" /> Inactive</>}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                    {branch.address && (
                      <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <MapPin className="w-3 h-3" /> {branch.address}
                      </span>
                    )}
                    {branch.phone && (
                      <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <Phone className="w-3 h-3" /> {branch.phone}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEdit(branch)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-primary-600 transition-colors"
                    title="Edit branch"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {branch.is_active && (
                    <button
                      onClick={() => handleDeactivate(branch)}
                      disabled={isSaving}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                      title="Deactivate branch"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-white dark:bg-pos-card rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md">
            <div className="p-5 border-b border-gray-200 dark:border-pos-border flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingBranch ? "Edit Branch" : "Add New Branch"}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {[
                { key: "name", label: "Branch Name *", placeholder: "e.g. Main Branch", type: "text" },
                { key: "address", label: "Address", placeholder: "e.g. 123 Main St, Nairobi", type: "text" },
                { key: "phone", label: "Phone", placeholder: "e.g. +254 700 000 000", type: "tel" },
              ].map(({ key, label, placeholder, type }) => (
                <label key={key} className="block space-y-1.5">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
                  <input
                    type={type}
                    value={form[key as keyof typeof form] as string}
                    onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </label>
              ))}
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                Active branch
              </label>
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}
            </div>
            <div className="p-5 pt-0 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-pos-border text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? "Saving…" : "Save Branch"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

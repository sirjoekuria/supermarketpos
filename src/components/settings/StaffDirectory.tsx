"use client";

import { useState } from "react";
import { useStaffStore } from "@/store";
import { Loader2, UserCog, Plus, Edit2, Trash2, Shield, Mail, Phone, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import type { User } from "@/types";
import { cn } from "@/lib/utils";

export default function StaffDirectory() {
  const { staff, addStaff, updateStaff, deleteStaff } = useStaffStore();
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<Partial<User> & { password?: string }>({
    full_name: "",
    email: "",
    role: "cashier",
    phone: "",
    is_active: true,
    password: "",
  });

  const openAdd = () => {
    setEditingStaff(null);
    setError("");
    setForm({ full_name: "", email: "", role: "cashier", phone: "", is_active: true, password: "" });
    setShowModal(true);
  };

  const openEdit = (user: User) => {
    setEditingStaff(user);
    setForm({ ...user });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.full_name || !form.email) {
      setError("Name and email are required.");
      return;
    }

    if (editingStaff) {
      // For now, just update local store until PUT /api/users is implemented
      updateStaff(editingStaff.id, form);
      setShowModal(false);
    } else {
      if (!form.password || form.password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      setIsLoading(true);
      setError("");
      try {
        const response = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await response.json();
        
        if (!response.ok) {
          setError(data.error || "Failed to create staff.");
          return;
        }
        
        addStaff(data.user);
        setShowModal(false);
      } catch (err: any) {
        setError(err.message || "Connection error.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="bg-white dark:bg-pos-card rounded-2xl border border-gray-200 dark:border-pos-border p-6 space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <UserCog className="w-5 h-5 text-gray-400" />
          Staff Directory
        </h3>
      </div>

      <div className="space-y-3">
        {staff.map((user) => (
          <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-pos-border">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold">
                {user.full_name.charAt(0)}
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  {user.full_name}
                  {user.is_active ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-red-500" />
                  )}
                </h4>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {user.email}</span>
                  {user.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {user.phone}</span>}
                  <span className={cn(
                    "px-2 py-0.5 rounded-full capitalize font-medium",
                    user.role === "admin" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" :
                    user.role === "manager" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                    "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                  )}>
                    {user.role}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => openEdit(user)} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => deleteStaff(user.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-pos-card rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b border-gray-200 dark:border-pos-border">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingStaff ? "Edit Staff" : "Add Staff"}
              </h2>
            </div>
            <div className="p-5 space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
              
              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</span>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={e => { setForm({ ...form, full_name: e.target.value }); setError(""); }}
                  className="w-full mt-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-sm"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => { setForm({ ...form, email: e.target.value }); setError(""); }}
                  className="w-full mt-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-sm"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone</span>
                <input
                  type="tel"
                  value={form.phone || ""}
                  onChange={e => { setForm({ ...form, phone: e.target.value }); setError(""); }}
                  className="w-full mt-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-sm"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Role</span>
                <select
                  value={form.role}
                  onChange={e => { setForm({ ...form, role: e.target.value as User["role"] }); setError(""); }}
                  className="w-full mt-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-sm"
                >
                  <option value="cashier">Cashier</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              
              {!editingStaff && (
                <label className="block">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Set Initial Password</span>
                  <input
                    type="password"
                    value={form.password || ""}
                    onChange={e => { setForm({ ...form, password: e.target.value }); setError(""); }}
                    placeholder="Minimum 6 characters"
                    className="w-full mt-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-sm"
                  />
                </label>
              )}

              <label className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => { setForm({ ...form, is_active: e.target.checked }); setError(""); }}
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Account</span>
              </label>
            </div>
            <div className="p-5 border-t border-gray-200 dark:border-pos-border flex justify-end gap-3">
              <button disabled={isLoading} onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-xl text-sm disabled:opacity-50">Cancel</button>
              <button disabled={isLoading} onClick={handleSave} className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm flex items-center gap-2 disabled:opacity-50">
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Loader2, LockKeyhole, ShoppingCart, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { User, UserRole } from "@/types";

type AuthMode = "login" | "register";

interface AuthPageProps {
  darkMode: boolean;
  onAuthenticated: (user: User) => void;
}

export default function AuthPage({ darkMode, onAuthenticated }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("cashier");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetFeedback = () => {
    setError("");
    setMessage("");
  };

  const submit = async () => {
    setIsSubmitting(true);
    resetFeedback();

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      if (mode === "register" && data.approval_status !== "approved") {
        setMessage(
          data.approval_status === "pending_manager"
            ? "Account created. A manager must approve this cashier account before login."
            : "Account created. An admin must approve this manager account before login."
        );
        setPassword("");
        return;
      }

      onAuthenticated(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn("min-h-screen flex items-center justify-center bg-gray-50 dark:bg-pos-dark p-4", darkMode && "dark")}>
      <div className="w-full max-w-md bg-white dark:bg-pos-card rounded-2xl shadow-xl border border-gray-200 dark:border-pos-border p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary-500 flex items-center justify-center">
            <ShoppingCart className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SuperMarket POS</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Staff access</p>
        </div>

        <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-5">
          {[
            { id: "login", label: "Sign In", icon: LockKeyhole },
            { id: "register", label: "Register", icon: UserPlus },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setMode(id as AuthMode);
                resetFeedback();
              }}
              className={cn(
                "flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                mode === id
                  ? "bg-white dark:bg-pos-card text-primary-600 dark:text-primary-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-400"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {mode === "register" && (
            <label className="space-y-1.5 block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</span>
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </label>
          )}

          <label className="space-y-1.5 block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </label>

          <label className="space-y-1.5 block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submit();
              }}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </label>

          {mode === "register" && (
            <label className="space-y-1.5 block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Role</span>
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as UserRole)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="cashier">Cashier</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </label>
          )}

          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {message && (
            <div className="px-4 py-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm">
              {message}
            </div>
          )}

          <button
            onClick={submit}
            disabled={isSubmitting || !email.trim() || !password || (mode === "register" && !fullName.trim())}
            className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : mode === "login" ? <LockKeyhole className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            {mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

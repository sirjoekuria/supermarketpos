"use client";

import { useState } from "react";
import { Loader2, LockKeyhole, ShoppingCart, UserPlus, Eye, EyeOff, HelpCircle, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import type { User, UserRole } from "@/types";

type AuthMode = "login" | "register" | "forgot";

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
  const [showPassword, setShowPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState<"request" | "reset">("request");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  const resetFeedback = () => {
    setError("");
    setMessage("");
  };

  const submit = async () => {
    setIsSubmitting(true);
    resetFeedback();

    try {
      if (mode === "forgot") {
        if (forgotStep === "request") {
          const response = await fetch("/api/auth/forgot-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Failed to request reset.");
          setForgotStep("reset");
          setMessage("Verification code generated. Retrieve it from the server console logs to proceed.");
        } else {
          const response = await fetch("/api/auth/forgot-password", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, code: resetCode, newPassword }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Failed to reset password.");
          setMode("login");
          setForgotStep("request");
          setResetCode("");
          setNewPassword("");
          setMessage("Password updated successfully. You can now Sign In.");
        }
        return;
      }

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

  // Compute whether the submit button should be disabled based on current mode/step
  const isSubmitDisabled = (() => {
    if (isSubmitting) return true;
    if (mode === "forgot") {
      if (forgotStep === "request") return !email.trim();
      return !resetCode.trim() || newPassword.length < 6;
    }
    if (!email.trim() || !password) return true;
    if (mode === "register" && !fullName.trim()) return true;
    return false;
  })();

  return (
    <div className={cn("min-h-screen flex items-center justify-center bg-gray-50 dark:bg-pos-dark p-4", darkMode && "dark")}>
      <div className="w-full max-w-md bg-white dark:bg-pos-card rounded-2xl shadow-xl border border-gray-200 dark:border-pos-border p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary-500 flex items-center justify-center">
            <ShoppingCart className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SuperMarket POS</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {mode === "forgot" ? "Password Recovery" : "Staff access"}
          </p>
        </div>

        {/* Tab switcher — hidden when in forgot mode */}
        {mode !== "forgot" && (
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
        )}

        {/* ── FORGOT PASSWORD FLOW ── */}
        {mode === "forgot" ? (
          <div className="space-y-4">
            {/* Step indicator */}
            <div className="flex items-center gap-3 mb-2">
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                "bg-primary-600 text-white"
              )}>1</div>
              <div className={cn("h-0.5 flex-1", forgotStep === "reset" ? "bg-primary-500" : "bg-gray-200 dark:bg-gray-700")} />
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                forgotStep === "reset" ? "bg-primary-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-400"
              )}>2</div>
            </div>

            {forgotStep === "request" ? (
              <>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Enter your registered email address. A 6-digit verification code will be generated.
                </p>
                <label className="space-y-1.5 block">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                    placeholder="your@email.com"
                    autoFocus
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </label>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Check the server console / terminal for your 6-digit code. Enter it below along with your new password.
                </p>
                <label className="space-y-1.5 block">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">6-Digit Verification Code</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="••••••"
                    autoFocus
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 tracking-[0.5em] text-center font-mono text-lg"
                  />
                </label>
                <label className="space-y-1.5 block">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">New Password</span>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                      placeholder="Min. 6 characters"
                      className="w-full pl-4 pr-10 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {newPassword.length > 0 && newPassword.length < 6 && (
                    <p className="text-xs text-red-500 mt-1">Password must be at least 6 characters.</p>
                  )}
                </label>
              </>
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
              disabled={isSubmitDisabled}
              className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              {forgotStep === "request" ? "Send Verification Code" : "Reset Password"}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("login");
                setForgotStep("request");
                setResetCode("");
                setNewPassword("");
                resetFeedback();
              }}
              className="w-full text-center text-sm text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors py-1"
            >
              ← Back to Sign In
            </button>
          </div>
        ) : (
          /* ── LOGIN / REGISTER FLOW ── */
          <div className="space-y-4">
            {mode === "register" && (
              <label className="space-y-1.5 block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</span>
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="John Doe"
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
                placeholder="your@email.com"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </label>

            <label className="space-y-1.5 block">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</span>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => { setMode("forgot"); resetFeedback(); }}
                    className="text-xs text-primary-600 dark:text-primary-400 hover:underline transition-colors"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") submit();
                  }}
                  placeholder="••••••••"
                  className="w-full pl-4 pr-10 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
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
              disabled={isSubmitDisabled}
              className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : mode === "login" ? <LockKeyhole className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
              {mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

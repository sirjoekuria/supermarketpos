"use client";

import { useState, useRef, useEffect } from "react";
import { X, Fingerprint, Lock, AlertCircle, CheckCircle2, Loader2, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

interface ManagerAuthProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthorize: (managerId: string) => void;
  action: string;
}

type AuthMethod = "fingerprint" | "password";

export default function ManagerAuth({
  isOpen,
  onClose,
  onAuthorize,
  action,
}: ManagerAuthProps) {
  const [method, setMethod] = useState<AuthMethod>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isOpen && method === "password") {
      setTimeout(() => emailRef.current?.focus(), 100);
    }
    // Reset state on open
    if (isOpen) {
      setError("");
      setSuccess("");
      setPassword("");
    }
  }, [isOpen, method]);

  // Cleanup any pending request on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const verifyPassword = async () => {
    if (!email.trim()) { setError("Please enter your email."); return; }
    if (!password || password.length < 4) { setError("Please enter your password."); return; }

    // Abort any previous pending request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Auto-abort after 30 seconds
    const timeout = setTimeout(() => {
      controller.abort();
      setIsVerifying(false);
      setError("Request timed out. Check your connection and try again.");
    }, 30000);

    setIsVerifying(true);
    setError("");

    try {
      const response = await fetch("/api/manager-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "password", email: email.trim(), password, action }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Authorization failed.");
        setPassword("");
        return;
      }

      setSuccess(`Authorized — ${data.managerName || "Manager"}`);
      setTimeout(() => {
        onAuthorize(data.managerId);
        setEmail("");
        setPassword("");
        setSuccess("");
        onClose();
      }, 600);
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === "AbortError") return; // Aborted by timeout handler already
      setError("Connection error. Please try again.");
      setPassword("");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFingerprint = async () => {
    if (!window.PublicKeyCredential) {
      setError("Biometric authentication not supported on this device.");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = setTimeout(() => {
      controller.abort();
      setIsVerifying(false);
      setError("Request timed out.");
    }, 30000);

    setIsVerifying(true);
    setError("");

    try {
      const response = await fetch("/api/manager-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "webauthn", action }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Biometric auth failed.");

      setSuccess("Biometric verified!");
      setTimeout(() => {
        onAuthorize(data.managerId);
        setSuccess("");
        onClose();
      }, 600);
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === "AbortError") return;
      setError(err.message || "Biometric authentication failed.");
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-white dark:bg-pos-card rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-pos-border">
          <div className="flex items-center gap-3">
            <Lock className="w-6 h-6 text-amber-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Manager Authorization</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <span className="font-semibold">Action: </span>{action}
          </p>

          {/* Auth Method Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => { setMethod("password"); setError(""); }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
                method === "password"
                  ? "bg-primary-600 text-white shadow-md"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              )}
            >
              <Lock className="w-4 h-4" />
              Password
            </button>
            <button
              onClick={() => { setMethod("fingerprint"); setError(""); }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
                method === "fingerprint"
                  ? "bg-primary-600 text-white shadow-md"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              )}
            >
              <Fingerprint className="w-4 h-4" />
              Biometric
            </button>
          </div>

          {/* Email + Password */}
          {method === "password" && (
            <div className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") verifyPassword(); }}
                  placeholder="Manager email"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  autoComplete="username"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") verifyPassword(); }}
                  placeholder="Manager password"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-gray-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
                  autoComplete="current-password"
                />
              </div>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center">
                Use your manager / admin login credentials
              </p>
              <button
                onClick={verifyPassword}
                disabled={isVerifying || !email.trim() || !password}
                className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-xl font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <><Loader2 className="w-5 h-5 animate-spin" />Verifying...</>
                ) : (
                  <><Lock className="w-5 h-5" />Authorize</>
                )}
              </button>
            </div>
          )}

          {/* Biometric */}
          {method === "fingerprint" && (
            <div className="space-y-4 text-center py-6">
              <div className="w-24 h-24 mx-auto rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center">
                <Fingerprint className="w-12 h-12 text-primary-600 dark:text-primary-400" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Place your finger on the scanner to authenticate
              </p>
              <button
                onClick={handleFingerprint}
                disabled={isVerifying}
                className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-xl font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <><Loader2 className="w-5 h-5 animate-spin" />Scanning...</>
                ) : (
                  <><Fingerprint className="w-5 h-5" />Start Biometric</>
                )}
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-600 dark:text-green-400 text-sm">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              {success}
            </div>
          )}

          <p className="text-xs text-gray-400 text-center">
            Only authorized managers &amp; admins can perform this action
          </p>
        </div>
      </div>
    </div>
  );
}

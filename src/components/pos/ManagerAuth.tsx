"use client";

import { useState, useRef, useEffect } from "react";
import { X, Fingerprint, Lock, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ManagerAuthProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthorize: (managerId: string) => void;
  action: string;
}

type AuthMethod = "fingerprint" | "webauthn" | "pin";

export default function ManagerAuth({
  isOpen,
  onClose,
  onAuthorize,
  action,
}: ManagerAuthProps) {
  const [method, setMethod] = useState<AuthMethod>("pin");
  const [pinInput, setPinInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && method === "pin") {
      inputRef.current?.focus();
    }
  }, [isOpen, method]);

  const verifyPin = async () => {
    if (pinInput.length < 4) {
      setError("PIN must be at least 4 digits");
      return;
    }

    setIsVerifying(true);
    setError("");

    try {
      const response = await fetch("/api/manager-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "pin", pin: pinInput, action }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Invalid PIN");
        setPinInput("");
        return;
      }

      setSuccess("Authorized successfully!");
      setTimeout(() => {
        onAuthorize(data.managerId);
        setPinInput("");
        setSuccess("");
        onClose();
      }, 500);
    } catch (err) {
      setError("Authentication failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFingerprint = async () => {
    if (!window.PublicKeyCredential) {
      setError("Biometric authentication not supported on this device");
      return;
    }

    setIsVerifying(true);
    setError("");

    try {
      const response = await fetch("/api/manager-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "webauthn", action }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Biometric auth failed");
      }

      setSuccess("Biometric verified!");
      setTimeout(() => {
        onAuthorize(data.managerId);
        setSuccess("");
        onClose();
      }, 500);
    } catch (err: any) {
      setError(err.message || "Biometric authentication failed");
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
              onClick={() => setMethod("pin")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
                method === "pin"
                  ? "bg-primary-600 text-white shadow-md"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              )}
            >
              <Lock className="w-4 h-4" />
              PIN
            </button>
            <button
              onClick={() => setMethod("fingerprint")}
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

          {/* PIN Input */}
          {method === "pin" && (
            <div className="space-y-3">
              <input
                ref={inputRef}
                type="password"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    verifyPin();
                  }
                }}
                placeholder="Enter manager PIN"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-gray-900 dark:text-white text-lg font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-primary-500"
                maxLength="6"
              />
              <button
                onClick={verifyPin}
                disabled={isVerifying || pinInput.length < 4}
                className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-xl font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <><Loader2 className="w-5 h-5 animate-spin" />Verifying...</>
                ) : (
                  <><Lock className="w-5 h-5" />Verify PIN</>
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

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm animate-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-600 dark:text-green-400 text-sm animate-in">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              {success}
            </div>
          )}

          <p className="text-xs text-gray-400 text-center mt-4">
            Only authorized managers can perform this action
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { Phone, Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface MpesaPaymentProps {
  amount: number;
  onSuccess: (transactionId: string) => void;
  onFailure: (error: string) => void;
  onCancel: () => void;
}

type PaymentStatus = "idle" | "initiating" | "pending" | "success" | "failed";

export default function MpesaPayment({
  amount,
  onSuccess,
  onFailure,
  onCancel,
}: MpesaPaymentProps) {
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const [checkoutRequestId, setCheckoutRequestId] = useState("");
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(120);

  const validatePhone = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, "");
    return cleaned.length >= 9 && cleaned.length <= 12;
  };

  const formatPhoneForAPI = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("254")) return cleaned;
    if (cleaned.startsWith("0")) return "254" + cleaned.substring(1);
    if (cleaned.startsWith("7")) return "254" + cleaned;
    return cleaned;
  };

  const initiateSTKPush = async () => {
    if (!validatePhone(phone)) {
      setError("Please enter a valid phone number");
      return;
    }
    setStatus("initiating");
    setError("");
    try {
      const response = await fetch("/api/mpesa/stkpush", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: formatPhoneForAPI(phone),
          amount,
          accountReference: `POS-${Date.now()}`,
          transactionDesc: "Supermarket Purchase",
        }),
      });
      const data = await response.json();
      if (data.success && data.checkoutRequestId) {
        setCheckoutRequestId(data.checkoutRequestId);
        setStatus("pending");
        setCountdown(120);
      } else {
        throw new Error(data.message || "Failed to initiate payment");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to initiate M-Pesa payment";
      setStatus("failed");
      setError(msg);
      onFailure(msg);
    }
  };

  const checkPaymentStatus = useCallback(async () => {
    if (!checkoutRequestId || status !== "pending") return;
    try {
      const response = await fetch(
        `/api/mpesa/query?checkoutRequestId=${checkoutRequestId}`
      );
      const data = await response.json();
      if (data.status === "success") {
        setStatus("success");
        onSuccess(data.mpesaReceiptNumber || checkoutRequestId);
      } else if (data.status === "failed") {
        setStatus("failed");
        setError(data.message || "Payment failed");
        onFailure(data.message || "Payment failed");
      }
    } catch (err) {
      console.error("Status check error:", err);
    }
  }, [checkoutRequestId, status, onSuccess, onFailure]);

  useEffect(() => {
    if (status !== "pending") return;
    const interval = setInterval(checkPaymentStatus, 3000);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setStatus("failed");
          setError("Payment timeout. Please try again.");
          onFailure("Payment timeout");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      clearInterval(interval);
      clearInterval(timer);
    };
  }, [status, checkPaymentStatus, onFailure]);

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white dark:bg-pos-card rounded-2xl shadow-xl border border-gray-200 dark:border-pos-border overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-green-500 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">M-Pesa Payment</h3>
              <p className="text-green-100 text-sm">Lipa na M-Pesa</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Amount to Pay</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(amount)}
            </p>
          </div>

          {status === "idle" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  M-Pesa Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setError(""); }}
                    placeholder="e.g. 0712345678"
                    className={cn(
                      "w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all",
                      error
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-200 dark:border-pos-border focus:ring-green-500"
                    )}
                  />
                </div>
                {error && (
                  <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />{error}
                  </p>
                )}
                <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                  You will receive an STK push on your phone
                </p>
              </div>
              <button
                onClick={initiateSTKPush}
                className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-green-600/20"
              >
                Request STK Push
              </button>
            </div>
          )}

          {status === "initiating" && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-green-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-900 dark:text-white font-medium">Initiating payment...</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Please wait</p>
            </div>
          )}

          {status === "pending" && (
            <div className="text-center py-8">
              <div className="relative w-16 h-16 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-green-200 dark:border-green-900 animate-ping" />
                <div className="absolute inset-2 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Phone className="w-6 h-6 text-green-600 dark:text-green-400 animate-pulse" />
                </div>
              </div>
              <p className="text-gray-900 dark:text-white font-medium mb-1">Check your phone</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Enter your M-Pesa PIN to complete
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 rounded-full">
                <span className="text-sm font-mono text-green-700 dark:text-green-300">
                  {countdown}s
                </span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
                Checkout ID: {checkoutRequestId}
              </p>
            </div>
          )}

          {status === "success" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-gray-900 dark:text-white font-medium text-lg">
                Payment Successful!
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Transaction completed
              </p>
            </div>
          )}

          {status === "failed" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <p className="text-gray-900 dark:text-white font-medium">Payment Failed</p>
              <p className="text-sm text-red-500 dark:text-red-400 mt-1">{error}</p>
              <button
                onClick={() => { setStatus("idle"); setError(""); }}
                className="mt-4 px-6 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {status !== "success" && (
            <button
              onClick={onCancel}
              className="w-full mt-4 py-2.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm font-medium transition-colors"
            >
              Cancel Payment
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

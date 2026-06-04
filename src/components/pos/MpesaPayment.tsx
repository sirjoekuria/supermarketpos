"use client";

import { useState, useEffect, useRef } from "react";
import { Phone, Loader2, CheckCircle2, XCircle, AlertCircle, Sparkles } from "lucide-react";
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
  const [countdown, setCountdown] = useState(60);
  const [inputMode, setInputMode] = useState<"stk" | "manual">("stk");
  const [manualCode, setManualCode] = useState("");
  const [manualError, setManualError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationWarning, setVerificationWarning] = useState("");
  const [showForceConfirm, setShowForceConfirm] = useState(false);
  const [verifiedTx, setVerifiedTx] = useState<{
    mpesaReceiptNumber: string;
    amount: number;
    phoneNumber: string;
    customerName: string;
  } | null>(null);

  const handleManualConfirm = async () => {
    const code = manualCode.trim().toUpperCase();
    if (code.length < 8) {
      setManualError("Enter the full M-Pesa confirmation code (e.g. QKL1A2B3C4)");
      return;
    }
    
    setIsVerifying(true);
    setManualError("");
    setVerificationWarning("");
    setShowForceConfirm(false);
    setVerifiedTx(null);

    try {
      const response = await fetch(`/api/mpesa/verify-code?code=${code}&amount=${amount}`);
      const data = await response.json();
      
      if (data.success) {
        setVerifiedTx({
          mpesaReceiptNumber: data.mpesaReceiptNumber,
          amount: Number(data.amount),
          phoneNumber: data.phoneNumber,
          customerName: data.customerName,
        });
      } else {
        setVerificationWarning(data.message || "Transaction code was not found in the database.");
        setShowForceConfirm(true);
      }
    } catch (err) {
      console.error("Manual verification failed:", err);
      setVerificationWarning("Failed to connect to verification server. You can force-confirm if needed.");
      setShowForceConfirm(true);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCompleteManualCheckout = () => {
    if (!verifiedTx) return;
    setStatus("success");
    setTimeout(() => {
      onSuccess(verifiedTx.mpesaReceiptNumber);
    }, 1800);
  };

  const handleForceConfirm = () => {
    const code = manualCode.trim().toUpperCase();
    setStatus("success");
    setTimeout(() => {
      onSuccess(code);
    }, 1800);
  };

  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  // Confetti Particle System
  useEffect(() => {
    if (status !== "success") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = canvas.parentElement?.clientWidth || 400;
      canvas.height = canvas.parentElement?.clientHeight || 450;
    };
    
    resizeCanvas();

    const colors = ["#22c55e", "#3b82f6", "#eab308", "#a855f7", "#ec4899", "#f97316"];
    const particles: any[] = [];

    // Launch dual-stream confetti from bottom corners
    const particleCount = 120;
    for (let i = 0; i < particleCount; i++) {
      const fromLeft = i % 2 === 0;
      particles.push({
        x: fromLeft ? 0 : canvas.width,
        y: canvas.height - 10,
        size: Math.random() * 6 + 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedX: fromLeft ? Math.random() * 7 + 4 : -Math.random() * 7 - 4,
        speedY: -Math.random() * 12 - 10, // shoot up
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 8,
        gravity: 0.28,
        friction: 0.98,
        opacity: 1,
      });
    }

    let animationId: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let anyAlive = false;

      particles.forEach((p) => {
        if (p.opacity <= 0) return;

        anyAlive = true;
        p.speedX *= p.friction;
        p.speedY *= p.friction;
        p.speedY += p.gravity;
        p.x += p.speedX;
        p.y += p.speedY;
        p.rotation += p.rotationSpeed;
        p.opacity -= 0.008;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;
        
        // Draw square confetti
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      if (anyAlive) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [status]);

  const initiateSTKPush = async () => {
    if (!validatePhone(phone)) {
      setError("Please enter a valid Safaricom phone number");
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
        setCountdown(60); // Set countdown window of 60 seconds
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

  // Main polling effect while payment is pending
  useEffect(() => {
    if (status !== "pending" || !checkoutRequestId) return;

    let active = true;
    let elapsed = 0;
    let timeoutId: NodeJS.Timeout;

    const checkStatus = async () => {
      if (!active) return;
      try {
        const response = await fetch(
          `/api/mpesa/query?checkoutRequestId=${checkoutRequestId}&elapsed=${elapsed}`
        );
        const data = await response.json();
        if (!active) return; // component unmounted during fetch
        if (data.status === "success") {
          setStatus("success");
          // Play confetti for 1.8s before triggering onSuccess
          setTimeout(() => {
            onSuccess(data.mpesaReceiptNumber || checkoutRequestId);
          }, 1800);
          return; // Stop polling on success
        } else if (data.status === "failed") {
          setStatus("failed");
          setError(data.message || "Payment failed");
          onFailure(data.message || "Payment failed");
          return; // Stop polling on failure
        }
      } catch (err) {
        console.error("Status check error:", err);
      }
      elapsed += 1.5;
      
      // Schedule next check (fast polling: 1.5 seconds)
      if (active) {
        timeoutId = setTimeout(checkStatus, 1500);
      }
    };

    // Run first check immediately (fast DB lookup)
    checkStatus();

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          active = false;
          clearTimeout(timeoutId);
          clearInterval(timer);
          setStatus("failed");
          setError("Payment timed out. Customer did not enter their PIN within 60 seconds.");
          onFailure("Payment timeout");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      active = false;
      clearTimeout(timeoutId);
      clearInterval(timer);
    };
  }, [status, checkoutRequestId, onSuccess, onFailure]);

  // Fallback background checker when status is failed or idle but we have a checkoutRequestId (in case callback is late)
  useEffect(() => {
    if (status === "success" || !checkoutRequestId) return;

    let active = true;
    const checkDbFallback = async () => {
      try {
        const response = await fetch(`/api/mpesa/query?checkoutRequestId=${checkoutRequestId}`);
        const data = await response.json();
        if (!active) return;
        if (data.status === "success") {
          setStatus("success");
          // Play confetti for 1.8s before triggering onSuccess
          setTimeout(() => {
            onSuccess(data.mpesaReceiptNumber || checkoutRequestId);
          }, 1800);
        }
      } catch (err) {
        console.error("Fallback DB query failed:", err);
      }
    };

    // Check DB status immediately when hook is triggered (e.g. switching tabs or timing out)
    checkDbFallback();

    // Query every 4 seconds to capture delayed callbacks
    const interval = setInterval(checkDbFallback, 4000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [inputMode, checkoutRequestId, status, onSuccess]);

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white dark:bg-pos-card rounded-2xl shadow-2xl border border-gray-200 dark:border-pos-border overflow-hidden relative transition-all duration-300">
        {/* Canvas for Celebration Confetti */}
        {status === "success" && (
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-50 rounded-2xl" />
        )}

        <div className="bg-gradient-to-r from-green-600 to-green-500 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Phone className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">M-Pesa Payment</h3>
              <p className="text-green-100 text-sm font-medium">Lipa na M-Pesa Online</p>
            </div>
          </div>
        </div>

        <div className="p-6 relative">
          <div className="text-center mb-6">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Amount to Pay</p>
            <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              {formatCurrency(amount)}
            </p>
          </div>

          {status === "idle" && (
            <div className="space-y-4">
              {/* Mode toggle */}
              <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                <button
                  onClick={() => setInputMode("stk")}
                  className={cn(
                    "flex-1 py-2 text-sm font-semibold rounded-lg transition-all",
                    inputMode === "stk"
                      ? "bg-white dark:bg-gray-700 text-green-600 shadow-sm"
                      : "text-gray-500 dark:text-gray-400"
                  )}
                >
                  STK Push
                </button>
                <button
                  onClick={() => setInputMode("manual")}
                  className={cn(
                    "flex-1 py-2 text-sm font-semibold rounded-lg transition-all",
                    inputMode === "manual"
                      ? "bg-white dark:bg-gray-700 text-green-600 shadow-sm"
                      : "text-gray-500 dark:text-gray-400"
                  )}
                >
                  Enter Code
                </button>
              </div>

              {inputMode === "stk" ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Customer M-Pesa Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value); setError(""); }}
                      placeholder="e.g. 0712345678"
                      className={cn(
                        "w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all font-medium text-lg",
                        error
                          ? "border-red-300 focus:ring-red-500"
                          : "border-gray-200 dark:border-pos-border focus:ring-green-500"
                      )}
                    />
                  </div>
                  {error && (
                    <p className="mt-2 text-sm text-red-500 flex items-center gap-1.5 font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0" />{error}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                    A payment prompt (STK Push) will be sent instantly to the phone number entered above.
                  </p>
                  <button
                    onClick={initiateSTKPush}
                    className="w-full mt-4 py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-green-600/30 text-lg"
                  >
                    Request STK Push
                  </button>
                </div>
              ) : (
                <div>
                  {/* Automatic check indicator if STK Push was sent */}
                  {checkoutRequestId && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 rounded-xl mb-4 text-left">
                      <div className="flex gap-2.5 items-start text-xs font-semibold text-blue-600 dark:text-blue-400">
                        <Loader2 className="w-4 h-4 animate-spin shrink-0 mt-0.5" />
                        <div>
                          <p className="uppercase tracking-wider">Checking STK Push Status...</p>
                          <p className="text-gray-500 dark:text-gray-400 font-medium normal-case mt-0.5 leading-relaxed">
                            We are auto-detecting the payment in the database. If the customer has already paid, the POS will complete the checkout automatically.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {verifiedTx ? (
                    <div className="space-y-4">
                      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-xl p-5 text-left">
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                          <h4 className="text-sm font-bold text-green-800 dark:text-green-400 uppercase tracking-wider">
                            Transaction Verified
                          </h4>
                        </div>
                        <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300 font-medium">
                          <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-1.5">
                            <span className="text-gray-500 dark:text-gray-400">Code:</span>
                            <span className="font-bold text-gray-900 dark:text-white font-mono">{verifiedTx.mpesaReceiptNumber}</span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-1.5">
                            <span className="text-gray-500 dark:text-gray-400">Paid Amount:</span>
                            <span className="font-extrabold text-green-600 dark:text-green-400">{formatCurrency(verifiedTx.amount)}</span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-1.5">
                            <span className="text-gray-500 dark:text-gray-400">Customer Name:</span>
                            <span className="text-gray-900 dark:text-white">{verifiedTx.customerName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Phone Number:</span>
                            <span className="text-gray-900 dark:text-white">{verifiedTx.phoneNumber}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => { setVerifiedTx(null); setManualCode(""); }}
                          className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-all active:scale-[0.98] text-sm"
                        >
                          Change Code
                        </button>
                        <button
                          onClick={handleCompleteManualCheckout}
                          className="flex-[2] py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-green-600/30 text-base"
                        >
                          Complete Checkout
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        M-Pesa Confirmation Code
                      </label>
                      <input
                        type="text"
                        value={manualCode}
                        onChange={(e) => {
                          setManualCode(e.target.value.toUpperCase());
                          setManualError("");
                          setVerificationWarning("");
                          setShowForceConfirm(false);
                        }}
                        placeholder="e.g. QKL1A2B3C4"
                        maxLength={12}
                        className={cn(
                          "w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all font-mono font-bold text-xl tracking-widest text-center uppercase",
                          manualError
                            ? "border-red-300 focus:ring-red-500"
                            : "border-gray-200 dark:border-pos-border focus:ring-green-500"
                        )}
                        disabled={isVerifying}
                      />
                      {manualError && (
                        <p className="mt-2 text-sm text-red-500 flex items-center gap-1.5 font-medium">
                          <AlertCircle className="w-4 h-4 shrink-0" />{manualError}
                        </p>
                      )}

                      {verificationWarning && (
                        <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl text-left">
                          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">
                            Verification Status:
                          </p>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 leading-relaxed">
                            {verificationWarning}
                          </p>
                        </div>
                      )}

                      <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 leading-relaxed text-left">
                        Ask the customer for their M-Pesa SMS confirmation code and type it here exactly.
                      </p>

                      <div className="flex flex-col gap-2.5 mt-4">
                        <button
                          onClick={handleManualConfirm}
                          disabled={isVerifying}
                          className="w-full py-4 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white font-bold rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-green-600/30 text-lg flex items-center justify-center gap-2"
                        >
                          {isVerifying && <Loader2 className="w-5 h-5 animate-spin" />}
                          {isVerifying ? "Verifying with Database..." : "Verify & Confirm Payment"}
                        </button>

                        {showForceConfirm && (
                          <button
                            onClick={handleForceConfirm}
                            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all active:scale-[0.98] shadow-md text-sm"
                          >
                            Force Confirm Anyway (Skip Verification)
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {status === "initiating" && (
            <div className="text-center py-10">
              <Loader2 className="w-12 h-12 text-green-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-900 dark:text-white font-bold text-lg">Contacting Safaricom...</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">Initiating secure STK Push request</p>
            </div>
          )}

          {status === "pending" && (
            <div className="text-center py-8">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-green-200 dark:border-green-900/50 animate-ping opacity-75" />
                <div className="absolute inset-2 rounded-full bg-green-50 dark:bg-green-950/40 flex items-center justify-center border border-green-100 dark:border-green-900">
                  <Phone className="w-8 h-8 text-green-600 dark:text-green-400 animate-pulse" />
                </div>
              </div>
              <p className="text-gray-900 dark:text-white font-bold text-xl mb-1">Check Phone Prompt!</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-[280px] mx-auto leading-relaxed">
                The customer has been sent an STK prompt. Please ask them to enter their M-Pesa PIN.
              </p>
              
              {/* Premium 45s countdown timer badge */}
              <div className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-50 dark:bg-green-950/40 border border-green-100 dark:border-green-900 rounded-2xl shadow-sm">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-lg font-black font-mono text-green-700 dark:text-green-400">
                  Waiting: {countdown}s
                </span>
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-5 font-mono select-all">
                ID: {checkoutRequestId}
              </p>
            </div>
          )}

          {status === "success" && (
            <div className="text-center py-10 relative z-10">
              <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-green-100 dark:bg-green-950/40 border border-green-200 dark:border-green-800 flex items-center justify-center shadow-lg shadow-green-500/10">
                <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400 animate-bounce" />
              </div>
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse" />
                <h3 className="text-gray-900 dark:text-white font-extrabold text-2xl tracking-tight">
                  Payment Successful!
                </h3>
                <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[260px] mx-auto mt-2 leading-relaxed">
                Transaction has been completed and verified successfully.
              </p>
            </div>
          )}

          {status === "failed" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900 flex items-center justify-center shadow-md">
                <XCircle className="w-9 h-9 text-red-500" />
              </div>
              <h3 className="text-gray-900 dark:text-white font-bold text-xl">Payment Failed</h3>
              
              {/* Detailed custom failure card showing specific M-Pesa error reasons */}
              <div className="mt-4 mx-auto max-w-[320px] p-4 bg-red-50 dark:bg-red-950/30 border border-red-100/80 dark:border-red-900/50 rounded-xl text-left">
                <p className="text-xs font-semibold text-red-500 dark:text-red-400 uppercase tracking-wider mb-1">
                  Reason for Failure:
                </p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 leading-relaxed">
                  {error || "An unknown error occurred while verifying the transaction."}
                </p>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setStatus("idle"); setError(""); setCountdown(45); }}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all shadow-md active:scale-95"
                >
                  Try Again
                </button>
                <button
                  onClick={onCancel}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-all active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {status !== "success" && status !== "failed" && (
            <button
              onClick={onCancel}
              className="w-full mt-5 py-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm font-bold transition-colors"
            >
              Cancel Payment Window
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


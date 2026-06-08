"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, CheckCircle2, XCircle, AlertCircle, Sparkles, Smartphone, Phone } from "lucide-react";
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

  const SUCCESS_FLASH_MS = 400;

  const handleCompleteManualCheckout = () => {
    if (!verifiedTx) return;
    setStatus("success");
    setTimeout(() => {
      onSuccess(verifiedTx.mpesaReceiptNumber);
    }, SUCCESS_FLASH_MS);
  };

  const handleForceConfirm = () => {
    const code = manualCode.trim().toUpperCase();
    setStatus("success");
    setTimeout(() => {
      onSuccess(code);
    }, SUCCESS_FLASH_MS);
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

  const playSuccessChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.18);
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.18);
        gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + i * 0.18 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.55);
        osc.start(ctx.currentTime + i * 0.18);
        osc.stop(ctx.currentTime + i * 0.18 + 0.6);
      });
    } catch {
      // Audio not available
    }
  };

  useEffect(() => {
    if (status !== "success") return;
    playSuccessChime();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resizeCanvas = () => {
      canvas.width  = canvas.parentElement?.clientWidth  || 400;
      canvas.height = canvas.parentElement?.clientHeight || 450;
    };
    resizeCanvas();
    const colors = ["#22c55e", "#3b82f6", "#eab308", "#a855f7", "#ec4899", "#f97316", "#ffffff", "#06b6d4"];
    const createBurst = (count: number, speedMult: number) => {
      const burst: {
        x: number; y: number; size: number; color: string;
        speedX: number; speedY: number; rotation: number;
        rotationSpeed: number; gravity: number; friction: number;
        opacity: number; shape: "square" | "circle" | "strip";
      }[] = [];
      for (let i = 0; i < count; i++) {
        const zone = i % 3;
        const fromLeft  = zone === 0;
        const fromRight = zone === 1;
        const fromCenter = zone === 2;
        burst.push({
          x: fromLeft ? 0 : fromRight ? canvas.width : canvas.width / 2 + (Math.random() - 0.5) * 60,
          y: fromCenter ? -10 : canvas.height - 10,
          size: Math.random() * 8 + 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          speedX: fromLeft ? Math.random() * 9 * speedMult + 3 : fromRight ? -(Math.random() * 9 * speedMult + 3) : (Math.random() - 0.5) * 10 * speedMult,
          speedY: fromCenter ? Math.random() * 8 * speedMult + 4 : -(Math.random() * 14 * speedMult + 8),
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 12,
          gravity: 0.3,
          friction: 0.98,
          opacity: 1,
          shape: (["square", "circle", "strip"] as const)[Math.floor(Math.random() * 3)],
        });
      }
      return burst;
    };
    let particles = createBurst(200, 1.0);
    let animationId: number;
    let burst2Added = false;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let anyAlive = false;
      if (!burst2Added && particles.every(p => p.speedY > -2)) {
        burst2Added = true;
        particles = [...particles, ...createBurst(200, 1.2)];
        playSuccessChime();
      }
      particles.forEach((p) => {
        if (p.opacity <= 0) return;
        anyAlive = true;
        p.speedX *= p.friction;
        p.speedY *= p.friction;
        p.speedY += p.gravity;
        p.x += p.speedX;
        p.y += p.speedY;
        p.rotation += p.rotationSpeed;
        p.opacity -= 0.006;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;
        if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === "strip") {
          ctx.fillRect(-p.size / 4, -p.size * 1.5, p.size / 2, p.size * 3);
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        }
        ctx.restore();
      });
      if (anyAlive) {
        animationId = requestAnimationFrame(animate);
      }
    };
    animate();
    return () => { cancelAnimationFrame(animationId); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        setCountdown(60);
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

  useEffect(() => {
    if (status !== "pending" || !checkoutRequestId) return;

    let active = true;
    let timeoutId: NodeJS.Timeout;
    let countdownTimer: NodeJS.Timeout;
    const pollStart = Date.now();

    const finishSuccess = (receipt: string) => {
      if (!active) return;
      active = false;
      clearTimeout(timeoutId);
      clearInterval(countdownTimer);
      setStatus("success");
      setTimeout(() => onSuccess(receipt), SUCCESS_FLASH_MS);
    };

    const finishFailure = (message: string) => {
      if (!active) return;
      active = false;
      clearTimeout(timeoutId);
      clearInterval(countdownTimer);
      setStatus("failed");
      setError(message);
      onFailure(message);
    };

    const checkStatus = async () => {
      if (!active) return;
      const elapsed = (Date.now() - pollStart) / 1000;
      try {
        const response = await fetch(
          `/api/mpesa/query?checkoutRequestId=${encodeURIComponent(checkoutRequestId)}&elapsed=${elapsed.toFixed(1)}`,
          { cache: "no-store" }
        );
        const data = await response.json();
        if (!active) return;

        if (data.status === "success") {
          finishSuccess(data.mpesaReceiptNumber || "");
          return;
        }
        if (data.status === "failed") {
          finishFailure(data.message || "Payment failed");
          return;
        }
      } catch (err) {
        console.error("Status check error:", err);
      }

      if (active) {
        const nextInterval = elapsed < 15 ? 200 : 500;
        timeoutId = setTimeout(checkStatus, nextInterval);
      }
    };

    checkStatus();

    countdownTimer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          finishFailure("Payment timed out. Customer did not enter their PIN within 60 seconds.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      active = false;
      clearTimeout(timeoutId);
      clearInterval(countdownTimer);
    };
  }, [status, checkoutRequestId, onSuccess, onFailure]);

  return (
    <section className="flex-grow bg-white dark:bg-[#1a1f2e] rounded-2xl overflow-hidden flex flex-col relative transition-all duration-300 border border-gray-200 dark:border-gray-700/50 h-full">
      {status === "success" && (
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-50 rounded-2xl" />
      )}

      {/* Green Gradient Header */}
      <div className="px-5 py-4 flex items-center gap-3 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0d7a3e 0%, #4ade80 100%)" }}>
        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
          <Smartphone className="w-5 h-5 text-white" />
        </div>
        <h2 className="font-bold text-lg text-white">M-Pesa Payment</h2>
      </div>

      <div className="p-5 flex flex-col space-y-5 relative flex-1">
        {/* Amount to Pay */}
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Amount to Pay</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{formatCurrency(amount)}</p>
        </div>

        {status === "idle" && (
          <div className="flex flex-col space-y-5 flex-1">
            {/* Toggle Switches for STK Push / Enter Code */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">STK Push</span>
                <button
                  onClick={() => setInputMode("stk")}
                  className={cn(
                    "relative w-12 h-6 rounded-full transition-colors",
                    inputMode === "stk" ? "bg-[#0d7a3e] dark:bg-[#4ade80]" : "bg-gray-300 dark:bg-gray-600"
                  )}
                >
                  <div className={cn(
                    "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform",
                    inputMode === "stk" ? "left-6" : "left-0.5"
                  )} />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enter Code</span>
                <button
                  onClick={() => setInputMode("manual")}
                  className={cn(
                    "relative w-12 h-6 rounded-full transition-colors",
                    inputMode === "manual" ? "bg-[#0d7a3e] dark:bg-[#4ade80]" : "bg-gray-300 dark:bg-gray-600"
                  )}
                >
                  <div className={cn(
                    "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform",
                    inputMode === "manual" ? "left-6" : "left-0.5"
                  )} />
                </button>
              </div>
            </div>

            {inputMode === "stk" ? (
              <div className="flex flex-col space-y-4 flex-1">
                {/* Phone Input */}
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setError(""); }}
                    placeholder="e.g. 0712345678"
                    className={cn(
                      "w-full bg-gray-50 dark:bg-[#0f1117] border rounded-xl py-4 pl-12 pr-4 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none transition-colors text-base",
                      error ? "border-red-500 focus:border-red-500" : "border-gray-200 dark:border-gray-700 focus:border-[#0d7a3e] dark:focus:border-[#4ade80]"
                    )}
                  />
                </div>
                {error && (
                  <p className="text-sm text-red-500 flex items-center gap-1.5 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />{error}
                  </p>
                )}
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  A payment prompt (STK Push) will be sent instantly to the phone number entered above.
                </p>
                {/* Request STK Push Button */}
                <div className="mt-auto pt-4">
                  <button
                    onClick={initiateSTKPush}
                    className="w-full py-4 rounded-2xl font-bold text-white transition-all active:scale-[0.98] bg-[#0d7a3e] dark:bg-[#4ade80] dark:text-[#0f1117] hover:bg-[#0a6332] dark:hover:bg-[#22c55e] shadow-lg dark:shadow-[0_0_25px_rgba(74,222,128,0.3)]"
                  >
                    Request STK Push
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col space-y-4 flex-1">
                {checkoutRequestId && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl text-left">
                    <div className="flex gap-2.5 items-start text-xs font-semibold text-blue-600 dark:text-blue-400">
                      <Loader2 className="w-4 h-4 animate-spin shrink-0 mt-0.5" />
                      <div>
                        <p className="uppercase tracking-wider">Checking STK Push Status...</p>
                        <p className="text-gray-500 dark:text-gray-400 font-medium normal-case mt-0.5 leading-relaxed">
                          We are auto-detecting the payment. If paid, it will complete automatically.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {verifiedTx ? (
                  <div className="space-y-4 flex-1">
                    <div className="bg-gray-50 dark:bg-[#0f1117] border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-left">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 className="w-5 h-5 text-[#0d7a3e] dark:text-[#4ade80]" />
                        <h4 className="text-sm font-bold text-[#0d7a3e] dark:text-[#4ade80] uppercase tracking-wider">Transaction Verified</h4>
                      </div>
                      <div className="space-y-2 text-sm font-medium">
                        <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-1.5">
                          <span className="text-gray-500 dark:text-gray-400">Code:</span>
                          <span className="font-bold text-gray-900 dark:text-white font-mono">{verifiedTx.mpesaReceiptNumber}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-1.5">
                          <span className="text-gray-500 dark:text-gray-400">Paid Amount:</span>
                          <span className="font-extrabold text-[#0d7a3e] dark:text-[#4ade80]">{formatCurrency(verifiedTx.amount)}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-1.5">
                          <span className="text-gray-500 dark:text-gray-400">Customer Name:</span>
                          <span className="text-gray-900 dark:text-white">{verifiedTx.customerName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Phone Number:</span>
                          <span className="text-gray-900 dark:text-white">{verifiedTx.phoneNumber}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-auto">
                      <button onClick={() => { setVerifiedTx(null); setManualCode(""); }} className="flex-1 py-3 bg-gray-100 dark:bg-[#0f1117] hover:bg-gray-200 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-all active:scale-[0.98] text-sm">Change Code</button>
                      <button onClick={handleCompleteManualCheckout} className="flex-[2] py-4 bg-[#0d7a3e] dark:bg-[#4ade80] hover:bg-[#0a6332] dark:hover:bg-[#22c55e] text-white dark:text-[#0f1117] font-bold rounded-xl transition-all active:scale-[0.98] shadow-lg text-base">Complete Checkout</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={manualCode}
                      onChange={(e) => { setManualCode(e.target.value.toUpperCase()); setManualError(""); setVerificationWarning(""); setShowForceConfirm(false); }}
                      placeholder="e.g. QKL1A2B3C4"
                      maxLength={12}
                      className={cn(
                        "w-full px-4 py-4 bg-gray-50 dark:bg-[#0f1117] border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none transition-all font-mono font-bold text-xl tracking-widest text-center uppercase",
                        manualError ? "border-red-500 focus:border-red-500" : "border-gray-200 dark:border-gray-700 focus:border-[#0d7a3e] dark:focus:border-[#4ade80]"
                      )}
                      disabled={isVerifying}
                    />
                    {manualError && (
                      <p className="text-sm text-red-500 flex items-center gap-1.5 font-medium">
                        <AlertCircle className="w-4 h-4 shrink-0" />{manualError}
                      </p>
                    )}
                    {verificationWarning && (
                      <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/50 rounded-xl text-left">
                        <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-1">Verification Status:</p>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300 leading-relaxed">{verificationWarning}</p>
                      </div>
                    )}
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      Ask the customer for their M-Pesa SMS confirmation code and type it here exactly.
                    </p>
                    <div className="mt-auto pt-4 space-y-3">
                      <button
                        onClick={handleManualConfirm}
                        disabled={isVerifying}
                        className="w-full py-4 rounded-2xl font-bold text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 bg-[#0d7a3e] dark:bg-[#4ade80] dark:text-[#0f1117] hover:bg-[#0a6332] dark:hover:bg-[#22c55e] shadow-lg dark:shadow-[0_0_25px_rgba(74,222,128,0.3)]"
                      >
                        {isVerifying && <Loader2 className="w-5 h-5 animate-spin" />}
                        {isVerifying ? "Verifying..." : "Verify & Confirm"}
                      </button>
                      {showForceConfirm && (
                        <button onClick={handleForceConfirm} className="w-full py-3 bg-gray-100 dark:bg-[#0f1117] border border-orange-300 dark:border-orange-700/50 hover:bg-gray-200 dark:hover:bg-gray-800 text-orange-600 dark:text-orange-400 font-bold rounded-xl transition-all active:scale-[0.98] text-sm">Force Confirm Anyway (Skip Verification)</button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {status === "initiating" && (
          <div className="text-center py-10 my-auto flex-1 flex flex-col items-center justify-center">
            <Loader2 className="w-12 h-12 text-[#0d7a3e] dark:text-[#4ade80] animate-spin mx-auto mb-4" />
            <p className="text-gray-900 dark:text-white font-bold text-lg">Contacting Safaricom...</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">Initiating secure STK Push request</p>
          </div>
        )}

        {status === "pending" && (
          <div className="flex flex-col items-center justify-center w-full py-4 my-auto flex-1">
            <header className="flex flex-col items-center mb-6">
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-[#4ade80] blur-md opacity-40 rounded-full"></div>
                <div className="relative bg-[#1a2234] border border-white/10 p-2 rounded-lg">
                  <Smartphone className="w-6 h-6 text-[#4ade80]" />
                </div>
              </div>
              <h1 className="text-2xl font-bold mb-2 tracking-tight text-gray-900 dark:text-white">Check Phone Prompt!</h1>
              <p className="text-center text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">
                The customer has been sent an STK prompt. Please ask them to enter their M-Pesa PIN.
              </p>
            </header>
            <main className="w-full flex flex-col items-center justify-center">
              <div className="w-full bg-gray-50 dark:bg-[#0f1117] rounded-3xl p-6 flex flex-col items-center border border-gray-200 dark:border-gray-700/50 shadow-xl relative overflow-hidden">
                <div className="text-3xl font-bold mb-8 tracking-tight text-gray-900 dark:text-white">{formatCurrency(amount)}</div>
                <div className="relative w-[150px] h-[150px] flex items-center justify-center mb-8">
                  <svg className="absolute inset-0 transform -rotate-90 w-full h-full">
                    <circle cx="75" cy="75" fill="transparent" r="60" stroke="rgba(0,0,0,0.05)" strokeWidth="8"></circle>
                    <circle className="blur-[8px] opacity-60 transition-all duration-1000" cx="75" cy="75" fill="transparent" r="60" stroke="#4ade80" strokeDasharray="377" strokeDashoffset={377 - (377 * (60 - countdown)) / 60} strokeWidth="12"></circle>
                    <circle className="transition-all duration-1000" strokeLinecap="round" cx="75" cy="75" fill="transparent" r="60" stroke="#0d7a3e" strokeDasharray="377" strokeDashoffset={377 - (377 * (60 - countdown)) / 60} strokeWidth="8"></circle>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-white dark:bg-[#1a1f2e] p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                      <Smartphone className="w-8 h-8 text-gray-600 dark:text-gray-300" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3 bg-gray-100 dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-700 rounded-full py-2 px-5 mb-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4ade80] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-[#0d7a3e]"></span>
                  </span>
                  <span className="text-sm font-medium tracking-wide text-gray-700 dark:text-gray-300">Waiting: {countdown}s</span>
                </div>
                <p className="text-[10px] text-gray-400 font-mono select-all mt-2">ID: {checkoutRequestId}</p>
              </div>
            </main>
          </div>
        )}

        {status === "success" && (
          <div className="text-center py-10 relative z-10 my-auto flex-1 flex flex-col items-center justify-center">
            <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gray-50 dark:bg-[#0f1117] border border-[#0d7a3e]/30 dark:border-[#4ade80]/30 flex items-center justify-center shadow-[0_0_20px_rgba(13,122,62,0.2)] dark:shadow-[0_0_20px_rgba(74,222,128,0.2)]">
              <CheckCircle2 className="w-10 h-10 text-[#0d7a3e] dark:text-[#4ade80] animate-bounce" />
            </div>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse" />
              <h3 className="text-gray-900 dark:text-white font-extrabold text-2xl tracking-tight">Payment Successful!</h3>
              <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[260px] mx-auto mt-2 leading-relaxed">Transaction has been completed and verified successfully.</p>
          </div>
        )}

        {status === "failed" && (() => {
          const isWrongPin = /wrong.*pin|incorrect.*pin|invalid.*pin|initiator.*invalid|wrong.*credentials/i.test(error);
          const isInsufficientFunds = /insufficient|balance/i.test(error);
          const isTimeout = /timed? ?out|did not enter/i.test(error);
          const errorLabel = isWrongPin ? "Wrong PIN Entered" : isInsufficientFunds ? "Insufficient M-Pesa Balance" : isTimeout ? "Payment Timed Out" : "Payment Failed";
          const borderColor = isWrongPin || isInsufficientFunds ? "border-orange-300 dark:border-orange-700/50" : "border-red-300 dark:border-red-700/50";
          const labelColor = isWrongPin || isInsufficientFunds ? "text-orange-600 dark:text-orange-400" : "text-red-600 dark:text-red-400";
          return (
            <div className="text-center py-8 my-auto flex-1 flex flex-col items-center justify-center">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gray-50 dark:bg-[#0f1117] border ${borderColor} flex items-center justify-center shadow-md`}>
                <XCircle className={`w-9 h-9 ${isWrongPin || isInsufficientFunds ? "text-orange-500 dark:text-orange-400" : "text-red-500 dark:text-red-400"}`} />
              </div>
              <h3 className="text-gray-900 dark:text-white font-bold text-xl">{errorLabel}</h3>
              <div className={`mt-4 mx-auto max-w-[320px] p-4 bg-gray-50 dark:bg-[#0f1117] border ${borderColor} rounded-xl text-left`}>
                <p className={`text-xs font-semibold ${labelColor} uppercase tracking-wider mb-1`}>Reason:</p>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 leading-relaxed">{error || "An unknown error occurred while verifying the transaction."}</p>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => { setStatus("idle"); setError(""); setCountdown(60); }} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-95">Try Again</button>
                <button onClick={onCancel} className="flex-1 py-3 bg-gray-100 dark:bg-[#0f1117] hover:bg-gray-200 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-all active:scale-95">Cancel</button>
              </div>
            </div>
          );
        })()}
      </div>
    </section>
  );
}
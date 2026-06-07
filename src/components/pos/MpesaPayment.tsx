"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, CheckCircle2, XCircle, AlertCircle, Sparkles, Smartphone } from "lucide-react";
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

  // ── Payment confirmed sound (Web Audio API — works on web & Android WebView) ──
  const playSuccessChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // Three-note rising chime: C5 → E5 → G5
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.18);

        // Soft attack, smooth decay
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.18);
        gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + i * 0.18 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.55);

        osc.start(ctx.currentTime + i * 0.18);
        osc.stop(ctx.currentTime + i * 0.18 + 0.6);
      });
    } catch {
      // Audio not available (silent fail)
    }
  };

  // ── Confetti Particle System — double burst ──────────────────
  useEffect(() => {
    if (status !== "success") return;

    // Play chime immediately on success
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

    // Helper: create a burst of particles from bottom corners + center top
    const createBurst = (count: number, speedMult: number) => {
      const burst: {
        x: number; y: number; size: number; color: string;
        speedX: number; speedY: number; rotation: number;
        rotationSpeed: number; gravity: number; friction: number;
        opacity: number; shape: "square" | "circle" | "strip";
      }[] = [];

      for (let i = 0; i < count; i++) {
        const zone = i % 3; // 0=left corner, 1=right corner, 2=center
        const fromLeft  = zone === 0;
        const fromRight = zone === 1;
        const fromCenter = zone === 2;

        burst.push({
          x: fromLeft ? 0 : fromRight ? canvas.width : canvas.width / 2 + (Math.random() - 0.5) * 60,
          y: fromCenter ? -10 : canvas.height - 10,
          size: Math.random() * 8 + 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          speedX: fromLeft
            ? Math.random() * 9 * speedMult + 3
            : fromRight
            ? -(Math.random() * 9 * speedMult + 3)
            : (Math.random() - 0.5) * 10 * speedMult,
          speedY: fromCenter
            ? Math.random() * 8 * speedMult + 4
            : -(Math.random() * 14 * speedMult + 8),
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

    let particles = createBurst(200, 1.0); // Burst 1: 200 particles
    let animationId: number;
    let burst2Added = false;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let anyAlive = false;

      // Add second burst at ~700ms (when first burst peaks)
      if (!burst2Added && particles.every(p => p.speedY > -2)) {
        burst2Added = true;
        particles = [...particles, ...createBurst(200, 1.2)]; // Burst 2: stronger
        playSuccessChime(); // Second chime
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
        p.opacity -= 0.006; // slower fade for longer show

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

    return () => {
      cancelAnimationFrame(animationId);
    };
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
    let timer: NodeJS.Timeout; // hoisted so checkStatus can clear it on failure

    const checkStatus = async () => {
      if (!active) return;
      try {
        const response = await fetch(
          `/api/mpesa/query?checkoutRequestId=${checkoutRequestId}&elapsed=${elapsed}`
        );
        const data = await response.json();
        if (!active) return; // component unmounted during fetch
        if (data.status === "success") {
          active = false;
          clearTimeout(timeoutId);
          clearInterval(timer); // stop countdown immediately on success
          setStatus("success");
          // Play confetti for 1.8s before triggering onSuccess
          setTimeout(() => {
            onSuccess(data.mpesaReceiptNumber || "");
          }, 1800);
          return;
        } else if (data.status === "failed") {
          active = false;
          clearTimeout(timeoutId);
          clearInterval(timer); // stop countdown immediately — no timeout screen, show real error
          setStatus("failed");
          setError(data.message || "Payment failed");
          onFailure(data.message || "Payment failed");
          return;
        }
      } catch (err) {
        console.error("Status check error:", err);
      }
      // Aggressive polling for the first 15 seconds (critical STK push window), then fallback to 1s
      elapsed += elapsed < 15 ? 0.3 : 1.0; 
      
      // Schedule next check: 300ms for first 15 seconds (instant DB detection), then 1000ms
      if (active) {
        const nextInterval = elapsed <= 15 ? 300 : 1000;
        timeoutId = setTimeout(checkStatus, nextInterval);
      }
    };

    // Run first check immediately (fast DB lookup)
    checkStatus();

    timer = setInterval(() => {
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
            onSuccess(data.mpesaReceiptNumber || "");
          }, 1800);
        }
      } catch (err) {
        console.error("Fallback DB query failed:", err);
      }
    };

    // Check DB status immediately when hook is triggered (e.g. switching tabs or timing out)
    checkDbFallback();

    // Query every 1 second to capture delayed callbacks quickly
    const interval = setInterval(checkDbFallback, 1000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [inputMode, checkoutRequestId, status, onSuccess]);

  return (
    <section className="flex-grow bg-white dark:bg-[#1c1e22] rounded-2xl overflow-hidden flex flex-col relative transition-all duration-300">
      {/* Canvas for Celebration Confetti */}
      {status === "success" && (
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-50 rounded-2xl" />
      )}

      {/* Detail Header */}
      <div 
        className="p-3 flex items-center space-x-3" 
        style={{ background: "linear-gradient(90deg, #4caf50 0%, #aed581 100%)" }}
      >
        <svg className="h-5 w-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
        </svg>
        <h2 className="font-semibold text-sm text-black">M-Pesa Payment</h2>
      </div>

      <div className="p-5 flex flex-col space-y-6 relative">
        {/* Amount Breakdown */}
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Amount to Pay</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{formatCurrency(amount)}</p>
          <hr className="mt-4 border-gray-200 dark:border-gray-700" />
        </div>

        {status === "idle" && (
          <div className="flex flex-col space-y-6">
            {/* Toggles Section */}
            <div className="flex justify-between items-center">
              <div 
                className="flex items-center space-x-3 cursor-pointer" 
                onClick={() => setInputMode("stk")}
              >
                <span className={cn("text-sm", inputMode === "stk" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400")}>STK Push</span>
                <div className={cn("w-12 h-6 rounded-full relative p-1 transition-colors", inputMode === "stk" ? "bg-[#4caf50]" : "bg-gray-600")}>
                  <div className={cn("bg-white w-4 h-4 rounded-full transition-transform", inputMode === "stk" ? "translate-x-6" : "translate-x-0")}></div>
                </div>
              </div>
              <div 
                className="flex items-center space-x-3 cursor-pointer" 
                onClick={() => setInputMode("manual")}
              >
                <span className={cn("text-sm", inputMode === "manual" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400")}>Enter Code</span>
                <div className={cn("w-12 h-6 rounded-full relative p-1 transition-colors", inputMode === "manual" ? "bg-[#4caf50]" : "bg-gray-600")}>
                  <div className={cn("bg-white w-4 h-4 rounded-full transition-transform", inputMode === "manual" ? "translate-x-6" : "translate-x-0")}></div>
                </div>
              </div>
            </div>

            {inputMode === "stk" ? (
              <div className="flex flex-col space-y-4">
                {/* Phone Input */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                    </svg>
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setError(""); }}
                    placeholder="e.g. 0712345678"
                    className={cn(
                      "w-full bg-gray-50 dark:bg-[#25282c] border rounded-xl py-4 pl-12 pr-4 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none transition-colors",
                      error ? "border-red-500 focus:border-red-500" : "border-gray-200 dark:border-gray-700 focus:border-[#4caf50]"
                    )}
                  />
                </div>
                {error && (
                  <p className="text-sm text-red-500 flex items-center gap-1.5 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />{error}
                  </p>
                )}
                {/* Disclaimer */}
                <p className="text-xs text-gray-500 leading-relaxed">
                  A payment prompt (STK Push) will be sent instantly to the phone number entered above.
                </p>
                {/* Final Action Button */}
                <div className="pt-4 mt-auto">
                  <button
                    onClick={initiateSTKPush}
                    className="w-full py-4 rounded-3xl font-bold text-gray-900 dark:text-white transition-transform active:scale-[0.98]"
                    style={{
                      background: "linear-gradient(180deg, #66bb6a 0%, #388e3c 100%)",
                      boxShadow: "0 8px 15px rgba(0, 0, 0, 0.3), 0 4px 10px rgba(76, 175, 80, 0.4)"
                    }}
                  >
                    Request STK Push
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col space-y-4">
                {checkoutRequestId && (
                  <div className="p-3 bg-gray-50 dark:bg-[#25282c] border border-blue-900/50 rounded-xl mb-2 text-left">
                    <div className="flex gap-2.5 items-start text-xs font-semibold text-[#4caf50]">
                      <Loader2 className="w-4 h-4 animate-spin shrink-0 mt-0.5" />
                      <div>
                        <p className="uppercase tracking-wider">Checking STK Push Status...</p>
                        <p className="text-gray-500 dark:text-gray-400 font-medium normal-case mt-0.5 leading-relaxed">
                          We are auto-detecting the payment in the database. If paid, it will complete automatically.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {verifiedTx ? (
                  <div className="space-y-4">
                    <div className="bg-gray-50 dark:bg-[#25282c] border border-gray-200 dark:border-gray-700 rounded-xl p-5 text-left">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 className="w-5 h-5 text-[#4caf50]" />
                        <h4 className="text-sm font-bold text-[#4caf50] uppercase tracking-wider">
                          Transaction Verified
                        </h4>
                      </div>
                      <div className="space-y-2 text-sm font-medium">
                        <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-1.5">
                          <span className="text-gray-500 dark:text-gray-400">Code:</span>
                          <span className="font-bold text-gray-900 dark:text-white font-mono">{verifiedTx.mpesaReceiptNumber}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-1.5">
                          <span className="text-gray-500 dark:text-gray-400">Paid Amount:</span>
                          <span className="font-extrabold text-[#4caf50]">{formatCurrency(verifiedTx.amount)}</span>
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

                    <div className="flex gap-3">
                      <button
                        onClick={() => { setVerifiedTx(null); setManualCode(""); }}
                        className="flex-1 py-3 bg-gray-50 dark:bg-[#25282c] hover:bg-gray-100 dark:hover:bg-[#2d3136] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-bold rounded-xl transition-all active:scale-[0.98] text-sm"
                      >
                        Change Code
                      </button>
                      <button
                        onClick={handleCompleteManualCheckout}
                        className="flex-[2] py-4 bg-[#4caf50] hover:bg-[#388e3c] text-gray-900 dark:text-white font-bold rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-green-900/30 text-base"
                      >
                        Complete Checkout
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
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
                        "w-full px-4 py-4 bg-gray-50 dark:bg-[#25282c] border rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none transition-all font-mono font-bold text-xl tracking-widest text-center uppercase",
                        manualError ? "border-red-500 focus:border-red-500" : "border-gray-200 dark:border-gray-700 focus:border-[#4caf50]"
                      )}
                      disabled={isVerifying}
                    />
                    {manualError && (
                      <p className="mt-2 text-sm text-red-500 flex items-center gap-1.5 font-medium">
                        <AlertCircle className="w-4 h-4 shrink-0" />{manualError}
                      </p>
                    )}

                    {verificationWarning && (
                      <div className="mt-3 p-3 bg-gray-50 dark:bg-[#25282c] border border-orange-900/50 rounded-xl text-left">
                        <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">
                          Verification Status:
                        </p>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300 leading-relaxed">
                          {verificationWarning}
                        </p>
                      </div>
                    )}

                    <p className="mt-2 text-xs text-gray-500 leading-relaxed text-left">
                      Ask the customer for their M-Pesa SMS confirmation code and type it here exactly.
                    </p>

                    <div className="pt-4 mt-auto space-y-3">
                      <button
                        onClick={handleManualConfirm}
                        disabled={isVerifying}
                        className="w-full py-4 rounded-3xl font-bold text-gray-900 dark:text-white transition-transform active:scale-[0.98] flex items-center justify-center gap-2"
                        style={{
                          background: "linear-gradient(180deg, #66bb6a 0%, #388e3c 100%)",
                          boxShadow: "0 8px 15px rgba(0, 0, 0, 0.3), 0 4px 10px rgba(76, 175, 80, 0.4)"
                        }}
                      >
                        {isVerifying && <Loader2 className="w-5 h-5 animate-spin" />}
                        {isVerifying ? "Verifying..." : "Verify & Confirm"}
                      </button>

                      {showForceConfirm && (
                        <button
                          onClick={handleForceConfirm}
                          className="w-full py-3 bg-gray-50 dark:bg-[#25282c] border border-orange-500/50 hover:bg-gray-100 dark:hover:bg-[#2d3136] text-orange-400 font-bold rounded-xl transition-all active:scale-[0.98] shadow-md text-sm"
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
          <div className="text-center py-10 my-auto">
            <Loader2 className="w-12 h-12 text-[#4caf50] animate-spin mx-auto mb-4" />
            <p className="text-gray-900 dark:text-white font-bold text-lg">Contacting Safaricom...</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">Initiating secure STK Push request</p>
          </div>
        )}

        {status === "pending" && (
          <div className="flex flex-col items-center justify-center w-full py-4 my-auto">
            <header className="flex flex-col items-center mb-6" data-purpose="page-header">
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-[#4ade80] blur-md opacity-40 rounded-full"></div>
                <div className="relative bg-[#1a2234] border border-white/10 p-2 rounded-lg">
                  <Smartphone className="w-6 h-6 text-[#4ade80]" />
                </div>
              </div>
              <h1 className="text-2xl font-bold mb-2 tracking-tight text-gray-900 dark:text-white">Check Phone Prompt!</h1>
              <p className="text-center text-[#9ca3af] text-sm leading-relaxed max-w-xs mx-auto">
                The customer has been sent an STK prompt. Please ask them to enter their M-Pesa PIN.
              </p>
            </header>

            <main className="w-full flex flex-col items-center justify-center" data-purpose="status-card">
              <div className="w-full bg-[#252d41]/40 backdrop-blur-sm rounded-3xl p-6 flex flex-col items-center border border-white/5 shadow-2xl relative overflow-hidden">
                <div className="text-3xl font-bold mb-8 tracking-tight text-gray-900 dark:text-white">
                  {formatCurrency(amount)}
                </div>

                <div className="relative w-[150px] h-[150px] flex items-center justify-center mb-8">
                  <svg className="absolute inset-0 transform -rotate-90 w-full h-full">
                    <circle cx="75" cy="75" fill="transparent" r="60" stroke="rgba(255,255,255,0.05)" strokeWidth="8"></circle>
                    <circle className="blur-[8px] opacity-60 transition-all duration-1000" cx="75" cy="75" fill="transparent" r="60" stroke="#4ade80" strokeDasharray="377" strokeDashoffset={377 - (377 * (60 - countdown)) / 60} strokeWidth="12"></circle>
                    <circle className="transition-all duration-1000" strokeLinecap="round" cx="75" cy="75" fill="transparent" r="60" stroke="#4ade80" strokeDasharray="377" strokeDashoffset={377 - (377 * (60 - countdown)) / 60} strokeWidth="8"></circle>
                  </svg>
                  
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                      <Smartphone className="w-8 h-8 text-gray-900 dark:text-white/80" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 bg-white/5 border border-white/10 rounded-full py-2 px-5 mb-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4ade80] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-[#4ade80]"></span>
                  </span>
                  <span className="text-sm font-medium tracking-wide text-gray-900 dark:text-white">Waiting: {countdown}s</span>
                </div>
                
                <p className="text-[10px] text-gray-500 font-mono select-all mt-2">
                  ID: {checkoutRequestId}
                </p>
              </div>
            </main>
          </div>
        )}

        {status === "success" && (
          <div className="text-center py-10 relative z-10 my-auto">
            <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gray-50 dark:bg-[#25282c] border border-[#4caf50]/50 flex items-center justify-center shadow-[0_0_20px_rgba(76,175,80,0.2)]">
              <CheckCircle2 className="w-10 h-10 text-[#4caf50] animate-bounce" />
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

        {status === "failed" && (() => {
          const isWrongPin    = /wrong.*pin|incorrect.*pin|invalid.*pin|initiator.*invalid|wrong.*credentials/i.test(error);
          const isInsufficientFunds = /insufficient|balance/i.test(error);
          const isTimeout     = /timed? ?out|did not enter/i.test(error);
          const errorLabel    = isWrongPin ? "Wrong PIN Entered"
                              : isInsufficientFunds ? "Insufficient M-Pesa Balance"
                              : isTimeout ? "Payment Timed Out"
                              : "Payment Failed";
          const borderColor   = isWrongPin || isInsufficientFunds ? "border-orange-500/40" : "border-red-500/30";
          const labelColor    = isWrongPin || isInsufficientFunds ? "text-orange-400" : "text-red-500";
          return (
            <div className="text-center py-8 my-auto">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gray-50 dark:bg-[#25282c] border ${borderColor} flex items-center justify-center shadow-md`}>
                <XCircle className={`w-9 h-9 ${isWrongPin || isInsufficientFunds ? "text-orange-400" : "text-red-500"}`} />
              </div>
              <h3 className="text-gray-900 dark:text-white font-bold text-xl">{errorLabel}</h3>

              <div className={`mt-4 mx-auto max-w-[320px] p-4 bg-gray-50 dark:bg-[#25282c] border ${borderColor} rounded-xl text-left`}>
                <p className={`text-xs font-semibold ${labelColor} uppercase tracking-wider mb-1`}>
                  Reason:
                </p>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 leading-relaxed">
                  {error || "An unknown error occurred while verifying the transaction."}
                </p>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setStatus("idle"); setError(""); setCountdown(60); }}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-95"
                >
                  Try Again
                </button>
                <button
                  onClick={onCancel}
                  className="flex-1 py-3 bg-gray-50 dark:bg-[#25282c] hover:bg-gray-100 dark:hover:bg-[#2d3136] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-bold rounded-xl transition-all active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </section>
  );
}


"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { X, ScanLine, Camera, Smartphone, AlertCircle, CheckCircle2, Flashlight, Keyboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCapacitor } from "@/hooks/useCapacitor";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function BarcodeScanner({
  onScan,
  onClose,
  isOpen,
}: BarcodeScannerProps) {
  const { config, playScannerBeep, requestCamera } = useCapacitor();
  const [scanMode, setScanMode] = useState<"camera" | "usb">("camera");
  const [manualBarcode, setManualBarcode] = useState("");
  const [usbInput, setUsbInput] = useState("");
  const [camError, setCamError] = useState("");
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);
  const [scanCooldown, setScanCooldown] = useState(false);
  const manualInputRef = useRef<HTMLInputElement>(null);
  const usbInputRef = useRef<HTMLInputElement>(null);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const qrCodeRef = useRef<Html5Qrcode | null>(null);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  const toggleTorch = async () => {
    if (!qrCodeRef.current || !qrCodeRef.current.isScanning) return;
    try {
      const nextTorchState = !isTorchOn;
      await qrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorchState } as any],
      });
      setIsTorchOn(nextTorchState);
    } catch (err) {
      console.error("Failed to toggle torch:", err);
    }
  };

  const handleScanSuccess = useCallback(
    async (decodedText: string) => {
      const barcode = decodedText.trim();
      if (!barcode || lastScannedBarcode === barcode || scanCooldown) {
        return;
      }

      setLastScannedBarcode(barcode);
      setScanCooldown(true);

      if (config.isNative) {
        await playScannerBeep();
      }

      onScan(barcode);
      setManualBarcode("");

      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
      }

      cooldownTimerRef.current = setTimeout(() => {
        setScanCooldown(false);
        setLastScannedBarcode(null);
      }, 1500);
    },
    [onScan, config.isNative, playScannerBeep, lastScannedBarcode, scanCooldown]
  );

  const submitManualBarcode = () => {
    const barcode = manualBarcode.trim();
    if (barcode.length < 3) return;
    handleScanSuccess(barcode);
  };

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
      }
    };
  }, []);

  const handleScanSuccessRef = useRef(handleScanSuccess);
  useEffect(() => {
    handleScanSuccessRef.current = handleScanSuccess;
  }, [handleScanSuccess]);

  useEffect(() => {
    if (!isOpen || scanMode !== "camera") return;

    let html5QrCode: Html5Qrcode | null = null;
    let isComponentMounted = true;
    setCamError("");

    const startScanner = async () => {
      try {
        if (config.isNative) {
          const hasPerm = await requestCamera();
          if (!hasPerm && isComponentMounted) {
            setCamError("Camera permission denied. Please enable it in Settings.");
            return;
          }
        }

        if (!isComponentMounted) return;

        html5QrCode = new Html5Qrcode("reader", {
          verbose: false,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
        });
        qrCodeRef.current = html5QrCode;

        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
          if (isComponentMounted) setCamError("No camera found on this device.");
          return;
        }

        let cameraId = cameras[0].id;
        const backCamera = cameras.find(
          (c) => c.label.toLowerCase().includes("back") || c.label.toLowerCase().includes("environment")
        );
        if (backCamera) {
          cameraId = backCamera.id;
        }

        if (!isComponentMounted) return;

        await html5QrCode.start(
          cameraId,
          {
            fps: 10,
            qrbox: { width: 320, height: 240 },
          },
          (decodedText) => {
            handleScanSuccessRef.current(decodedText);
          },
          () => {
            // ignore scan errors (they happen every frame no barcode is found)
          }
        );

        if (isComponentMounted) {
          try {
            const capabilities = html5QrCode.getRunningTrackCapabilities();
            if (capabilities && (capabilities as any).torch) {
              setHasTorch(true);
            }
          } catch (e) {
            console.warn("Failed to check torch capability:", e);
          }
        }
      } catch (err) {
        console.error("Camera access error:", err);
        if (isComponentMounted) setCamError("Could not access camera. Please check permissions.");
      }
    };

    const timer = setTimeout(() => {
      startScanner();
    }, 100);

    return () => {
      isComponentMounted = false;
      clearTimeout(timer);
      setHasTorch(false);
      setIsTorchOn(false);
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode
          .stop()
          .then(() => {
            html5QrCode?.clear();
            qrCodeRef.current = null;
          })
          .catch(console.error);
      } else {
        qrCodeRef.current = null;
      }
    };
  }, [isOpen, scanMode, config.isNative, requestCamera]);

  useEffect(() => {
    if (!isOpen || scanMode !== "usb") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === "Enter" && usbInput.length > 3) {
        handleScanSuccess(usbInput.trim());
        setUsbInput("");
      } else if (e.key.length === 1) {
        setUsbInput((prev) => prev + e.key);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    usbInputRef.current?.focus();

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, scanMode, usbInput, handleScanSuccess]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-white/10 bg-gray-900 flex-shrink-0">
        <div className="flex items-center gap-3">
          <ScanLine className="w-6 h-6 text-primary-400" />
          <h2 className="text-xl sm:text-2xl font-bold text-white">Scan Barcode</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2.5 rounded-xl hover:bg-white/10 transition-colors border border-white/10"
          aria-label="Close scanner"
        >
          <X className="w-6 h-6 text-gray-300" />
        </button>
      </div>

      {/* Mode toggle */}
      <div className="flex p-2 mx-4 sm:mx-8 mt-4 bg-gray-800 rounded-xl flex-shrink-0 max-w-xl">
        <button
          onClick={() => setScanMode("camera")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all",
            scanMode === "camera"
              ? "bg-primary-600 text-white shadow-sm"
              : "text-gray-400 hover:text-gray-200"
          )}
        >
          <Camera className="w-4 h-4" />
          Camera
        </button>
        <button
          onClick={() => setScanMode("usb")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all",
            scanMode === "usb"
              ? "bg-primary-600 text-white shadow-sm"
              : "text-gray-400 hover:text-gray-200"
          )}
        >
          <Smartphone className="w-4 h-4" />
          USB Scanner
        </button>
      </div>

      {/* Main area — fills remaining screen */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 sm:p-8 min-h-0 overflow-hidden">
        {scanMode === "camera" ? (
          <>
            {/* Camera view */}
            <div className="flex-1 relative min-h-[240px] lg:min-h-0 rounded-2xl overflow-hidden bg-black border border-white/10">
              <div
                id="reader"
                className={cn(
                  "w-full h-full transition-opacity",
                  scanCooldown && "opacity-70"
                )}
              />
              <div
                className={cn(
                  "absolute inset-0 pointer-events-none border-2 rounded-2xl transition-colors",
                  scanCooldown ? "border-yellow-500" : "border-primary-500/40"
                )}
              />
              {hasTorch && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={cn(
                    "absolute top-4 right-4 z-10 p-3 rounded-full backdrop-blur-md transition-all duration-300 active:scale-95 shadow-lg",
                    isTorchOn
                      ? "bg-yellow-500 text-white hover:bg-yellow-600"
                      : "bg-black/50 text-white hover:bg-black/75 border border-white/20"
                  )}
                  title={isTorchOn ? "Turn off torch" : "Turn on torch"}
                >
                  <Flashlight className={cn("w-5 h-5", isTorchOn && "animate-pulse")} />
                </button>
              )}
              {camError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 p-6 text-center">
                  <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
                  <p className="text-white text-base font-medium mb-2">{camError}</p>
                  <p className="text-gray-400 text-sm">Use manual entry below to type the barcode.</p>
                </div>
              )}
              {scanCooldown && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-yellow-500/20 mb-2">
                      <CheckCircle2 className="w-8 h-8 text-yellow-500" />
                    </div>
                    <p className="text-white text-lg font-semibold">Scanned!</p>
                    <p className="text-yellow-300 text-sm mt-1">Move product away to scan next item</p>
                  </div>
                </div>
              )}
              {!camError && !scanCooldown && (
                <p className="absolute bottom-4 left-0 right-0 text-center text-sm text-white/70 pointer-events-none">
                  Position barcode within the frame
                </p>
              )}
            </div>

            {/* Manual entry panel */}
            <div className="lg:w-96 flex-shrink-0 bg-gray-900 border border-white/10 rounded-2xl p-5 sm:p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <Keyboard className="w-5 h-5 text-primary-400" />
                <h3 className="text-lg font-semibold text-white">Manual Entry</h3>
              </div>
              <p className="text-sm text-gray-400 mb-4">
                Scanner failed or barcode won&apos;t read? Type the barcode number below.
              </p>
              <input
                ref={manualInputRef}
                type="text"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                placeholder="Enter barcode number..."
                className="w-full px-4 py-4 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-lg"
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitManualBarcode();
                }}
                autoFocus
              />
              <button
                onClick={submitManualBarcode}
                disabled={manualBarcode.trim().length < 3}
                className="mt-4 w-full py-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all active:scale-[0.98]"
              >
                Add Product
              </button>
              <p className="mt-3 text-xs text-gray-500 text-center">Press Enter or tap Add Product</p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full">
            <div className="w-24 h-24 mb-6 rounded-2xl bg-primary-500/20 flex items-center justify-center">
              <ScanLine className="w-12 h-12 text-primary-400" />
            </div>
            <h3 className="text-2xl font-semibold text-white mb-2">USB Barcode Scanner</h3>
            <p className="text-gray-400 mb-8 text-center max-w-md">
              Connect your USB scanner and scan any product. Or type the barcode manually below.
            </p>
            <div className="w-full max-w-md space-y-4">
              <input
                ref={usbInputRef}
                type="text"
                value={usbInput}
                onChange={(e) => setUsbInput(e.target.value)}
                placeholder="Scan or type barcode..."
                className="w-full px-4 py-4 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-lg text-center"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && usbInput.trim().length > 3) {
                    handleScanSuccess(usbInput.trim());
                    setUsbInput("");
                  }
                }}
              />
              <button
                onClick={() => {
                  if (usbInput.trim().length > 3) {
                    handleScanSuccess(usbInput.trim());
                    setUsbInput("");
                  }
                }}
                disabled={usbInput.trim().length < 3}
                className="w-full py-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white rounded-xl font-bold transition-all"
              >
                Add Product
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

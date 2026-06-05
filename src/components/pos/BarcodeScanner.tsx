"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { X, ScanLine, Camera, Smartphone, AlertCircle, CheckCircle2, Flashlight } from "lucide-react";
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
  const { config, playScannerBeep, hapticFeedback, requestCamera } = useCapacitor();
  const [scanMode, setScanMode] = useState<"camera" | "usb">("camera");
  const [usbInput, setUsbInput] = useState("");
  const [camError, setCamError] = useState("");
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);
  const [scanCooldown, setScanCooldown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
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
      // Prevent duplicate scans of the same barcode
      if (lastScannedBarcode === decodedText || scanCooldown) {
        return;
      }

      // Record this barcode and activate cooldown
      setLastScannedBarcode(decodedText);
      setScanCooldown(true);

      // Play native feedback on successful scan
      if (config.isNative) {
        await playScannerBeep();
      }

      onScan(decodedText);

      // Reset cooldown after 1.5 seconds to allow scanning different products
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

  // Cleanup timer on unmount
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
        const backCamera = cameras.find(c => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('environment'));
        if (backCamera) {
          cameraId = backCamera.id;
        }

        if (!isComponentMounted) return;

        await html5QrCode.start(
          cameraId,
          {
            fps: 10,
            qrbox: { width: 250, height: 200 },
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

    // Slight delay to ensure DOM element is ready
    const timer = setTimeout(() => {
      startScanner();
    }, 100);

    return () => {
      isComponentMounted = false;
      clearTimeout(timer);
      setHasTorch(false);
      setIsTorchOn(false);
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
          html5QrCode?.clear();
          qrCodeRef.current = null;
        }).catch(console.error);
      } else {
        qrCodeRef.current = null;
      }
    };
  }, [isOpen, scanMode, config.isNative, requestCamera]);

  useEffect(() => {
    if (!isOpen || scanMode !== "usb") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept keypresses when user is typing in an input/textarea/select
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
    inputRef.current?.focus();

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, scanMode, usbInput, handleScanSuccess]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-pos-card rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-pos-border">
          <div className="flex items-center gap-3">
            <ScanLine className="w-6 h-6 text-primary-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Scan Barcode</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="flex p-2 mx-6 mt-4 bg-gray-100 dark:bg-gray-800 rounded-xl">
          <button
            onClick={() => setScanMode("camera")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
              scanMode === "camera"
                ? "bg-white dark:bg-primary-600 text-primary-600 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            )}
          >
            <Camera className="w-4 h-4" />
            Camera
          </button>
          <button
            onClick={() => setScanMode("usb")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
              scanMode === "usb"
                ? "bg-white dark:bg-primary-600 text-primary-600 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            )}
          >
            <Smartphone className="w-4 h-4" />
            USB Scanner
          </button>
        </div>

        <div className="p-6">
          {scanMode === "camera" ? (
            <div className="relative">
              <div
                id="reader"
                className={cn(
                  "rounded-xl overflow-hidden bg-black transition-opacity",
                  scanCooldown && "opacity-70"
                )}
                style={{ minHeight: "250px" }}
              />
              <div className={cn(
                "absolute inset-0 pointer-events-none border-2 rounded-xl transition-colors",
                scanCooldown ? "border-yellow-500" : "border-primary-500/30"
              )} />
              {hasTorch && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={cn(
                    "absolute top-4 right-4 z-10 p-3 rounded-full backdrop-blur-md transition-all duration-300 active:scale-95 shadow-lg",
                    isTorchOn
                      ? "bg-yellow-500 text-white hover:bg-yellow-600 shadow-yellow-500/30"
                      : "bg-black/50 text-white hover:bg-black/75 border border-white/20"
                  )}
                  title={isTorchOn ? "Turn off torch" : "Turn on torch"}
                >
                  <Flashlight className={cn("w-5 h-5", isTorchOn && "animate-pulse")} />
                </button>
              )}
              {camError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 rounded-xl p-4 text-center">
                  <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
                  <p className="text-white text-sm font-medium">{camError}</p>
                </div>
              )}
              {scanCooldown && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 rounded-xl backdrop-blur-sm">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-500/20 mb-2">
                      <CheckCircle2 className="w-6 h-6 text-yellow-500" />
                    </div>
                    <p className="text-white text-sm font-semibold">Scanned!</p>
                    <p className="text-yellow-300 text-xs mt-1">Move product away</p>
                  </div>
                </div>
              )}
              <p className="mt-3 text-center text-sm text-gray-500 dark:text-gray-400">
                {scanCooldown ? "Move the product away from camera" : "Position barcode within the frame"}
              </p>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                <ScanLine className="w-10 h-10 text-primary-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                USB Barcode Scanner
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-xs mx-auto">
                Connect your USB barcode scanner and scan any product barcode. The
                system will automatically detect it.
              </p>
              <div className="relative max-w-xs mx-auto">
                <input
                  ref={inputRef}
                  type="text"
                  value={usbInput}
                  onChange={(e) => setUsbInput(e.target.value)}
                  placeholder="Or type barcode manually..."
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-pos-border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && usbInput.length > 3) {
                      handleScanSuccess(usbInput.trim());
                      setUsbInput("");
                    }
                  }}
                />
              </div>
              <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                Press Enter after typing the barcode
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

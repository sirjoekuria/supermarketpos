"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { X, ScanLine, Camera, Smartphone, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [scanMode, setScanMode] = useState<"camera" | "usb">("camera");
  const [usbInput, setUsbInput] = useState("");
  const [camError, setCamError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleScanSuccess = useCallback(
    (decodedText: string) => {
      onScan(decodedText);
    },
    [onScan]
  );

  useEffect(() => {
    if (!isOpen || scanMode !== "camera") return;
    
    let html5QrCode: Html5Qrcode | null = null;
    setCamError("");

    const startScanner = async () => {
      try {
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
        
        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
          setCamError("No camera found on this device.");
          return;
        }
        
        let cameraId = cameras[0].id;
        const backCamera = cameras.find(c => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('environment'));
        if (backCamera) {
          cameraId = backCamera.id;
        }

        await html5QrCode.start(
          cameraId,
          {
            fps: 10,
            qrbox: { width: 250, height: 200 },
          },
          (decodedText) => {
            handleScanSuccess(decodedText);
          },
          () => {
            // ignore scan errors (they happen every frame no barcode is found)
          }
        );
      } catch (err) {
        console.error("Camera access error:", err);
        setCamError("Could not access camera. Please check permissions.");
      }
    };

    // Slight delay to ensure DOM element is ready
    const timer = setTimeout(() => {
      startScanner();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => html5QrCode?.clear()).catch(console.error);
      }
    };
  }, [isOpen, scanMode, handleScanSuccess]);

  useEffect(() => {
    if (!isOpen || scanMode !== "usb") return;

    const handleKeyDown = (e: KeyboardEvent) => {
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
              <div id="reader" className="rounded-xl overflow-hidden bg-black" style={{ minHeight: "250px" }} />
              <div className="absolute inset-0 pointer-events-none border-2 border-primary-500/30 rounded-xl" />
              {camError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 rounded-xl p-4 text-center">
                  <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
                  <p className="text-white text-sm font-medium">{camError}</p>
                </div>
              )}
              <p className="mt-3 text-center text-sm text-gray-500 dark:text-gray-400">
                Position barcode within the frame
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

"use client";

/**
 * ScanFeedback.tsx
 *
 * Full-featured animated overlay shown on barcode scan events.
 * Renders a card with a SVG icon (animated stroke-dashoffset draw),
 * a shrinking progress bar, and plays the appropriate sound via
 * useBarcodeScanSound.
 *
 * Usage:
 *   <ScanFeedback show={show} type="success" barcode="1234567890" />
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useBarcodeScanSound } from "@/hooks/useBarcodeScanSound";
import "./ScanFeedback.css";

interface ScanFeedbackProps {
  /** Trigger showing the feedback */
  show?: boolean;
  /** Feedback type */
  type?: "success" | "error";
  /** Optional override message */
  message?: string;
  /** Barcode value to display */
  barcode?: string;
  /** Product image URL for successful scans */
  imageUrl?: string;
  /** Visible duration in ms before fading out (default: 850) */
  duration?: number;
  /** Callback when the exit animation finishes */
  onAnimationComplete?: () => void;
  /** Vertical anchor (default: "top") */
  position?: "center" | "top" | "bottom";
  /** Enable audio (default: true) */
  enableSound?: boolean;
}

export const ScanFeedback: React.FC<ScanFeedbackProps> = ({
  show = false,
  type = "success",
  message,
  barcode,
  imageUrl,
  duration = 850,
  onAnimationComplete,
  position = "top",
  enableSound = true,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentType, setCurrentType] = useState<"success" | "error">(type);
  const [currentBarcode, setCurrentBarcode] = useState(barcode);
  const [currentImageUrl, setCurrentImageUrl] = useState(imageUrl);
  const [currentMessage, setCurrentMessage] = useState(message);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const exitTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { playSuccessSound, playErrorSound } = useBarcodeScanSound({
    enableSuccess: enableSound,
    enableError: enableSound,
    useQuickSuccess: true,
  });

  const triggerFeedback = useCallback(() => {
    // Snapshot current props into state so updates mid-display are clean
    setCurrentType(type);
    setCurrentBarcode(barcode);
    setCurrentImageUrl(imageUrl);
    setCurrentMessage(message);

    // Cancel any pending hide
    if (timerRef.current) clearTimeout(timerRef.current);
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);

    setIsVisible(true);
    setIsAnimating(true);

    // Play sound
    if (enableSound) {
      type === "success" ? playSuccessSound() : playErrorSound();
    }

    // Start hide countdown
    timerRef.current = setTimeout(() => {
      setIsAnimating(false); // triggers animate-out CSS class

      exitTimerRef.current = setTimeout(() => {
        setIsVisible(false);
        onAnimationComplete?.();
      }, 280); // match scanFeedbackOut duration
    }, duration);
  }, [
    type,
    barcode,
    imageUrl,
    message,
    duration,
    enableSound,
    playSuccessSound,
    playErrorSound,
    onAnimationComplete,
  ]);

  // Trigger every time `show` flips to true
  useEffect(() => {
    if (show) triggerFeedback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, []);

  if (!isVisible) return null;

  const defaultMessages = {
    success: "Item added to cart",
    error: "Product not found",
  };

  const displayMessage = currentMessage ?? defaultMessages[currentType];

  return (
    <div className={`scan-feedback-container position-${position}`} role="status" aria-live="polite">
      <div
        className={`scan-feedback scan-feedback-${currentType} ${
          isAnimating ? "animate-in" : "animate-out"
        }`}
      >
        {/* Icon or product image */}
        <div className="scan-feedback-icon">
          {currentType === "success" && currentImageUrl ? (
            <img
              src={currentImageUrl}
              alt={displayMessage}
              className="scan-feedback-product-image"
            />
          ) : currentType === "success" ? (
            <SuccessIcon />
          ) : (
            <ErrorIcon />
          )}
        </div>

        {/* Text */}
        <div className="scan-feedback-content">
          <span className="scan-feedback-message">{displayMessage}</span>
          {currentBarcode && (
            <span className="scan-feedback-barcode">{currentBarcode}</span>
          )}
        </div>

        {/* Progress bar */}
        <div className="scan-feedback-progress">
          <div
            className={`scan-feedback-progress-bar scan-feedback-progress-${currentType}`}
            style={{ animationDuration: `${duration}ms` }}
          />
        </div>
      </div>
    </div>
  );
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const SuccessIcon: React.FC = () => (
  <svg
    className="scan-success-icon"
    viewBox="0 0 24 24"
    width="34"
    height="34"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9.5" className="icon-circle" />
    <path d="M7.5 12.5l3 3 5.5-6" className="icon-check" />
  </svg>
);

const ErrorIcon: React.FC = () => (
  <svg
    className="scan-error-icon"
    viewBox="0 0 24 24"
    width="34"
    height="34"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9.5" className="icon-circle" />
    <line x1="15" y1="9" x2="9" y2="15" className="icon-cross-1" />
    <line x1="9" y1="9" x2="15" y2="15" className="icon-cross-2" />
  </svg>
);

export default ScanFeedback;

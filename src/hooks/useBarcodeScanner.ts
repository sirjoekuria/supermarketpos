"use client";

import { useEffect, useRef, useCallback } from "react";

export function useBarcodeScanner(onScan: (barcode: string) => void) {
  const bufferRef = useRef("");
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.key === "Enter" && bufferRef.current.length > 3) {
        const barcode = bufferRef.current.trim();
        onScan(barcode);
        bufferRef.current = "";
        clearTimeout(timeoutRef.current);
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        bufferRef.current += e.key;
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          bufferRef.current = "";
        }, 100);
      }
    },
    [onScan]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timeoutRef.current);
    };
  }, [handleKeyDown]);
}

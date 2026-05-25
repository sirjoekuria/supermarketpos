"use client";

/**
 * useBarcodeScanSound.ts
 *
 * React hook wrapping the AudioManager for barcode scan audio feedback.
 * Handles rapid-scan detection (switches to quick beep after 3 rapid scans),
 * mute/volume controls, and sound-file availability checking.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import audioManager from "@/utils/audioManager";

interface UseBarcodeScanSoundOptions {
  /** Enable success sound (default: true) */
  enableSuccess?: boolean;
  /** Enable error sound (default: true) */
  enableError?: boolean;
  /**
   * After this many rapid successive scans (<200 ms apart),
   * switch to the shorter "quick" beep (default: true)
   */
  useQuickSuccess?: boolean;
  /** Min ms between same-type sounds (default: 50) */
  debounceMs?: number;
  /** Called each time a sound fires */
  onSoundPlay?: (type: "success" | "error") => void;
}

interface UseBarcodeScanSoundReturn {
  playSuccessSound: () => void;
  playErrorSound: () => void;
  setMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
  isSoundAvailable: boolean;
  isMuted: boolean;
}

export function useBarcodeScanSound(
  options: UseBarcodeScanSoundOptions = {}
): UseBarcodeScanSoundReturn {
  const {
    enableSuccess = true,
    enableError = true,
    useQuickSuccess = true,
    debounceMs = 50,
    onSoundPlay,
  } = options;

  const [isSoundAvailable, setIsSoundAvailable] = useState(true);
  const [isMuted, setIsMutedState] = useState(false);

  const lastSuccessRef = useRef(0);
  const lastErrorRef = useRef(0);
  const rapidCountRef = useRef(0);
  const rapidTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check sound file availability once on mount
  useEffect(() => {
    audioManager.checkSoundAvailability().then((avail) => {
      setIsSoundAvailable(avail["success"] ?? true);
    });

    return () => {
      if (rapidTimerRef.current) clearTimeout(rapidTimerRef.current);
    };
  }, []);

  // ─── Success ─────────────────────────────────────────────────────────────
  const playSuccessSound = useCallback(() => {
    if (!enableSuccess || isMuted) return;

    const now = Date.now();
    const gap = now - lastSuccessRef.current;

    // Track rapid consecutive scans
    if (gap < 200) {
      rapidCountRef.current++;
    } else {
      rapidCountRef.current = 0;
    }

    // Reset rapid counter after a pause
    if (rapidTimerRef.current) clearTimeout(rapidTimerRef.current);
    rapidTimerRef.current = setTimeout(() => {
      rapidCountRef.current = 0;
    }, 400);

    // Debounce
    if (gap < debounceMs) return;
    lastSuccessRef.current = now;

    // Switch to quick beep for rapid scans
    if (useQuickSuccess && rapidCountRef.current >= 3) {
      audioManager.playScanSuccessQuick();
    } else {
      audioManager.playScanSuccess();
    }

    onSoundPlay?.("success");
  }, [enableSuccess, isMuted, debounceMs, useQuickSuccess, onSoundPlay]);

  // ─── Error ────────────────────────────────────────────────────────────────
  const playErrorSound = useCallback(() => {
    if (!enableError || isMuted) return;

    const now = Date.now();
    if (now - lastErrorRef.current < debounceMs) return;
    lastErrorRef.current = now;

    audioManager.playScanError();
    onSoundPlay?.("error");
  }, [enableError, isMuted, debounceMs, onSoundPlay]);

  // ─── Controls ─────────────────────────────────────────────────────────────
  const setMuted = useCallback((muted: boolean) => {
    setIsMutedState(muted);
    audioManager.setMuted(muted);
  }, []);

  const setVolume = useCallback((volume: number) => {
    audioManager.setVolume(volume);
  }, []);

  return {
    playSuccessSound,
    playErrorSound,
    setMuted,
    setVolume,
    isSoundAvailable,
    isMuted,
  };
}

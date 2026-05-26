import { useEffect, useState, useCallback } from 'react';
import {
  isNativeApp,
  isAndroid,
  isIOS,
  isBiometricAvailable,
  performBiometricAuth,
  vibrate,
  playSound,
  showToast,
  requestCameraPermission,
  getDeviceInfo,
} from '@/lib/capacitor-utils';

export interface CapacitorConfig {
  isNative: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  isBiometricAvailable: boolean;
  hasCameraPermission: boolean;
}

export const useCapacitor = () => {
  const [config, setConfig] = useState<CapacitorConfig>({
    isNative: false,
    isAndroid: false,
    isIOS: false,
    isBiometricAvailable: false,
    hasCameraPermission: false,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize Capacitor config
  useEffect(() => {
    const initializeCapacitor = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const native = isNativeApp();
        const android = isAndroid();
        const ios = isIOS();
        const biometric = native ? await isBiometricAvailable() : false;
        const cameraPermission = native ? await requestCameraPermission() : true;

        setConfig({
          isNative: native,
          isAndroid: android,
          isIOS: ios,
          isBiometricAvailable: biometric,
          hasCameraPermission: cameraPermission,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize Capacitor');
      } finally {
        setIsLoading(false);
      }
    };

    initializeCapacitor();
  }, []);

  // Biometric authentication
  const authenticate = useCallback(
    async (reason: string = 'Authenticate to continue'): Promise<boolean> => {
      try {
        if (!config.isBiometricAvailable) {
          setError('Biometric authentication not available on this device');
          return false;
        }
        return await performBiometricAuth(reason);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Authentication failed';
        setError(message);
        return false;
      }
    },
    [config.isBiometricAvailable]
  );

  // Haptic feedback
  const hapticFeedback = useCallback(async (type: 'light' | 'medium' | 'heavy' = 'medium') => {
    try {
      const duration = type === 'light' ? 50 : type === 'medium' ? 100 : 150;
      await vibrate(duration);
    } catch (err) {
      console.error('Haptic feedback error:', err);
    }
  }, []);

  // Play sound (for scanner)
  const playScannerBeep = useCallback(async () => {
    try {
      await playSound(1000, 200); // 1000Hz for 200ms
      await hapticFeedback('medium');
    } catch (err) {
      console.error('Scanner beep error:', err);
    }
  }, [hapticFeedback]);

  // Show toast notification
  const notify = useCallback(
    async (message: string, duration: 'short' | 'long' = 'short') => {
      try {
        await showToast(message, duration);
      } catch (err) {
        console.error('Toast error:', err);
      }
    },
    []
  );

  // Request camera permission
  const requestCamera = useCallback(async () => {
    try {
      const result = await requestCameraPermission();
      setConfig((prev) => ({ ...prev, hasCameraPermission: result }));
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Camera permission request failed');
      return false;
    }
  }, []);

  return {
    config,
    isLoading,
    error,
    authenticate,
    hapticFeedback,
    playScannerBeep,
    notify,
    requestCamera,
  };
};

export default useCapacitor;

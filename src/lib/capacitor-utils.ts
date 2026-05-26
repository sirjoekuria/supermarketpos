import { Capacitor } from '@capacitor/core';

/**
 * Check if app is running in Capacitor (native app)
 */
export const isNativeApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  return Capacitor.isNativePlatform();
};

/**
 * Check if running on Android specifically
 */
export const isAndroid = (): boolean => {
  if (typeof window === 'undefined') return false;
  return Capacitor.getPlatform() === 'android';
};

/**
 * Check if running on iOS
 */
export const isIOS = (): boolean => {
  if (typeof window === 'undefined') return false;
  return Capacitor.getPlatform() === 'ios';
};

/**
 * Get device information
 */
export const getDeviceInfo = async () => {
  if (typeof window === 'undefined') return null;
  // If native app and the global Capacitor has the device plugin registered
  const Device = (window as any).Capacitor?.Plugins?.Device;
  if (Device) {
    try {
      return await Device.getInfo();
    } catch (error) {
      console.error('Error getting device info:', error);
    }
  }
  return {
    platform: Capacitor.getPlatform(),
    model: 'Web Browser',
    operatingSystem: isAndroid() ? 'android' : isIOS() ? 'ios' : 'web',
  };
};

/**
 * Show native toast notification
 */
export const showToast = async (message: string, duration: 'short' | 'long' = 'short') => {
  if (typeof window === 'undefined') return;
  const Toast = (window as any).Capacitor?.Plugins?.Toast;
  if (Toast && isNativeApp()) {
    try {
      await Toast.show({
        text: message,
        duration: duration === 'short' ? 'short' : 'long',
      });
      return;
    } catch (error) {
      console.error('Error showing native toast:', error);
    }
  }
  // Fallback for web
  console.log('Toast:', message);
};

/**
 * Request camera permission
 */
export const requestCameraPermission = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  if (!isNativeApp()) {
    // On web, browser handles permissions
    return true;
  }

  const Camera = (window as any).Capacitor?.Plugins?.Camera;
  if (Camera) {
    try {
      const result = await Camera.requestPermissions();
      return result?.camera === 'granted' || result?.photos === 'granted';
    } catch (error) {
      console.error('Error requesting camera permission:', error);
    }
  }
  return true;
};

/**
 * Check if biometric is available on device
 */
export const isBiometricAvailable = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;

  if (!isNativeApp()) {
    // Check for WebAuthn support on web
    return typeof window.PublicKeyCredential !== 'undefined';
  }

  const Biometric = (window as any).Capacitor?.Plugins?.Biometric || (window as any).Capacitor?.Plugins?.FingerprintAuth;
  if (Biometric) {
    try {
      const result = await Biometric.isAvailable();
      return result?.isAvailable === true;
    } catch (error) {
      console.error('Error checking biometric availability:', error);
    }
  }
  return false;
};

/**
 * Perform biometric authentication
 */
export const performBiometricAuth = async (
  reason: string = 'Authenticate to continue'
): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  if (!isNativeApp()) {
    return false;
  }

  const Biometric = (window as any).Capacitor?.Plugins?.Biometric || (window as any).Capacitor?.Plugins?.FingerprintAuth;
  if (Biometric) {
    try {
      await Biometric.authenticate({
        reason,
        title: 'Manager Authorization',
        subtitle: 'Verify your identity',
        description: 'Place your finger on the sensor',
      });
      return true;
    } catch (error: any) {
      console.error('Biometric authentication failed:', error);
    }
  }
  return false;
};

/**
 * Get clipboard content
 */
export const getClipboard = async (): Promise<string | null> => {
  if (typeof window === 'undefined') return null;

  if (!isNativeApp()) {
    try {
      return await navigator.clipboard.readText();
    } catch (error) {
      return null;
    }
  }

  const Clipboard = (window as any).Capacitor?.Plugins?.Clipboard;
  if (Clipboard) {
    try {
      const result = await Clipboard.read();
      return result?.value || null;
    } catch (error) {
      console.error('Error reading native clipboard:', error);
    }
  }
  return null;
};

/**
 * Set clipboard content
 */
export const setClipboard = async (text: string): Promise<boolean> => {
  if (typeof window === 'undefined') return false;

  if (!isNativeApp()) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      return false;
    }
  }

  const Clipboard = (window as any).Capacitor?.Plugins?.Clipboard;
  if (Clipboard) {
    try {
      await Clipboard.write({ string: text });
      return true;
    } catch (error) {
      console.error('Error writing to native clipboard:', error);
    }
  }
  return false;
};

/**
 * Play sound (for scanner beep feedback)
 */
export const playSound = async (frequency: number = 1000, duration: number = 200) => {
  if (typeof window === 'undefined') return;

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const audioContext = new AudioCtx();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration / 1000);
  } catch (error) {
    console.error('Error playing sound:', error);
  }
};

/**
 * Vibrate device
 */
export const vibrate = async (duration: number = 200) => {
  if (typeof window === 'undefined') return;

  try {
    if ('vibrate' in navigator) {
      navigator.vibrate(duration);
    }
  } catch (error) {
    console.error('Error vibrating:', error);
  }
};

/**
 * Keep screen on (prevent device from sleeping)
 */
export const keepScreenOn = async (on: boolean = true) => {
  if (typeof window === 'undefined') return;
  if (!isNativeApp()) return;

  const ScreenBrightness = (window as any).Capacitor?.Plugins?.ScreenBrightness;
  if (ScreenBrightness) {
    try {
      await ScreenBrightness.setBrightness({
        brightness: on ? 1.0 : 0.5,
      });
    } catch (error) {
      console.error('Error controlling screen:', error);
    }
  }
};

export default {
  isNativeApp,
  isAndroid,
  isIOS,
  getDeviceInfo,
  showToast,
  requestCameraPermission,
  isBiometricAvailable,
  performBiometricAuth,
  getClipboard,
  setClipboard,
  playSound,
  vibrate,
  keepScreenOn,
};

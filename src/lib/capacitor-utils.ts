import { Capacitor, Plugins } from '@capacitor/core';

const { Camera, Biometric, Device, Toast } = Plugins;

/**
 * Check if app is running in Capacitor (native app)
 */
export const isNativeApp = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Check if running on Android specifically
 */
export const isAndroid = (): boolean => {
  return Capacitor.getPlatform() === 'android';
};

/**
 * Check if running on iOS
 */
export const isIOS = (): boolean => {
  return Capacitor.getPlatform() === 'ios';
};

/**
 * Get device information
 */
export const getDeviceInfo = async () => {
  try {
    const info = await Device.getInfo();
    return info;
  } catch (error) {
    console.error('Error getting device info:', error);
    return null;
  }
};

/**
 * Show native toast notification
 */
export const showToast = async (message: string, duration: 'short' | 'long' = 'short') => {
  try {
    if (isNativeApp()) {
      await Toast.show({
        text: message,
        duration: duration === 'short' ? 2000 : 3500,
      });
    } else {
      // Fallback for web
      console.log('Toast:', message);
    }
  } catch (error) {
    console.error('Error showing toast:', error);
  }
};

/**
 * Request camera permission
 */
export const requestCameraPermission = async (): Promise<boolean> => {
  if (!isNativeApp()) {
    // On web, browser handles permissions
    return true;
  }

  try {
    const result = await Capacitor.Plugins.Camera?.requestPermissions?.();
    return result?.camera === 'granted' || result?.photos === 'granted';
  } catch (error) {
    console.error('Error requesting camera permission:', error);
    return false;
  }
};

/**
 * Check if biometric is available on device
 */
export const isBiometricAvailable = async (): Promise<boolean> => {
  if (!isNativeApp()) {
    // Check for WebAuthn support on web
    return window.PublicKeyCredential !== undefined;
  }

  try {
    const result = await Biometric?.isAvailable?.();
    return result?.isAvailable === true;
  } catch (error) {
    console.error('Error checking biometric availability:', error);
    return false;
  }
};

/**
 * Perform biometric authentication
 */
export const performBiometricAuth = async (
  reason: string = 'Authenticate to continue'
): Promise<boolean> => {
  if (!isNativeApp()) {
    return false;
  }

  try {
    await Biometric?.authenticate?.({
      reason,
      title: 'Manager Authorization',
      subtitle: 'Verify your identity',
      description: 'Place your finger on the sensor',
    });
    return true;
  } catch (error: any) {
    console.error('Biometric authentication failed:', error);
    return false;
  }
};

/**
 * Get clipboard content
 */
export const getClipboard = async (): Promise<string | null> => {
  if (!isNativeApp()) {
    try {
      return await navigator.clipboard.readText();
    } catch (error) {
      return null;
    }
  }

  try {
    const result = await Capacitor.Plugins.Clipboard?.read?.();
    return result?.value || null;
  } catch (error) {
    return null;
  }
};

/**
 * Set clipboard content
 */
export const setClipboard = async (text: string): Promise<boolean> => {
  if (!isNativeApp()) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      return false;
    }
  }

  try {
    await Capacitor.Plugins.Clipboard?.write?.({ string: text });
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Play sound (for scanner beep feedback)
 */
export const playSound = async (frequency: number = 1000, duration: number = 200) => {
  if (isNativeApp() && isAndroid()) {
    try {
      // Use native audio API if available
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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
  }
};

/**
 * Vibrate device
 */
export const vibrate = async (duration: number = 200) => {
  if (isNativeApp()) {
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate(duration);
      }
    } catch (error) {
      console.error('Error vibrating:', error);
    }
  }
};

/**
 * Keep screen on (prevent device from sleeping)
 */
export const keepScreenOn = async (on: boolean = true) => {
  if (isNativeApp()) {
    try {
      await Capacitor.Plugins.ScreenBrightness?.setBrightness?.({
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

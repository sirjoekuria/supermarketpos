# Capacitor Android APK Setup Guide

This guide will help you convert the POS web app to an Android APK with live app functionality.

## Prerequisites

### Required Tools
- **Node.js** (v16+)
- **Java Development Kit (JDK)** (v11+)
- **Android SDK** (API level 26+)
- **Android Studio** (recommended)
- **Git**

### Installation Steps

#### 1. Install Java/JDK
**Windows/Mac/Linux:**
- Download from: https://www.oracle.com/java/technologies/downloads/
- Or install via package manager (Homebrew on Mac, Chocolatey on Windows)

#### 2. Install Android Studio
- Download from: https://developer.android.com/studio
- During setup, install:
  - Android SDK
  - Android SDK Platform Tools
  - Android Emulator

#### 3. Set Environment Variables

**Windows:**
```batch
setx JAVA_HOME "C:\Program Files\Java\jdk-11"
setx ANDROID_HOME "C:\Users\YourUsername\AppData\Local\Android\Sdk"
setx PATH "%PATH%;%ANDROID_HOME%\tools;%ANDROID_HOME%\platform-tools"
```

**Mac/Linux:**
```bash
export JAVA_HOME=$(/usr/libexec/java_home)
export ANDROID_HOME=$HOME/Library/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
```

## Project Setup

### 1. Install Capacitor Dependencies

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npm install @capacitor/camera @capacitor/biometric @capacitor/device
```

### 2. Initialize Capacitor (if not already done)

```bash
npx cap init
```

Follow the prompts:
- App name: `Rocscrew Supermarket POS`
- App Package ID: `com.rocscrewsupermarket.pos`
- Web Dir: `out`

### 3. Add Android Platform

```bash
npx cap add android
```

## Live App Development

The app is configured to load from: **https://supermarketpos.vercel.app**

### How It Works
- The Android app is a **web container** that loads the live website
- Any changes you make to the website are immediately reflected in the app
- **No need to rebuild the APK** after small changes
- Just rebuild when you want to distribute a new version

### Development Workflow

#### Option A: Using the Script (Recommended)

**Windows:**
```bash
scripts\capacitor-dev.bat
```

**Mac/Linux:**
```bash
chmod +x scripts/capacitor-dev.sh
./scripts/capacitor-dev.sh
```

#### Option B: Manual Steps

```bash
# 1. Build the Next.js app
npm run build

# 2. Sync assets with Capacitor
npx cap sync android

# 3. Open Android Studio
npx cap open android
```

### Running the App

1. **Open Android Studio** (will open automatically with the script)
2. **Select a device:**
   - Virtual: Create/select an emulator in AVD Manager
   - Physical: Connect your Android phone via USB (enable Developer Mode)
3. **Click the "Run" button** (green play icon)
4. App will install and launch on the device

### Live Updates

The app automatically loads from the live URL. To push updates:

```bash
# Make changes to your Next.js app
# Push to GitHub
git add -A
git commit -m "your changes"
git push origin main

# vercel auto-deploys on push
# Changes are live in the app immediately (may need to refresh)
```

## Permissions

All necessary permissions are configured in `AndroidManifest.xml`:

### Camera
- Used for barcode scanning
- Requested at runtime on Android 6+

### Biometric/Fingerprint
- Used for manager authentication
- Permission: `USE_BIOMETRIC` and `USE_FINGERPRINT`

### Network
- Internet access
- Network state checking

### Storage
- Read/write for document storage and receipts

### Audio
- Scanner beep feedback sounds

### NFC (Optional)
- Future support for card readers

## Permissions Prompt Example

The app will request permissions when first needed:

```javascript
// Example: Request camera permission
import { Permissions } from '@capacitor/core';

const request = await Permissions.requestPermissions({
  permissions: ['camera'],
});
```

## Building APK for Distribution

### Debug APK (for testing)
```bash
# Open Android Studio and select Build > Build Bundle(s) / APK(s) > Build APK(s)
# Or use command line:
cd android
./gradlew assembleDebug
# APK will be at: android/app/build/outputs/apk/debug/app-debug.apk
```

### Release APK (for distribution)

1. **Create a Keystore** (one-time):
```bash
keytool -genkey -v -keystore rocscrew.keystore -keyalg RSA -keysize 2048 -validity 10000
```

2. **Update capacitor.config.ts** with keystore details

3. **Build Release APK**:
```bash
cd android
./gradlew assembleRelease
```

## Troubleshooting

### Camera Not Working
- Ensure camera permission is granted in Settings > Apps > POS > Permissions
- Check that `<uses-permission android:name="android.permission.CAMERA" />` is in AndroidManifest.xml

### Biometric Not Available
- Device must support fingerprint/face ID
- Check Android version (API 28+)
- Grant permission in Settings

### Live URL Not Loading
- Ensure vercel deployment is successful
- Check internet connection
- Verify `server.url` in capacitor.config.ts matches deployed URL

### Build Errors
```bash
# Clean build
cd android
./gradlew clean

# Rebuild
cd ..
npx cap sync android
npx cap open android
```

## Useful Commands

```bash
# Sync web assets
npx cap sync android

# Copy only
npx cap copy android

# Update native code
npx cap update android

# Open Android Studio
npx cap open android

# View logs
npx cap run android --external

# Get device info
npx cap run android --info
```

## File Structure

```
project-root/
├── capacitor.config.ts          # Capacitor configuration
├── android/                     # Android native code
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml
│   │   │   └── res/
│   │   └── build.gradle
│   └── build.gradle
├── scripts/
│   ├── capacitor-dev.sh        # Dev script (Mac/Linux)
│   └── capacitor-dev.bat       # Dev script (Windows)
├── out/                        # Built Next.js app (web assets)
└── package.json
```

## Next Steps

1. ✅ Install prerequisites (Java, Android SDK, Android Studio)
2. ✅ Install Capacitor packages
3. ✅ Set up environment variables
4. ✅ Run `scripts/capacitor-dev.sh` (or .bat on Windows)
5. ✅ Build and deploy app to a device
6. ✅ Test barcode scanner and manager auth

## Support

For issues:
- Capacitor Docs: https://capacitorjs.com
- Android Studio Docs: https://developer.android.com
- Ionic Community: https://forum.ionicframework.com

---

**Remember:** Changes to the web app are live immediately. Only rebuild the APK when distributing a new version!

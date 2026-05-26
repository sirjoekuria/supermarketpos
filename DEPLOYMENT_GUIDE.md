# Rocscrew Supermarket POS - Deployment Guide

This guide covers building the app for Android, deployment to Netlify, and live app configuration.

## Live App Setup

Your app is configured to load from: **https://rocscrewsupermarket.netlify.app**

### Benefits
- No need to rebuild APK for small changes
- Changes deploy instantly via Netlify
- Use Android emulator or physical device for testing
- Development cycle is rapid (push → deploy → test)

## Prerequisites

### For Web (Netlify)
- GitHub account
- Netlify account (free tier available)

### For Android (Capacitor)
- Node.js v16+
- Java JDK 11+
- Android SDK
- Android Studio

## Step 1: Deploy Web App to Netlify

### Using GitHub Integration (Recommended)

1. **Push code to GitHub:**
```bash
git add -A
git commit -m "feat: add capacitor android support"
git push origin main
```

2. **Connect to Netlify:**
   - Go to https://netlify.com
   - Click "Add new site" → "Import an existing project"
   - Choose GitHub and select your repository
   - Configure build settings:
     - **Build command:** `npm run build`
     - **Publish directory:** `out`
     - **Node version:** 18

3. **Set environment variables** (if needed):
   - Go to Site Settings → Build & Deploy → Environment
   - Add any required `.env` variables

4. **Deploy:**
   - Push to main branch
   - Netlify auto-deploys

### Verify Deployment
```bash
curl https://rocscrewsupermarket.netlify.app
```

## Step 2: Build Android APK

### Option A: Using Development Script

**Windows:**
```bash
scripts\capacitor-dev.bat
```

**Mac/Linux:**
```bash
chmod +x scripts/capacitor-dev.sh
./scripts/capacitor-dev.sh
```

This will:
1. Build Next.js app
2. Sync assets to Android
3. Open Android Studio

### Option B: Manual Commands

```bash
# 1. Build Next.js
npm run build

# 2. Sync to Capacitor
npx cap sync android

# 3. Build Android APK
cd android
./gradlew assembleDebug
cd ..

# APK will be at: android/app/build/outputs/apk/debug/app-debug.apk
```

## Step 3: Deploy APK to Device

### Using Android Studio

1. **Open project:**
   ```bash
   npx cap open android
   ```

2. **Select device:**
   - Virtual: Open AVD Manager and select/create emulator
   - Physical: Connect phone via USB with Developer Mode enabled

3. **Run app:**
   - Click the green "Run" button
   - Select your device
   - Wait for build and install

### Using Command Line

```bash
# Connect device via USB or start emulator
adb devices

# Install debug APK
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# Run app
adb shell am start -n com.rocscrewsupermarket.pos/.MainActivity
```

## Step 4: Live Development Workflow

### Scenario: Making UI Changes

1. **Make changes to web app:**
   ```bash
   # Edit React/Next.js files
   # e.g., src/components/pos/POSScreen.tsx
   ```

2. **Push to GitHub:**
   ```bash
   git add -A
   git commit -m "fix: ui improvements"
   git push origin main
   ```

3. **Netlify auto-deploys** (usually <2 minutes)

4. **Refresh app on device:**
   - Force refresh: Swipe down then up on Android
   - Or restart app from home screen

### Scenario: Modifying Native Features

1. **Make changes to Java/Kotlin:**
   ```bash
   # Edit android/app/src/main/java files
   ```

2. **Sync and rebuild:**
   ```bash
   npm run build
   npx cap sync android
   npx cap open android
   ```

3. **Rebuild and deploy from Android Studio**

## Continuous Integration/Deployment

### GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Netlify

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm ci
      - run: npm run build
      
      - uses: netlify/actions/cli@master
        with:
          args: deploy --prod
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

## Testing

### Test on Device

1. **Camera/Scanner:**
   - Open Scan Barcode
   - Point at product barcode
   - Verify it reads correctly

2. **Biometric:**
   - Try remove item (triggers auth)
   - Use fingerprint/face ID if available
   - Or use PIN: `1234` or `5678`

3. **Network:**
   - Go offline (airplane mode)
   - Try operations
   - Go back online
   - Verify sync works

4. **Performance:**
   - Monitor battery usage
   - Check for memory leaks
   - Test with slow network

## Troubleshooting

### APK Not Installing
```bash
# Clear app data
adb shell pm clear com.rocscrewsupermarket.pos

# Uninstall and reinstall
adb uninstall com.rocscrewsupermarket.pos
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### App Won't Load Website
- Check internet connection
- Verify Netlify deployment succeeded
- Check `capacitor.config.ts` has correct URL
- Verify no CORS issues

### Camera Not Working
- Grant camera permission in Settings
- Ensure Android 6+ (API 26+)
- Try restarting app

### Biometric Not Working
- Device must support fingerprint/face ID
- Check biometric settings on device
- For emulator, enable in AVD settings

## Release Build

When ready to publish to Google Play:

### 1. Create Signing Key
```bash
keytool -genkey -v -keystore rocscrew.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias rocscrew
```

### 2. Update Signing Config
Edit `android/app/build.gradle`:
```gradle
signingConfigs {
    release {
        storeFile file('rocscrew.keystore')
        storePassword 'YOUR_PASSWORD'
        keyAlias 'rocscrew'
        keyPassword 'YOUR_PASSWORD'
    }
}
```

### 3. Build Release APK
```bash
cd android
./gradlew assembleRelease
cd ..

# Or build AAB for Play Store
cd android
./gradlew bundleRelease
cd ..
```

### 4. Upload to Google Play
- Create account on https://play.google.com/console
- Create new app
- Upload AAB file
- Fill metadata and screenshots
- Submit for review

## Performance Tips

1. **Reduce bundle size:**
   ```bash
   npm run build
   # Check output size
   ```

2. **Optimize images:**
   - Use WebP format
   - Compress before upload
   - Use lazy loading

3. **Monitor performance:**
   - Use Chrome DevTools on emulator
   - Check Network tab
   - Monitor CPU usage

## Security Checklist

- [ ] No hardcoded credentials in code
- [ ] Use environment variables for secrets
- [ ] HTTPS enforced for all connections
- [ ] Validate user input
- [ ] Implement proper auth
- [ ] Secure storage for sensitive data
- [ ] Regular dependency updates

## Support & Resources

- **Capacitor Docs:** https://capacitorjs.com
- **Android Docs:** https://developer.android.com
- **Netlify Docs:** https://docs.netlify.com
- **Next.js Docs:** https://nextjs.org/docs

---

**Quick Commands:**
```bash
npm run build              # Build web app
npm run cap:sync          # Sync to Capacitor
npm run cap:dev           # Open Android Studio
npm run android:build     # Build debug APK
npm run android:release   # Build release APK
```

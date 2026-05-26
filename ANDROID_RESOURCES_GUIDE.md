# Android Resources Configuration

This guide explains the Android resources setup for RC Stores POS app.

## What's Been Configured

### 1. **Splash Screen**
- Displays when app is launching
- Shows RC Stores branding with "Initializing POS..." message
- White background with blue logo
- Automatically transitions to main app

**Location:** `android/app/src/main/res/drawable/splash_logo.xml`

### 2. **App Icon**
- Blue square with white "R" logo
- Adaptive icon support (Android 8+)
- Green accent bar
- Used on home screen, app drawer, etc.

**Locations:**
- `android/app/src/main/res/drawable/ic_launcher_logo.xml` - Vector logo
- `android/app/src/main/res/drawable/ic_launcher_foreground.xml` - Icon foreground
- `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml` - Adaptive icon config

### 3. **Colors**
```xml
<!-- Primary blue -->
Primary: #2563EB
Primary Dark: #1E40AF

<!-- Accent green -->
Accent: #10B981
```

### 4. **Themes**
- **SplashScreenTheme** - Used during app launch
- **AppTheme** - Used for main app
- **MainActivity** - Activity theme

## File Structure

```
android/app/src/main/res/
├── drawable/
│   ├── splash_screen.xml       # Splash screen layout
│   ├── splash_logo.xml         # Logo with branding
│   ├── ic_launcher_logo.xml    # R logo vector
│   └── ic_launcher_foreground.xml
├── mipmap-anydpi-v26/
│   └── ic_launcher.xml         # Adaptive icon config
└── values/
    ├── colors.xml              # Color definitions
    ├── strings.xml             # App name and labels
    └── styles.xml              # Themes and styles
```

## How to Customize

### Change App Name
Edit `android/app/src/main/res/values/strings.xml`:
```xml
<string name="app_name">Your App Name</string>
```

### Change Logo/Icon
Replace the SVG paths in `ic_launcher_logo.xml`:
```xml
<path android:fillColor="#FFFFFF" android:pathData="..." />
```

### Change Colors
Edit `android/app/src/main/res/values/colors.xml`:
```xml
<color name="primary">#YOUR_COLOR</color>
```

### Change Splash Screen
Edit `android/app/src/main/res/drawable/splash_logo.xml`:
- Adjust logo size
- Change background color
- Add/remove text

## Using Custom Images

If you want to use the uploaded PNG images instead of XML drawables:

### 1. Add Image Files
Place PNG files in drawable folders:
```
android/app/src/main/res/
├── drawable/
│   ├── splash_image.png        # 1080x1920 (LDPI)
│   ├── ic_launcher_round.png   # 192x192
│   └── ic_launcher.png         # 192x192
├── drawable-hdpi/
│   ├── ic_launcher_round.png   # 288x288
│   └── ic_launcher.png         # 288x288
├── drawable-xhdpi/
│   ├── ic_launcher_round.png   # 384x384
│   └── ic_launcher.png         # 384x384
└── drawable-xxhdpi/
    ├── ic_launcher_round.png   # 576x576
    └── ic_launcher.png         # 576x576
```

### 2. Update XML References
Edit `android/app/src/main/res/drawable/splash_screen.xml`:
```xml
<item android:drawable="@drawable/splash_image" />
```

Edit `android/app/src/main/res/drawable/ic_launcher_foreground.xml`:
```xml
<item android:drawable="@drawable/ic_launcher" />
```

## Android Icon Size Guidelines

### App Icon Sizes Needed
- **LDPI (low density):** 36x36 px
- **MDPI (medium density):** 48x48 px
- **HDPI (high density):** 72x72 px
- **XHDPI (extra high):** 96x96 px
- **XXHDPI (extra extra high):** 144x144 px
- **XXXHDPI (extra extra extra):** 192x192 px

### Splash Screen Sizes
- **Portrait:** 1080x1920 (16:9 ratio)
- **Landscape:** 1920x1080

## Testing Resources

1. **Build app:**
   ```bash
   npm run android:build
   ```

2. **Install on device:**
   ```bash
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   ```

3. **View splash screen:**
   - Uninstall app: `adb uninstall com.rocscrewsupermarket.pos`
   - Reinstall to see splash screen again

4. **Check icon:**
   - Look at home screen or app drawer
   - Should show blue square with white "R"

## Vector vs Raster Graphics

### Vector Drawables (XML)
✅ Scalable to any size
✅ Small file size
✅ Perfect for icons
❌ Complex gradients not supported

### Raster Images (PNG)
✅ Any design possible
✅ Gradients, photos, complex designs
❌ Need multiple sizes
❌ Larger file size

**Current Setup:** Uses vector drawables for compatibility and small size.

## Troubleshooting

### Splash Screen Not Showing
- Check `android:theme="@style/SplashScreenTheme"` in manifest
- Verify `splash_logo.xml` exists
- Clean build: `./gradlew clean assembleDebug`

### Icon Not Displaying
- Ensure `@mipmap/ic_launcher` references exist
- Check `ic_launcher.xml` in mipmap-anydpi-v26
- Rebuild: `npm run android:build`

### Colors Not Applying
- Verify `colors.xml` has correct definitions
- Check theme references color names
- Rebuild app

## Resources

- **Android Icon Guidelines:** https://developer.android.com/guide/practices/ui_guidelines/icon_design
- **Adaptive Icons:** https://developer.android.com/guide/practices/ui_guidelines/icon_design_adaptive
- **Vector Drawables:** https://developer.android.com/guide/topics/graphics/vector-drawable-resources

---

**Current Status:** ✅ All resources configured with vector drawables and themes ready for use!

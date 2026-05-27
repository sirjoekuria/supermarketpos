@echo off
REM Capacitor Development Script for Live App (Windows)

echo.
echo 🚀 Starting Capacitor Development Mode...
echo.
echo This script sets up live development with Capacitor
echo The app will connect to: https://supermarketpos.vercel.app
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo Error: package.json not found. Run this from the project root.
    exit /b 1
)

echo Step 1: Building Next.js app for production...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo Build failed!
    exit /b 1
)
echo ✓ Build complete
echo.

echo Step 2: Syncing web assets to Capacitor...
call npx cap sync android
if %ERRORLEVEL% NEQ 0 (
    echo Sync failed!
    exit /b 1
)
echo ✓ Assets synced
echo.

echo Step 3: Opening Android development environment...
call npx cap open android

echo.
echo ✓ Capacitor development ready!
echo.
echo Next steps:
echo 1. Android Studio should open automatically
echo 2. Select a virtual device or connect a physical Android phone
echo 3. Click 'Run' to build and deploy the app
echo 4. Changes to https://supermarketpos.vercel.app will be live
echo.
echo For live reload during development:
echo npm run dev  (In one terminal for local testing)
echo npm run build ^&^& npx cap sync android  (When ready to update app)
echo.

#!/bin/bash

# Capacitor Development Script for Live App

echo "🚀 Starting Capacitor Development Mode..."
echo ""
echo "This script sets up live development with Capacitor"
echo "The app will connect to: https://rocscrewsupermarket.netlify.app"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Run this from the project root.${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Building Next.js app for production...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Build complete${NC}"
echo ""

echo -e "${YELLOW}Step 2: Syncing web assets to Capacitor...${NC}"
npx cap sync android
if [ $? -ne 0 ]; then
    echo -e "${RED}Sync failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Assets synced${NC}"
echo ""

echo -e "${YELLOW}Step 3: Opening Android development environment...${NC}"
npx cap open android

echo ""
echo -e "${GREEN}✓ Capacitor development ready!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Android Studio should open automatically"
echo "2. Select a virtual device or connect a physical Android phone"
echo "3. Click 'Run' to build and deploy the app"
echo "4. Changes to https://rocscrewsupermarket.netlify.app will be live"
echo ""
echo -e "${YELLOW}For live reload during development:${NC}"
echo "npm run dev  # In one terminal (for local testing)"
echo "npm run build && npx cap sync android  # When ready to update app"
echo ""

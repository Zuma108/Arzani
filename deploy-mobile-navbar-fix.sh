#!/bin/bash

# Mobile Navbar Fix Deployment Script
# This script ensures the mobile navbar fixes are properly deployed

echo "🔧 Applying Mobile Navbar Fixes..."

# Ensure CSS files have correct permissions
chmod 644 public/css/mobile-navbar-fix.css
chmod 644 public/css/navbar2.css
chmod 644 public/css/mobile-hero-fixes.css

# Ensure JS files have correct permissions
chmod 644 public/js/mobile-navbar-fix.js
chmod 644 public/js/navbar2.js

# Clear any cached CSS/JS files
echo "🧹 Clearing CSS/JS cache..."
find public/css -name "*.css" -exec touch {} \;
find public/js -name "*.js" -exec touch {} \;

# Test if files exist
if [ -f "public/css/mobile-navbar-fix.css" ]; then
    echo "✅ mobile-navbar-fix.css exists"
else
    echo "❌ mobile-navbar-fix.css missing"
fi

if [ -f "public/js/mobile-navbar-fix.js" ]; then
    echo "✅ mobile-navbar-fix.js exists"
else
    echo "❌ mobile-navbar-fix.js missing"
fi

# Restart the application if using PM2
if command -v pm2 &> /dev/null; then
    echo "🔄 Restarting PM2 processes..."
    pm2 restart all
fi

echo "✅ Mobile Navbar Fix deployment complete!"
echo ""
echo "📋 To test the fix:"
echo "1. Open the site on mobile/tablet"
echo "2. Tap the hamburger menu button"
echo "3. The dropdown should show with dark text on white background"
echo "4. If still broken, open browser console and run: debugMobileMenu()"

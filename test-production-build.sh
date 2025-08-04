#!/bin/bash

# Local Production Build Test Script
# This script tests the production build process locally to verify it works

echo "🧪 LOCAL PRODUCTION BUILD TEST"
echo "=============================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "server.js" ]; then
  echo "❌ Error: Must run from project root directory with package.json and server.js"
  exit 1
fi

echo "📂 Current directory: $(pwd)"
echo ""

# Clean up any existing production directory
if [ -d "production" ]; then
  echo "🧹 Cleaning up existing production directory..."
  rm -rf production
fi

echo "🔨 Starting local production build test..."
echo ""

# Create production directory
mkdir -p production
echo "✅ Created production directory"

# Copy essential files
echo "📦 Copying package files..."
cp package*.json production/
echo "✅ Copied package*.json files"

echo "🖥️ Copying server.js..."
cp server.js production/
echo "✅ Copied server.js"

# Copy other essential files
echo "📄 Copying other essential files..."
for file in app.js db.js config.js; do
  if [ -f "$file" ]; then
    cp "$file" production/
    echo "✅ Copied $file"
  else
    echo "⚠️ Optional file $file not found, skipping"
  fi
done

# Copy application directories
echo "📁 Copying application directories..."
for dir in public views routes middleware libs services scripts migrations utils socket; do
  if [ -d "$dir" ]; then
    cp -r "$dir" production/
    echo "✅ Copied $dir directory"
  else
    echo "⚠️ Directory $dir not found, skipping"
  fi
done

# Verify production build
echo ""
echo "🔍 Verifying production build..."

if [ ! -d "production" ]; then
  echo "❌ Production directory was not created"
  exit 1
fi

if [ ! -f "production/package.json" ]; then
  echo "❌ package.json not found in production directory"
  exit 1
fi

if [ ! -f "production/server.js" ]; then
  echo "❌ server.js not found in production directory"
  exit 1
fi

echo "✅ Production build verification successful!"
echo ""

echo "📊 Production directory contents:"
ls -la production/ | head -20
echo ""

echo "📏 File sizes:"
echo "package.json: $(wc -c < production/package.json) bytes"
echo "server.js: $(wc -c < production/server.js) bytes"
echo ""

# Test npm install in production directory
cd production
echo "📦 Testing npm install in production directory..."
if npm install --production --silent; then
  echo "✅ npm install successful"
else
  echo "❌ npm install failed"
  cd ..
  exit 1
fi

cd ..

echo ""
echo "🎉 LOCAL PRODUCTION BUILD TEST PASSED!"
echo "Your files are correctly structured for GitHub Actions deployment."
echo ""

# Cleanup
echo "🧹 Cleaning up test production directory..."
rm -rf production
echo "✅ Cleanup complete"
echo ""
echo "✅ Ready for GitHub Actions deployment!"

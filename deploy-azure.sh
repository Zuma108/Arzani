#!/bin/bash

# Prepare for Azure deployment
echo "Preparing Azure deployment package..."

# Clean the deployment directory if it exists
rm -rf ./azure-deploy
rm -f ./azure-deploy.zip

# Create a clean directory for deployment
mkdir -p ./azure-deploy

# Copy essential files - EXCLUDING node_modules
echo "Copying essential files..."
cp server.js package.json web.config .deployment .gitignore ./azure-deploy/
cp -r routes middleware services utils views config ./azure-deploy/ 2>/dev/null || :

# Copy public folder with only necessary static assets
echo "Copying static assets..."
mkdir -p ./azure-deploy/public/images
mkdir -p ./azure-deploy/public/css
mkdir -p ./azure-deploy/public/js
cp -r public/images/* ./azure-deploy/public/images/ 2>/dev/null || :
cp -r public/css/* ./azure-deploy/public/css/ 2>/dev/null || :
cp -r public/js/* ./azure-deploy/public/js/ 2>/dev/null || :

# Create uploads directory but don't copy contents
mkdir -p ./azure-deploy/public/uploads

# Replace with optimized Azure package.json
cp azure-package.json ./azure-deploy/package.json

# Set correct permissions
echo "Setting permissions..."
find ./azure-deploy -type d -exec chmod 755 {} \;
find ./azure-deploy -type f -exec chmod 644 {} \;
chmod 755 ./azure-deploy/server.js

# Create a zip file
echo "Creating deployment archive..."
cd ./azure-deploy
zip -r ../azure-deploy.zip ./* >/dev/null
cd ..

echo "Deployment package created!"
echo "Package size: $(du -h azure-deploy.zip | cut -f1)"
echo "Deploy using: az webapp deployment source config-zip --resource-group my-marketplace --name arzani --src azure-deploy.zip"

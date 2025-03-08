#!/bin/bash

# Build script for deployment
echo "Preparing deployment package..."

# Install production dependencies only
npm ci --production

# Create deployment package
zip -r deployment.zip . -x "node_modules/*" "*.git*" "*.env*" "deploy.sh"

# Add back the production node_modules
zip -r deployment.zip node_modules

echo "Deployment package created: deployment.zip"
echo "Upload this file to your EC2 instance"

# If you want to automate transfer to EC2 (uncomment and update)
# scp -i your-key.pem deployment.zip ec2-user@your-ec2-ip:~/

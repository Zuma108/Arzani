#!/usr/bin/env powershell
# deploy-to-production.ps1
# Script to deploy changes to the production server

# Configuration
$remoteUser = "your-ssh-user"  # Replace with your actual SSH username
$remoteHost = "www.arzani.co.uk"  # Replace with your actual server hostname
$remotePath = "/path/to/your/app"  # Replace with the path to your application on the server

# Files to copy (update this list as needed)
$filesToDeploy = @(
    "routes/auth.js",
    "public/js/onboarding.js",
    "views/partials/onboarding-modal.ejs",
    "public/css/onboarding.css",
    "controllers/userController.js",
    "routes/userRoutes.js",
    "migrations/add_onboarding_fields.sql"
)

# Create a temporary directory for deployment files
$tempDir = "deploy-temp"
if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Copy files to the temporary directory
foreach ($file in $filesToDeploy) {
    $dir = Split-Path -Path "$tempDir/$file" -Parent
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    Copy-Item $file "$tempDir/$file" -Force
}

# Check if we can use scp to copy files
if (Get-Command scp -ErrorAction SilentlyContinue) {
    Write-Host "Using scp to copy files..."
    foreach ($file in $filesToDeploy) {
        Write-Host "Deploying $file..."
        scp "$tempDir/$file" "${remoteUser}@${remoteHost}:${remotePath}/$file"
    }
} else {
    Write-Host "scp command not found. Please manually copy the files in $tempDir to your server."
}

# Check if we can use ssh to restart the server
if (Get-Command ssh -ErrorAction SilentlyContinue) {
    Write-Host "Restarting the application server..."
    ssh "${remoteUser}@${remoteHost}" "cd ${remotePath} && pm2 restart server.js || systemctl restart your-app-service"
} else {
    Write-Host "ssh command not found. Please manually restart your application server."
}

# Clean up
Remove-Item -Recurse -Force $tempDir

Write-Host "Deployment completed!"
Write-Host "Please verify that the changes are working correctly on the production server."

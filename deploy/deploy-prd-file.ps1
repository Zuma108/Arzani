#!/usr/bin/env powershell
# deploy-prd-file.ps1
# Quick script to deploy the PRD_200_Blog_Post_Strategy_Checklist.md file to production

# Configuration - Update these with your actual server details
$remoteUser = "ec2-user"  # Replace with your actual SSH username
$remoteHost = "www.arzani.co.uk"  # Your production server
$remotePath = "/home/ec2-user/app/current"  # Path to your application on the server

# File to deploy
$fileToDeploy = "PRD_200_Blog_Post_Strategy_Checklist.md"

# Check if the file exists locally
if (!(Test-Path $fileToDeploy)) {
    Write-Host "❌ Error: $fileToDeploy not found in current directory" -ForegroundColor Red
    exit 1
}

Write-Host "🚀 Deploying PRD file to production server..." -ForegroundColor Green

# Check if we can use scp to copy the file
if (Get-Command scp -ErrorAction SilentlyContinue) {
    Write-Host "📁 Using scp to copy $fileToDeploy..." -ForegroundColor Yellow
    
    try {
        scp $fileToDeploy "${remoteUser}@${remoteHost}:${remotePath}/"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Successfully deployed $fileToDeploy to production!" -ForegroundColor Green
            
            # Optionally restart the service if needed
            $restart = Read-Host "Do you want to restart the application service? (y/N)"
            if ($restart -eq "y" -or $restart -eq "Y") {
                Write-Host "🔄 Restarting application service..." -ForegroundColor Yellow
                ssh "${remoteUser}@${remoteHost}" "sudo systemctl restart marketplace || sudo pm2 restart all"
                Write-Host "✅ Service restart completed!" -ForegroundColor Green
            }
        } else {
            Write-Host "❌ Error: Failed to copy file (exit code: $LASTEXITCODE)" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "❌ Error during file transfer: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Error: scp command not found. Please install OpenSSH client or use WSL." -ForegroundColor Red
    Write-Host "📋 Manual command to run:" -ForegroundColor Yellow
    Write-Host "scp $fileToDeploy ${remoteUser}@${remoteHost}:${remotePath}/" -ForegroundColor Cyan
}

Write-Host "🎯 Deployment script completed!" -ForegroundColor Green

# PowerShell script for Windows deployment

Write-Host "Preparing deployment package..." -ForegroundColor Green

# Install production dependencies only
npm ci --production

# Create temp directory
$tempDir = "deploy-temp"
New-Item -ItemType Directory -Force -Path $tempDir

# Copy all files except specified ones
Get-ChildItem -Path . -Exclude node_modules,.git,.env,deploy.ps1,$tempDir | 
Copy-Item -Destination $tempDir -Recurse -Force

# Copy only production node_modules
Copy-Item -Path node_modules -Destination "$tempDir\node_modules" -Recurse -Force

# Create ZIP file
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$zipFile = "marketplace-$timestamp.zip"
Compress-Archive -Path "$tempDir\*" -DestinationPath $zipFile -Force

# Clean up
Remove-Item -Path $tempDir -Recurse -Force

Write-Host "Deployment package created: $zipFile" -ForegroundColor Green
Write-Host "Upload this file to your EC2 instance using SCP or the AWS Management Console" -ForegroundColor Yellow

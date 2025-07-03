# Run SSL Renewal Now
# This script runs the SSL renewal process immediately
# Run this script as Administrator

$ErrorActionPreference = "Stop"
$ScriptPath = "$PSScriptRoot\renew-ssl.ps1"

# Check if the script exists
if (-not (Test-Path $ScriptPath)) {
    Write-Error "SSL renewal script not found at: $ScriptPath"
    exit 1
}

Write-Host "Starting SSL certificate renewal process..."
Write-Host "This may take a few minutes..."

try {
    # Run the renewal script
    & PowerShell.exe -ExecutionPolicy Bypass -File "$ScriptPath"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SSL renewal completed successfully!"
    } else {
        Write-Error "SSL renewal failed with exit code: $LASTEXITCODE"
    }
} catch {
    Write-Error "Failed to run SSL renewal script: $_"
    exit 1
}

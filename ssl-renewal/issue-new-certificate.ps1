# Obtain New SSL Certificate
# This script gets a completely new certificate (not just renewal)
# Run this script as Administrator

$ErrorActionPreference = "Stop"

# Configuration
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ConfigPath = "$ScriptDir\certbot.ini"
$LogFile = "C:\ssl-logs\ssl-issuance.log"
$Domains = "arzani.co.uk,www.arzani.co.uk" # Update with your domains

# Create log directory if it doesn't exist
if (-not (Test-Path (Split-Path -Path $LogFile -Parent))) {
    New-Item -Path (Split-Path -Path $LogFile -Parent) -ItemType Directory -Force | Out-Null
}

# Logging function
function Write-Log {
    param (
        [string]$Level,
        [string]$Message
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    Write-Host $logMessage
    Add-Content -Path $LogFile -Value $logMessage
}

# Check prerequisites
Write-Log "INFO" "Checking prerequisites..."
$certbotPath = (Get-Command "certbot" -ErrorAction SilentlyContinue)
if ($null -eq $certbotPath) {
    Write-Log "ERROR" "certbot is not installed or not in PATH. Install it using 'winget install certbot'"
    exit 1
}

# Check if config file exists
if (-not (Test-Path $ConfigPath)) {
    Write-Log "ERROR" "Configuration file not found at: $ConfigPath"
    exit 1
}

# Begin certificate issuance
Write-Log "INFO" "Starting certificate issuance process for domains: $Domains"

$domainsParam = $Domains -split "," | ForEach-Object { "-d $_.trim()" }
$domainArgs = $domainsParam -join " "

$certbotCommand = "certbot certonly --config $ConfigPath $domainArgs"

Write-Log "INFO" "Running command: $certbotCommand"

try {
    Invoke-Expression $certbotCommand | Tee-Object -Append -FilePath $LogFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Log "INFO" "Certificate issuance completed successfully!"
        
        # Reload web server (modify for your environment)
        # For IIS
        # Start-Process "iisreset" -NoNewWindow -Wait
        
        Write-Log "INFO" "Web server reloaded successfully"
    } else {
        Write-Log "ERROR" "Certificate issuance failed with exit code: $LASTEXITCODE"
        exit 1
    }
} catch {
    Write-Log "ERROR" "Error during certificate issuance: $_"
    exit 1
}

Write-Log "INFO" "Certificate issuance process complete"

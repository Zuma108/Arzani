# Check SSL Certificate Status
# This script checks your current SSL certificate status without renewing it
# It can be run any time to see expiration dates and other details

$ErrorActionPreference = "Stop"

# Domain to check
$domain = "arzani.co.uk"

Write-Host "===== SSL Certificate Checker =====" -ForegroundColor Cyan
Write-Host "Checking SSL certificate for $domain..." -ForegroundColor Yellow
Write-Host ""

try {
    # Use .NET approach only - more compatible across systems
    Write-Host "Checking certificate..." -ForegroundColor Gray
    
    # Create a TCP client and connect to the server
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $tcpClient.Connect($domain, 443)
    
    # Create an SSL stream
    $sslStream = New-Object System.Net.Security.SslStream($tcpClient.GetStream(), $false, {param($sender, $certificate, $chain, $sslPolicyErrors) return $true})
    
    # Authenticate as client
    $sslStream.AuthenticateAsClient($domain)
    
    # Get the certificate
    $cert = $sslStream.RemoteCertificate
    
    # Display certificate details
    Write-Host "Certificate Details:" -ForegroundColor Green
    Write-Host "-------------------" -ForegroundColor Green
    Write-Host "Subject:       $($cert.Subject)"
    Write-Host "Issuer:        $($cert.Issuer)"
    Write-Host "Valid From:    $($cert.GetEffectiveDateString())"
    Write-Host "Valid To:      $($cert.GetExpirationDateString())"
    
    # Calculate days until expiry
    $expirationDate = [DateTime]::Parse($cert.GetExpirationDateString())
    $daysUntilExpiry = [Math]::Ceiling(($expirationDate - (Get-Date)).TotalDays)
    
    Write-Host "Days Until Expiry: $daysUntilExpiry" -ForegroundColor $(if ($daysUntilExpiry -lt 30) { "Red" } elseif ($daysUntilExpiry -lt 60) { "Yellow" } else { "Green" })
    
    # Clean up
    $sslStream.Close()
    $tcpClient.Close()
    
    # Provide recommendations
    Write-Host ""
    Write-Host "Recommendations:" -ForegroundColor Cyan
    if ($daysUntilExpiry -lt 15) {
        Write-Host "URGENT: Your certificate will expire very soon! Renew immediately." -ForegroundColor Red
    } elseif ($daysUntilExpiry -lt 30) {
        Write-Host "WARNING: Your certificate will expire in less than 30 days. Plan renewal soon." -ForegroundColor Yellow
    } else {
        Write-Host "Your certificate is valid for more than 30 days. No immediate action needed." -ForegroundColor Green
    }
    
} catch {
    Write-Host "Error checking certificate: $_" -ForegroundColor Red
    
    Write-Host ""
    Write-Host "Alternative checking method:" -ForegroundColor Yellow
    Write-Host "1. Open a browser and navigate to https://$domain"
    Write-Host "2. Click on the padlock icon in the address bar"
    Write-Host "3. View certificate details to check expiration date"
}

Write-Host ""
Write-Host "===== Check Complete =====" -ForegroundColor Cyan

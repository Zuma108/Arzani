# reCAPTCHA Enterprise API Test Script
# This script tests the reCAPTCHA Enterprise API endpoint

param(
    [Parameter(Mandatory=$true)]
    [string]$Token,
    
    [string]$Action = "ONBOARDING",
    
    [string]$ApiKey = $env:GOOGLE_CLOUD_API_KEY
)

if (-not $ApiKey) {
    Write-Error "Google Cloud API Key not provided. Set GOOGLE_CLOUD_API_KEY environment variable or pass -ApiKey parameter"
    exit 1
}

$projectId = "arzani-marketplace"
$siteKey = "6Lfo9NwrAAAAAPrlDclHQbWWIXpipvYksdZ3xNxi"

$requestBody = @{
    event = @{
        token = $Token
        expectedAction = $Action
        siteKey = $siteKey
    }
} | ConvertTo-Json -Depth 3

$uri = "https://recaptchaenterprise.googleapis.com/v1/projects/$projectId/assessments?key=$ApiKey"

Write-Host "Testing reCAPTCHA Enterprise API..." -ForegroundColor Yellow
Write-Host "Project ID: $projectId" -ForegroundColor Cyan
Write-Host "Site Key: $siteKey" -ForegroundColor Cyan
Write-Host "Expected Action: $Action" -ForegroundColor Cyan
Write-Host "Token: $($Token.Substring(0, [Math]::Min(20, $Token.Length)))..." -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $uri -Method POST -Body $requestBody -ContentType "application/json"
    
    Write-Host "✅ API Response Successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Verification Results:" -ForegroundColor Yellow
    Write-Host "Valid Token: $($response.tokenProperties.valid)" -ForegroundColor $(if ($response.tokenProperties.valid) { "Green" } else { "Red" })
    Write-Host "Action: $($response.tokenProperties.action)" -ForegroundColor Cyan
    Write-Host "Action Matches: $($response.tokenProperties.action -eq $Action)" -ForegroundColor $(if ($response.tokenProperties.action -eq $Action) { "Green" } else { "Red" })
    Write-Host "Risk Score: $($response.riskAnalysis.score)" -ForegroundColor Cyan
    Write-Host "Challenge: $($response.tokenProperties.challenge)" -ForegroundColor Cyan
    
    if ($response.riskAnalysis.reasons) {
        Write-Host "Risk Reasons: $($response.riskAnalysis.reasons -join ', ')" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Full Response:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 5 | Write-Host
    
} catch {
    Write-Error "❌ API Request Failed: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $errorContent = $reader.ReadToEnd()
        Write-Host "Error Details: $errorContent" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Usage Examples:" -ForegroundColor Yellow
Write-Host ".\test-recaptcha-api.ps1 -Token 'your_token_here'" -ForegroundColor Cyan
Write-Host ".\test-recaptcha-api.ps1 -Token 'your_token_here' -Action 'LOGIN'" -ForegroundColor Cyan
Write-Host ".\test-recaptcha-api.ps1 -Token 'your_token_here' -ApiKey 'your_api_key'" -ForegroundColor Cyan
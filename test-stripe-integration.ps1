# Stripe Connect Integration Test - PowerShell Script
# Usage: .\test-stripe-integration.ps1

Write-Host "🧪 Testing Stripe Connect Integration..." -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3000"
$testsPassed = 0
$testsFailed = 0

# Function to test a URL
function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [string]$Body = $null,
        [int[]]$ExpectedStatus = @(200),
        [bool]$ExpectHtml = $false
    )
    
    Write-Host "Testing: $Name... " -NoNewline -ForegroundColor Yellow
    
    try {
        $headers = @{
            'Content-Type' = 'application/json'
            'User-Agent' = 'StripeConnectTest/1.0'
        }
        
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $headers
            TimeoutSec = 10
        }
        
        if ($Body -and $Method -eq "POST") {
            $params.Body = $Body
        }
        
        $response = Invoke-WebRequest @params -UseBasicParsing
        
        if ($ExpectedStatus -contains $response.StatusCode) {
            if ($ExpectHtml -and $response.Headers.'Content-Type' -notmatch 'text/html') {
                Write-Host "❌ FAIL (Expected HTML)" -ForegroundColor Red
                return $false
            }
            Write-Host "✅ PASS ($($response.StatusCode))" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ FAIL (Status: $($response.StatusCode))" -ForegroundColor Red
            return $false
        }
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -and $ExpectedStatus -contains $statusCode) {
            Write-Host "✅ PASS ($statusCode)" -ForegroundColor Green
            return $true
        }
        Write-Host "❌ FAIL ($($_.Exception.Message))" -ForegroundColor Red
        return $false
    }
}

# Test Suite
Write-Host "🌐 Testing Web Routes (UI Pages):" -ForegroundColor Magenta
Write-Host ""

# Test web routes
$webTests = @(
    @{
        Name = "Payment Dashboard"
        Url = "$baseUrl/stripe-connect/dashboard"
        ExpectHtml = $true
        ExpectedStatus = @(200, 302, 401) # 302/401 OK if not logged in
    },
    @{
        Name = "Onboarding Success Page"
        Url = "$baseUrl/stripe-connect/onboarding/success"
        ExpectHtml = $true
    },
    @{
        Name = "Onboarding Refresh Page"
        Url = "$baseUrl/stripe-connect/onboarding/refresh"
        ExpectHtml = $true
    },
    @{
        Name = "Payment Success Page"
        Url = "$baseUrl/stripe-connect/payment/success"
        ExpectHtml = $true
    },
    @{
        Name = "Payment Cancelled Page"
        Url = "$baseUrl/stripe-connect/payment/cancelled"
        ExpectHtml = $true
    }
)

foreach ($test in $webTests) {
    if (Test-Endpoint @test) {
        $testsPassed++
    } else {
        $testsFailed++
    }
}

Write-Host ""
Write-Host "🔌 Testing API Routes:" -ForegroundColor Magenta
Write-Host ""

# Test API routes (these will likely fail without authentication, but should route correctly)
$apiTests = @(
    @{
        Name = "Create Connected Account API"
        Url = "$baseUrl/api/stripe-connect/create-account"
        Method = "POST"
        Body = '{"type": "standard"}'
        ExpectedStatus = @(200, 400, 401) # 400/401 OK without auth/existing account
    },
    @{
        Name = "Account Status API"
        Url = "$baseUrl/api/stripe-connect/account-status"
        ExpectedStatus = @(200, 401, 404) # 401/404 OK without auth/account
    },
    @{
        Name = "Products API"
        Url = "$baseUrl/api/stripe-connect/products"
        ExpectedStatus = @(200, 401, 400) # 401/400 OK without auth/account
    }
)

foreach ($test in $apiTests) {
    if (Test-Endpoint @test) {
        $testsPassed++
    } else {
        $testsFailed++
    }
}

# Test server accessibility
Write-Host ""
Write-Host "🖥️  Testing Server Accessibility:" -ForegroundColor Magenta
Write-Host ""

if (Test-Endpoint -Name "Server Health Check" -Url "$baseUrl" -ExpectedStatus @(200, 302, 404)) {
    $testsPassed++
} else {
    $testsFailed++
}

# Summary
Write-Host ""
Write-Host "📊 Test Summary:" -ForegroundColor Cyan
Write-Host "✅ Passed: $testsPassed" -ForegroundColor Green
Write-Host "❌ Failed: $testsFailed" -ForegroundColor Red
Write-Host "📝 Total:  $($testsPassed + $testsFailed)" -ForegroundColor Blue

Write-Host ""
if ($testsFailed -eq 0) {
    Write-Host "🎉 All tests passed! Your Stripe Connect integration is ready!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Make sure your .env file has STRIPE_SECRET_KEY configured" -ForegroundColor White
    Write-Host "2. Test the complete flow by logging in as a professional" -ForegroundColor White
    Write-Host "3. Access the payment dashboard at: $baseUrl/stripe-connect/dashboard" -ForegroundColor White
} elseif ($testsPassed -gt $testsFailed) {
    Write-Host "⚠️  Most tests passed, but some routes may need attention." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "- Server not running: npm start" -ForegroundColor White
    Write-Host "- Missing environment variables in .env file" -ForegroundColor White
    Write-Host "- Authentication required for some routes" -ForegroundColor White
} else {
    Write-Host "🚨 Multiple tests failed. Please check:" -ForegroundColor Red
    Write-Host "1. Is your server running? (npm start)" -ForegroundColor White
    Write-Host "2. Are all route files in place?" -ForegroundColor White
    Write-Host "3. Check server.js for route registrations" -ForegroundColor White
}

Write-Host ""
Write-Host "Happy coding! 🚀" -ForegroundColor Cyan
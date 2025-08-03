# Setup GitHub Secrets for Google Cloud Run Deployment
# This script helps you identify and set the required secrets for your repository

Write-Host "🔧 GitHub Secrets Setup Helper for Arzani Marketplace" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 Required GitHub Repository Secrets:" -ForegroundColor Yellow
Write-Host ""

Write-Host "1. DB_PASSWORD" -ForegroundColor Green
Write-Host "   Description: Password for your PostgreSQL Cloud SQL database"
Write-Host "   Example: MySecurePassword123!"
Write-Host ""

Write-Host "2. JWT_SECRET" -ForegroundColor Green
Write-Host "   Description: Secret key for JWT token signing (should be a strong random string)"
# Generate a random JWT secret using .NET crypto
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
$jwtSecret = [System.Convert]::ToBase64String($bytes)
Write-Host "   Example: $jwtSecret"
Write-Host ""

Write-Host "3. STRIPE_SECRET_KEY" -ForegroundColor Green
Write-Host "   Description: Your Stripe secret key from Stripe dashboard"
Write-Host "   Example: sk_live_... or sk_test_..."
Write-Host "   Get from: https://dashboard.stripe.com/apikeys"
Write-Host ""

Write-Host "4. OPENAI_API_KEY" -ForegroundColor Green
Write-Host "   Description: Your OpenAI API key from OpenAI platform"
Write-Host "   Example: sk-..."
Write-Host "   Get from: https://platform.openai.com/api-keys"
Write-Host ""

Write-Host "🔐 How to add these secrets to GitHub:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Go to your GitHub repository: https://github.com/zumatornado/my-marketplace-project"
Write-Host "2. Click on the 'Settings' tab"
Write-Host "3. In the left sidebar, click 'Secrets and variables' → 'Actions'"
Write-Host "4. Click 'New repository secret' for each secret above"
Write-Host "5. Enter the secret name exactly as shown above"
Write-Host "6. Enter the corresponding value"
Write-Host "7. Click 'Add secret'"
Write-Host ""

Write-Host "✅ Once all secrets are added, your GitHub Actions deployment will work!" -ForegroundColor Green
Write-Host ""

Write-Host "🧪 Test your deployment:" -ForegroundColor Yellow
Write-Host "1. Push to main branch or manually trigger the workflow"
Write-Host "2. Check the Actions tab in GitHub for deployment progress"
Write-Host "3. Your app will be available at the Google Cloud Run URL"
Write-Host ""

Write-Host "💡 Generated secure values for you:" -ForegroundColor Magenta
Write-Host ""
Write-Host "🔑 JWT_SECRET:" -ForegroundColor Green
Write-Host "   $jwtSecret"
Write-Host ""

# Generate another random string
$bytes2 = New-Object byte[] 48
[System.Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes2)
$randomSecret = [System.Convert]::ToBase64String($bytes2)
Write-Host "🔐 Another secure random string:" -ForegroundColor Green
Write-Host "   $randomSecret"
Write-Host ""

Write-Host "📚 Documentation:" -ForegroundColor Blue
Write-Host "• Google Cloud Run: https://cloud.google.com/run/docs"
Write-Host "• GitHub Actions: https://docs.github.com/en/actions"
Write-Host "• Stripe API Keys: https://stripe.com/docs/keys"
Write-Host "• OpenAI API Keys: https://platform.openai.com/docs/quickstart"

Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

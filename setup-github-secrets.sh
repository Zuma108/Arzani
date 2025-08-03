#!/bin/bash

# Setup GitHub Secrets for Google Cloud Run Deployment
# This script helps you identify and set the required secrets for your repository

echo "🔧 GitHub Secrets Setup Helper for Arzani Marketplace"
echo "=================================================="
echo ""

echo "📋 Required GitHub Repository Secrets:"
echo ""
echo "1. DB_PASSWORD"
echo "   Description: Password for your PostgreSQL Cloud SQL database"
echo "   Example: MySecurePassword123!"
echo ""

echo "2. JWT_SECRET"
echo "   Description: Secret key for JWT token signing (should be a strong random string)"
echo "   Example: $(openssl rand -base64 32 2>/dev/null || echo 'your-super-secret-jwt-key-here')"
echo ""

echo "3. STRIPE_SECRET_KEY"
echo "   Description: Your Stripe secret key from Stripe dashboard"
echo "   Example: sk_live_... or sk_test_..."
echo "   Get from: https://dashboard.stripe.com/apikeys"
echo ""

echo "4. OPENAI_API_KEY"
echo "   Description: Your OpenAI API key from OpenAI platform"
echo "   Example: sk-..."
echo "   Get from: https://platform.openai.com/api-keys"
echo ""

echo "🔐 How to add these secrets to GitHub:"
echo ""
echo "1. Go to your GitHub repository: https://github.com/zumatornado/my-marketplace-project"
echo "2. Click on the 'Settings' tab"
echo "3. In the left sidebar, click 'Secrets and variables' → 'Actions'"
echo "4. Click 'New repository secret' for each secret above"
echo "5. Enter the secret name exactly as shown above"
echo "6. Enter the corresponding value"
echo "7. Click 'Add secret'"
echo ""

echo "✅ Once all secrets are added, your GitHub Actions deployment will work!"
echo ""

echo "🧪 Test your deployment:"
echo "1. Push to main branch or manually trigger the workflow"
echo "2. Check the Actions tab in GitHub for deployment progress"
echo "3. Your app will be available at the Google Cloud Run URL"
echo ""

echo "💡 Need help generating secure values?"
echo ""
if command -v openssl &> /dev/null; then
    echo "🔑 Here's a secure JWT_SECRET for you:"
    echo "   $(openssl rand -base64 32)"
    echo ""
    echo "🔐 Here's another secure random string:"
    echo "   $(openssl rand -base64 48)"
    echo ""
else
    echo "Install openssl to generate secure random keys, or use an online generator."
fi

echo "📚 Documentation:"
echo "• Google Cloud Run: https://cloud.google.com/run/docs"
echo "• GitHub Actions: https://docs.github.com/en/actions"
echo "• Stripe API Keys: https://stripe.com/docs/keys"
echo "• OpenAI API Keys: https://platform.openai.com/docs/quickstart"

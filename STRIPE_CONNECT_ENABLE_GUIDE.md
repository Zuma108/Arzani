# How to Enable Stripe Connect - Step by Step Guide

## 🚨 URGENT: Enable Stripe Connect First

The error you're seeing indicates that Stripe Connect is not enabled on your Stripe account. Here's exactly what you need to do:

### Step 1: Access Stripe Dashboard
1. Go to https://dashboard.stripe.com
2. Make sure you're in **Test mode** (toggle in top left)
3. Look for "Connect" in the left sidebar menu

### Step 2: Enable Connect
1. Click on "Connect" in the sidebar
2. If you see "Get started with Connect" - click it
3. If you see "Enable Connect" - click it

### Step 3: Complete Connect Onboarding
You'll need to provide:
- **Business Information**: Your marketplace name, description
- **Platform Details**: What type of marketplace you're building
- **Terms of Service**: Agree to Stripe Connect terms
- **Branding**: Upload logo (optional but recommended)

### Step 4: Configure Connect Settings
Once enabled, you can configure:
- **Account types**: Standard accounts (already optimal for your setup)
- **Application fees**: Already configured at 5% in your code
- **Onboarding requirements**: Country restrictions, business types, etc.

### Step 5: Update Your Integration (if needed)
Your current integration should work once Connect is enabled, but you may want to:
- Set your platform's branding in Connect settings
- Configure webhook endpoints for production
- Review payout settings

## 🔍 What to Look For

### Before Enabling Connect:
- "Connect" menu item might show "Learn more" or be grayed out
- Clicking might show promotional material about Connect

### After Enabling Connect:
- "Connect" menu will show active options like:
  - Accounts
  - Transfers  
  - Application fees
  - Settings

## 🚀 Testing After Setup

Once you've enabled Connect, test your integration:

```powershell
# Test the Stripe Connect integration
.\test-stripe-integration.ps1
```

Or test a specific endpoint:
```powershell
# Test account creation (should work after enabling Connect)
Invoke-RestMethod -Uri "http://localhost:5000/api/stripe-connect/create-account" -Method POST -Headers @{"Authorization"="Bearer YOUR_JWT_TOKEN"; "Content-Type"="application/json"} -Body '{"type":"standard"}'
```

## 📝 Common Issues After Enabling

1. **Still getting the error**: Clear browser cache and wait 5-10 minutes
2. **Different error about capabilities**: Normal for new Connect accounts, will resolve as you onboard test accounts
3. **Webhook errors**: Set up webhook endpoints in production

## 🎯 Next Steps After Enabling

1. ✅ Enable Stripe Connect in dashboard
2. ✅ Test account creation API
3. ✅ Complete professional onboarding flow  
4. ✅ Test full payment flow
5. ✅ Set up webhooks for production

Your integration code is correctly implemented - you just need to enable the Connect feature in your Stripe account!
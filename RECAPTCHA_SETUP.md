# reCAPTCHA v3 Setup Instructions

The onboarding flow currently has a fallback mechanism for reCAPTCHA verification, but to get full functionality, you need to set up proper Google reCAPTCHA v3 keys.

## Current Status
- ❌ Site Key: `6LdxYOQqAAAAAKL2G7RUKk8HoWK3zCJDsOQqUQ5I` (Invalid/Test key)
- ❌ Secret Key: `6LdxYOQqAAAAAJWNZOBwHPqUMJQHB8LGHp8jQoQ8` (Invalid/Test key)
- ✅ Fallback: Manual checkbox verification works as backup

## How to Fix

### 1. Create Google reCAPTCHA v3 Keys
1. Go to [Google reCAPTCHA Console](https://www.google.com/recaptcha/admin)
2. Click "Create" or "+"
3. Fill in the form:
   - **Label**: "Arzani Marketplace"
   - **reCAPTCHA type**: Select "reCAPTCHA v3"
   - **Domains**: Add your domains:
     - `localhost` (for development)
     - `your-production-domain.com`
   - Accept the Terms of Service
4. Click "Submit"

### 2. Update Environment Variables
Replace the keys in your `.env` file:

```env
# reCAPTCHA Configuration
RECAPTCHA_SITE_KEY=your_new_site_key_here
RECAPTCHA_SECRET_KEY=your_new_secret_key_here
```

### 3. Test the Integration
1. Restart your server: `npm start`
2. Go to the onboarding flow step 8
3. The reCAPTCHA should now load properly without errors

## Current Fallback Behavior
Until you set up proper keys, the system will:
- ✅ Allow manual checkbox verification
- ✅ Continue onboarding without blocking users
- ✅ Log verification attempts for debugging
- ⚠️ Show orange warning message for manual verification

## Features Implemented
- **Responsive Design**: Works on all device sizes
- **Graceful Degradation**: Falls back to manual verification
- **Error Handling**: Catches and handles API errors
- **Custom Logo**: Uses `/figma design exports/icons/recaptcha.png`
- **Accessibility**: Proper ARIA labels and keyboard navigation
- **Mobile Optimized**: Touch-friendly interface

## Security Notes
- The fallback manual verification is logged but not as secure as reCAPTCHA v3
- Set up proper keys as soon as possible for production use
- The current implementation prevents bot abuse through rate limiting in backend
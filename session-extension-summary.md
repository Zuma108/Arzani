# Authentication Session Extension Summary

## Overview
Updated the authentication system to keep users signed in for 14 days instead of the previous short duration (4 hours for tokens, 7 days for refresh tokens).

## Changes Made

### 1. Token Expiry Constants Updated

#### `server.js` (Lines 572-573)
- Changed `TOKEN_EXPIRY` from `'4h'` to `'14d'`
- Changed `REFRESH_TOKEN_EXPIRY` from `'7d'` to `'30d'`

#### `middleware/auth.js` (Lines 18-19)
- Changed `TOKEN_EXPIRY` default from `'24h'` to `'14d'`
- Changed `REFRESH_TOKEN_EXPIRY` default from `'7d'` to `'30d'`

#### `auth/auth.js` (Lines 15-16)
- Changed `TOKEN_EXPIRY` default from `'12h'` to `'14d'`
- Changed `REFRESH_TOKEN_EXPIRY` default from `'7d'` to `'30d'`

#### `utils/auth-unified.js` (Lines 15-16)
- Changed `TOKEN_EXPIRY` default from `'4h'` to `'14d'`
- Changed `REFRESH_TOKEN_EXPIRY` default from `'7d'` to `'30d'`

### 2. Cookie Max-Age Settings Updated

#### `server.js`
- **Line 2255**: Refresh token cookie max-age: `7 days` → `30 days`
- **Line 2299**: Refresh token cookie max-age: `7 days` → `30 days`
- **Line 2816**: Access token cookie max-age: `4 hours` → `14 days`
- **Line 551**: Session cookie max-age: `24 hours` → `14 days`
- **Line 3013**: Session cookie max-age: `24 hours` → `14 days`

#### `middleware/auth.js`
- **Line 274**: Access token cookie max-age: `4 hours` → `14 days`

#### `routes/api/auth.js`
- **Line 57**: Refresh token cookie max-age: `7 days` → `30 days`
- **Line 64**: Access token cookie max-age: `4 hours` → `14 days`

#### `routes/authRoutes.js`
- **Line 48**: Access token cookie max-age: `4 hours` → `14 days`
- **Line 57**: Refresh token cookie max-age: `7 days` → `30 days`
- **Line 141**: Access token cookie max-age: `4 hours` → `14 days`
- **Line 149**: Refresh token cookie max-age: `7 days` → `30 days`
- **Line 263**: Access token cookie max-age: `4 hours` → `14 days`
- **Line 271**: Refresh token cookie max-age: `7 days` → `30 days`
- **Line 508**: Access token cookie max-age: `4 hours` → `14 days`
- **Line 516**: Refresh token cookie max-age: `7 days` → `30 days`

### 3. Client-Side JavaScript Updates

#### `public/js/login2-handler.js`
- **Line 157**: Token expiry fallback: `4 hours` → `14 days`
- **Line 520**: Token expiry fallback: `4 hours` → `14 days`

### 4. Environment Variables Updated

#### `.env`
- Added `TOKEN_EXPIRY=14d`
- Added `REFRESH_TOKEN_EXPIRY=30d`

### 5. Login Redirect Fix

#### `views/login2.ejs`
- Added `<meta name="login-return-to">` tag to pass returnTo parameter to JavaScript

#### `public/js/login2-handler.js`
- Updated redirect logic to use meta tag value instead of hardcoded `/marketplace2`
- Now properly redirects `/arzani-x` users back to `/arzani-x`

#### `middleware/auth.js`
- Updated `requireAuth` function to check for `returnTo` parameter when redirecting already-authenticated users
- Updated `sanitizeRedirectUrl` function to default to `/arzani-x` if URL contains `arzani-x`

## Security Considerations

1. **Refresh Token Security**: Refresh tokens are HTTP-only cookies with 30-day expiry, providing secure long-term authentication
2. **Access Token Rotation**: Access tokens still rotate via the refresh mechanism
3. **Session Security**: Session cookies are also extended to 14 days to maintain consistency
4. **Secure Cookie Settings**: All cookies maintain secure settings (httpOnly, secure in production, sameSite)

## Benefits

1. **Better User Experience**: Users stay logged in for 14 days without having to re-authenticate
2. **Consistent Redirect Behavior**: Users accessing `/arzani-x` are properly redirected back to `/arzani-x` after login
3. **Fallback Safety**: If no returnTo parameter is provided, intelligent defaults are used
4. **Multiple Auth Paths**: Updates work across all authentication routes (direct login, OAuth, token refresh)

## Testing

To test the changes:
1. Log in through `/arzani-x` route and verify redirect back to `/arzani-x`
2. Check that cookies are set with 14-day expiry for access tokens
3. Verify that refresh tokens have 30-day expiry
4. Confirm that sessions persist across browser restarts for up to 14 days

## Implementation Date
December 23, 2025

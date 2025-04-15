# Authentication System Documentation

## Overview
This document describes the authentication system implemented in the marketplace application. The system is designed to provide a consistent, reliable authentication experience across the application while preventing common issues like redirect loops and inconsistent authentication state.

## Architecture

### Core Components
1. **Client-side Authentication (`public/js/auth.js`)**
   - Manages client-side token storage, validation, and refresh
   - Prevents redirect loops with history tracking
   - Ensures consistent token storage across localStorage, cookies, and sessionStorage
   - Provides pre-navigation checks to handle already-authenticated users

2. **Server-side Authentication (`middleware/auth.js`)**
   - Provides middleware for protecting routes
   - Extracts and validates JWT tokens
   - Maintains session state consistency
   - Sanitizes redirect URLs to prevent loops

3. **Unified Authentication Utility (`utils/auth-unified.js`)**
   - Single source of truth for authentication logic
   - Standardized functions for auth verification
   - Consolidated token generation and validation

### Authentication Flow

1. **Login Process**
   - User submits credentials to `/auth/login` or `/api/auth/login`
   - Server validates credentials and generates JWT token
   - Token is stored in localStorage, cookies, and session for consistent access
   - User is redirected to intended destination or default page

2. **Token Verification**
   - Protected routes use the `authMiddleware` to verify authentication
   - Token is extracted from multiple sources (header, cookie, session)
   - Token is validated against the JWT secret
   - User information is attached to the request object for use in routes

3. **Token Refresh**
   - When token expires, refresh is attempted before redirecting to login
   - Refresh token is used to obtain a new access token
   - All storage mechanisms are updated with the new token

4. **Logout Process**
   - All token storage locations are cleared (localStorage, cookies, session)
   - Server invalidates the refresh token
   - User is redirected to login page

### Redirect Protection
- History tracking mechanism to detect circular redirects
- Sanitization of returnTo URLs to prevent redirect loops
- Pre-navigation checks to prevent authenticated users from accessing auth pages
- Detection and handling of nested returnTo parameters

## Best Practices

1. **Use the unified authentication utility**
   - Always use `verifyAuthentication()` from `utils/auth-unified.js` for auth checks
   - Avoid creating custom authentication logic in routes

2. **Protect routes properly**
   - For protected routes, use `authMiddleware({ required: true })`
   - For admin routes, use `authMiddleware({ required: true, adminRequired: true })`
   - For public routes that need user info when available, use `authMiddleware({ required: false })`

3. **Managing authentication state**
   - Server-side: Use `req.user` object added by auth middleware
   - Client-side: Use the `auth` object from `public/js/auth.js`
   - Templates: Use `res.locals.user` and `res.locals.isAuthenticated`

4. **Debugging authentication issues**
   - Check authentication logs in the console
   - Use the `/api/auth/debug` endpoint for token information
   - Check browser storage (localStorage, cookies) for token consistency

## Common Issues and Solutions

1. **Redirect Loop**
   - Issue: User is continuously redirected between pages
   - Solution: Check the `sanitizeRedirectUrl` function and ensure auth pages redirect authenticated users

2. **Token Inconsistency**
   - Issue: User appears logged in on some pages but not others
   - Solution: Use `syncTokenAcrossStorage()` to ensure consistent token storage

3. **API Authentication Failures**
   - Issue: API calls fail with 401 despite user being logged in
   - Solution: Ensure fetch requests include Authorization header with token

4. **Session Persistence Issues**
   - Issue: User session not maintained across requests
   - Solution: Check session configuration and ensure token is stored properly
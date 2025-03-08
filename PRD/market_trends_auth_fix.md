# PRD: Market Trends Authentication Fix

## Overview
Market Trends authentication is currently failing. The problem appears to be due to inconsistent usage of the token both on the client side and in the authentication middleware.

## Problem Statement
- Inconsistent token key usage: One part of the code is using `localStorage.getItem('token')` while another is using `localStorage.getItem('authToken')`.
- As a result, the API endpoint (/trends) may not receive the proper `Authorization` header to allow users to remain authenticated.

## Proposed Solution
1. **Unify Token Storage Key:** Decide on a single key (e.g. `token`) and update all frontend code to use it.
2. **Ensure Correct Header Population:** Confirm that the client sends the token in the `Authorization` header with the prefix `Bearer `.
3. **Review marketAuth Middleware:** Validate that the middleware in `/auth/market.js` correctly extracts, verifies, and attaches user data.
4. **Testing & Validation:** 
    - Verify that with a valid token the Market Trends page loads data.
    - Verify that without a token, the user is redirected to the login page.
    - Verify error handling is clear for expired or invalid tokens.

## Acceptance Criteria
- The Market Trends view loads without errors when a valid token is present.
- The token value in localStorage is consistently named and sent with the correct header format.
- Invalid or missing tokens will reliably redirect the user to `/login` with a proper error message.
- API endpoints return proper error responses (e.g. 401 for unauthorized access).

## Impacted Files
- **Client-side scripts:** Market Trends page view (market_trends.ejs) and its JavaScript (market_trends.js).
- **Backend middleware:** Authentication middleware in `/auth/market.js`.
- **General token management:** Ensure consistency in token saving/retrieval after login.

## Next Steps
- Implement the changes to unify the token key.
- Update all references in the client code.
- Test the authentication flow end-to-end.
- Deploy and monitor for any authentication issues.


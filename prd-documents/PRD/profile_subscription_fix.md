# PRD: Fix for Profile Subscription Endpoint

## Overview
The profile page is failing to load subscription data because a GET request to `/api/profile/subscription` returns 404 results.

## Problem Statement
- GET request to `/api/profile/subscription` in `profile.js` results in a 404 (Not Found).
- The subscription endpoint is either missing or misconfigured in the profile routes.

## Proposed Solution
1. Add (or fix) the `/subscription` endpoint under the profile routes.
2. Ensure the endpoint returns correctly formatted JSON data for subscription info.
3. Update `profile.js` to correctly handle and display subscription data.

## Acceptance Criteria
- A GET request to `/api/profile/subscription` returns a 200 response with JSON data containing subscription information.
- The profile page no longer shows the "Failed to fetch profile data" error.
- Proper error handling is implemented for unexpected cases.

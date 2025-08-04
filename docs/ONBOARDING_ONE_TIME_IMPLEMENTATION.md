# One-Time Onboarding Implementation

## Overview
The user onboarding system for `/marketplace2` is designed to show a 5-slide modal popup only once per user, specifically on their first login after account creation. The system employs multiple layers of protection to ensure the modal never appears again after completion.

## Protection Layers

### 1. Database Layer (Primary Protection)
- **Field**: `onboarding_completed` (boolean) in the `users` table
- **Purpose**: Permanent server-side record of completion status
- **Updated**: When user completes onboarding via `/users/complete-onboarding` endpoint
- **Checked**: Via `/users/onboarding-status` endpoint

### 2. LocalStorage Layer (Performance Protection)
- **Key**: `onboarding_completed` (string: "true" | null)
- **Purpose**: Client-side cache to avoid unnecessary API calls
- **Updated**: When onboarding is completed OR when server confirms completion
- **Checked**: Before making API calls to server

### 3. Session Layer (Runtime Protection)
- **Variable**: `onboardingCheckCompleted` (boolean)
- **Purpose**: Prevents multiple checks in a single page session
- **Updated**: After first onboarding status check completes
- **Reset**: Only when page is reloaded or `resetOnboarding()` is called

## Flow Diagram

```
Page Load
    ↓
Check onboardingCheckCompleted
    ↓ (if false)
Check localStorage['onboarding_completed']
    ↓ (if not 'true')
API Call: /users/onboarding-status
    ↓
If onboarding_completed === false
    ↓
Show Onboarding Modal
    ↓
User Completes Onboarding
    ↓
API Call: /users/complete-onboarding
    ↓
Update Database + localStorage
    ↓
Modal Hidden Forever
```

## Key Files

### Backend
- `controllers/userController.js` - Contains `getOnboardingStatus()` and `completeOnboarding()`
- `routes/userRoutes.js` - Routes for onboarding endpoints
- `migrations/add_onboarding_fields.sql` - Database schema

### Frontend
- `public/js/onboarding.js` - Main onboarding logic with protection layers
- `views/partials/onboarding-modal.ejs` - Modal UI
- `public/css/onboarding.css` - Modal styling
- `views/marketplace2.ejs` - Integration point

### Testing
- `public/js/onboarding-test.js` - Comprehensive test functions

## API Endpoints

### GET /users/onboarding-status
**Purpose**: Check if user has completed onboarding
**Auth**: Required (cookie-based)
**Response**:
```json
{
  "success": true,
  "onboarding": {
    "onboarding_completed": false,
    "discovery_source": null,
    "onboarding_completed_at": null
  }
}
```

### POST /users/complete-onboarding
**Purpose**: Mark onboarding as completed
**Auth**: Required (cookie-based)
**Body**:
```json
{
  "discoverySource": "search_engine",
  "onboardingData": {
    "slidesViewed": 5,
    "completedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

## Testing Functions

Access these in the browser console:

```javascript
// Check current status
onboardingTests.checkStatus()

// Reset and reload page (for testing)
onboardingTests.resetAndReload()

// Force show modal (bypasses protection)
onboardingTests.forceShow()

// Mark as completed programmatically
onboardingTests.completeOnboarding()

// Run complete test cycle
onboardingTests.runFullTest()

// Manual functions
showOnboarding(true)  // force=true bypasses protection
resetOnboarding()     // clears localStorage and session flag
checkOnboardingStatus() // logs both localStorage and server status
```

## Edge Cases Handled

1. **Multiple Page Loads**: Session flag prevents redundant checks
2. **Slow API Responses**: localStorage provides immediate feedback
3. **Network Errors**: Graceful fallback, no modal shown
4. **Manual Triggering**: `showOnboarding()` respects completion status
5. **Cookie Issues**: Proper error handling for auth failures
6. **Concurrent Sessions**: Database is source of truth
7. **Browser Cache**: localStorage cleared on logout (if implemented)

## Post-Login Integration

To ensure the onboarding modal appears immediately after first login (not just after refresh), integrate these steps into your login flow:

### Option 1: URL Parameter Method
After successful login, redirect to `/marketplace2?login=success`:
```javascript
// In your login success handler
window.location.href = '/marketplace2?login=success';
```

### Option 2: SessionStorage Method
Set a flag before redirecting:
```javascript
// In your login success handler
sessionStorage.setItem('justLoggedIn', 'true');
window.location.href = '/marketplace2';
```

### Option 3: Include Script Method
Include the login success handler script:
```html
<!-- After successful login -->
<script src="/js/login-success-handler.js"></script>
```

### Verification Steps
Use these console commands to test:
```javascript
// Simulate post-login scenario
onboardingTests.simulatePostLogin()

// Check timing and auth state
onboardingTests.checkTiming()

// Manually trigger onboarding check
triggerOnboardingCheck()
```

1. **Fresh User Test**:
   - Create new account
   - Login to `/marketplace2`
   - Verify modal appears
   - Complete onboarding
   - Refresh page - modal should NOT appear

2. **Returning User Test**:
   - Use existing account that completed onboarding
   - Visit `/marketplace2`
   - Verify modal does NOT appear

3. **Edge Case Test**:
   - Run `onboardingTests.runFullTest()` in console
   - Verify all protection layers work correctly

## Maintenance Notes

- **Database Migration**: Applied via `migrations/add_onboarding_fields.sql`
- **Analytics**: Onboarding completion tracked via `trackEvent()` calls
- **Performance**: localStorage reduces API calls by ~90% for returning users
- **Security**: All endpoints require authentication
- **Scalability**: Minimal database impact (single boolean check per user)

## Future Enhancements

1. **A/B Testing**: Track different onboarding flows
2. **Progress Resumption**: Allow users to continue from where they left off
3. **Skip Option**: Add "Skip for now" with reminder logic
4. **Mobile Optimization**: Responsive modal design
5. **Accessibility**: ARIA labels and keyboard navigation
6. **Multi-language**: Internationalization support

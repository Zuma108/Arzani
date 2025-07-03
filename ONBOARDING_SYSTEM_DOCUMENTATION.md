# User Onboarding System Documentation

## Overview
The onboarding system provides a guided 5-slide introduction for new users when they first sign in to the marketplace. It tracks how users discovered the platform and ensures the onboarding only appears once per user.

## Features
- **5-Slide Onboarding Flow**:
  1. Discovery Source - How they found the platform (Google, Reddit, ChatGPT, etc.)
  2. Marketplace Explanation - What the platform is about
  3. Navigation Guide - How to use navigation and profile features
  4. AI Assistant Introduction - Introduction to the AI helper
  5. Tools and Filters - How to use marketplace tools

- **Smart Triggering**: Only shows for logged-in users who haven't completed onboarding
- **Progress Tracking**: Visual progress bar and step indicators
- **Data Collection**: Stores discovery source and completion timestamp
- **Responsive Design**: Works on desktop and mobile devices

## Database Schema

### New Columns in `users` table:
```sql
-- Tracks whether user completed onboarding
onboarding_completed BOOLEAN DEFAULT FALSE

-- How user discovered the platform (google, reddit, chatgpt, etc.)
discovery_source VARCHAR(100)

-- When user completed onboarding
onboarding_completed_at TIMESTAMP

-- Additional onboarding data as JSON
onboarding_data JSONB
```

### Indexes:
- `idx_users_onboarding_completed` - For filtering users by onboarding status
- `idx_users_discovery_source` - For analytics on discovery channels
- `idx_users_onboarding_completed_at` - For time-based analytics

## API Endpoints

### GET /users/onboarding-status
Returns the current user's onboarding status.

**Authentication**: Required (JWT token)

**Response**:
```json
{
  "onboarding": {
    "onboarding_completed": false,
    "discovery_source": null,
    "onboarding_completed_at": null
  }
}
```

### POST /users/complete-onboarding
Marks the user's onboarding as complete and saves their discovery source.

**Authentication**: Required (JWT token)

**Request Body**:
```json
{
  "discoverySource": "google",
  "onboardingData": {
    "completedSlides": 5,
    "timeSpent": 120
  }
}
```

**Response**:
```json
{
  "message": "Onboarding completed successfully"
}
```

## File Structure

```
├── migrations/
│   └── add_onboarding_fields.sql          # Database migration
├── views/
│   ├── marketplace2.ejs                   # Main page with onboarding integration
│   └── partials/
│       └── onboarding-modal.ejs          # Onboarding modal component
├── public/
│   ├── css/
│   │   └── onboarding.css                # Onboarding styles
│   └── js/
│       └── onboarding.js                 # Onboarding JavaScript logic
├── controllers/
│   └── userController.js                 # API endpoints (completeOnboarding, getOnboardingStatus)
├── routes/
│   └── userRoutes.js                     # Route definitions
└── test-onboarding.js                    # Test script
```

## Implementation Details

### Frontend Components

#### 1. Modal Structure (`onboarding-modal.ejs`)
- Bootstrap modal with custom styling
- 5 slides with smooth transitions
- Progress indicator with percentage
- Navigation buttons (Previous/Next/Complete)
- Discovery source selection with radio buttons

#### 2. Styling (`onboarding.css`)
- Custom modal design with gradient header
- Smooth slide transitions
- Responsive grid layout for discovery options
- Interactive button states and hover effects

#### 3. JavaScript Logic (`onboarding.js`)
- `OnboardingModal` class for managing the flow
- Slide navigation with validation
- API integration for status checking and completion
- Analytics tracking for each slide view
- Form validation and error handling

### Backend Components

#### 1. Database Migration
The migration safely adds onboarding fields to the existing users table with proper checks to prevent duplicate columns.

#### 2. Controller Methods
- `getOnboardingStatus`: Returns user's onboarding state
- `completeOnboarding`: Updates user record with completion data

#### 3. Authentication
All onboarding endpoints require JWT authentication to ensure only logged-in users can access them.

## Usage

### 1. Run Database Migration
Execute the SQL migration in pgAdmin:
```sql
-- Run migrations/add_onboarding_fields.sql
```

### 2. Include in Templates
The onboarding system is already integrated into `marketplace2.ejs`:
```html
<!-- CSS -->
<link rel="stylesheet" href="/css/onboarding.css">

<!-- Modal Component -->
<%- include('partials/onboarding-modal') %>

<!-- JavaScript -->
<script src="/js/onboarding.js"></script>

<!-- Initialization Script -->
<script>
  // Automatically checks user status and shows modal if needed
</script>
```

### 3. Automatic Triggering
The onboarding modal automatically:
1. Checks if user is logged in
2. Fetches onboarding status from API
3. Shows modal if onboarding not completed
4. Saves completion status when user finishes

## Testing

### Test Script
Run the test script to verify everything works:
```bash
node test-onboarding.js
```

This will test:
- Database schema and indexes
- Data operations (read/write)
- API endpoint availability

### Manual Testing
1. Create a new user account
2. Log in to /marketplace2
3. Verify onboarding modal appears
4. Complete all 5 slides
5. Refresh page - modal should not appear again
6. Check database for completion record

## Analytics & Insights

The system collects valuable data:
- **Discovery Sources**: How users find the platform
- **Completion Rates**: Percentage of users who complete onboarding
- **Drop-off Points**: Which slides users exit on
- **Time to Complete**: How long the onboarding process takes

## Customization

### Adding New Slides
1. Add slide HTML to `onboarding-modal.ejs`
2. Update `totalSlides` in `onboarding.js`
3. Add navigation logic if needed
4. Update progress calculations

### Changing Discovery Sources
Modify the radio button options in slide 1 of the modal and update the validation logic.

### Styling Changes
All visual customization can be done in `onboarding.css` without affecting functionality.

## Security Considerations

- ✅ Authentication required for all API endpoints
- ✅ Input validation and sanitization
- ✅ SQL injection protection with parameterized queries
- ✅ XSS protection with proper data escaping
- ✅ No sensitive data exposed to frontend

## Performance

- Modal loads on-demand only for users who need it
- Database queries use indexes for fast lookups
- Frontend JavaScript is optimized and cached
- CSS animations use hardware acceleration

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Bootstrap 5 compatible
- Responsive design for mobile devices
- Graceful fallbacks for older browsers

## Future Enhancements

1. **A/B Testing**: Different onboarding flows for different user segments
2. **Video Integration**: Add introductory videos to slides
3. **Progress Saving**: Allow users to resume onboarding later
4. **Multilingual Support**: Translate onboarding content
5. **Advanced Analytics**: Heat mapping and user behavior tracking

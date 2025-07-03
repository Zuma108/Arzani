# Authentication Analytics Implementation

This README explains the implementation of user authentication analytics with 6-digit OTP verification and outlines how to set up the required database table.

## Overview

The analytics system tracks:
- User signup events
- Verification attempts (both successes and failures)
- Verification times and success rates
- Device and source information

Data is stored in a dedicated `analytics_events` table and exposed through useful views for reporting.

## Database Setup

1. Execute the `analytics_events_table.sql` file in pgAdmin or your preferred PostgreSQL client:
   ```sql
   -- Run this in your PostgreSQL database
   \i analytics_events_table.sql
   ```

2. This will create:
   - The `analytics_events` table with appropriate indexes
   - Two views: `v_verification_analytics` and `v_verification_by_device`
   - A function `get_weekly_analytics_summary()` for generating reports

## Table Structure

The `analytics_events` table includes:
- Basic event information (type, user, timestamp)
- Verification-specific data (code used, attempt count, success status)
- Delivery tracking (email sent/delivered)
- Context data (device type, source, time to verify)

## Usage in Code

The analytics events are captured in several places:

1. **During signup**:
   ```javascript
   // Record analytics for new user signup
   analyticsTracker.recordEvent('signup', userId, {
     source: req.body.source || 'website',
     device_type: getDeviceType(req.headers['user-agent']),
     ip_address: req.ip
   });
   ```

2. **During verification attempts**:
   ```javascript
   // Record analytics for verification success/failure
   analyticsTracker.recordEvent(
     success ? 'verification_success' : 'verification_failure', 
     userId, 
     {
       verification_code: hashOrMaskCode(code), // For security
       attempt_count: attemptCount,
       success: success,
       time_to_verify: timeTaken,
       device_type: getDeviceType(req.headers['user-agent']),
       source: req.body.source || 'website'
     }
   );
   ```

## Analytics Reports

Weekly reports are automatically generated and emailed to hello@arzani.co.uk using the scheduled task in `scheduled-tasks.js`.

You can also generate a report manually:
```bash
npm run analytics:report
```

## Admin API Endpoints

The following admin-only API endpoints are available:

- `GET /api/analytics/verification` - View verification analytics
- `GET /api/analytics/report?start=YYYY-MM-DD&end=YYYY-MM-DD` - Generate a custom date range report
- `POST /api/analytics/send-report` - Manually trigger a report email

## Security Considerations

- Verification codes are either partially masked or hashed before storing in the database
- Access to analytics endpoints is restricted to admin users only
- All analytics operations are non-blocking to preserve user experience

# Buyer Database Structure Analysis - Arzani Marketplace

## Executive Summary

This document provides a comprehensive analysis of the buyer-related database structure in the Arzani Marketplace PostgreSQL database. The system implements a sophisticated buyer ecosystem with user management, behavioral tracking, verification systems, and business interaction capabilities.

## Database Overview

- **Total Users**: 11
- **Verified Professionals**: 1 (accountant - approved)
- **Paid Buyers**: 0 (all on free plans)
- **Auth Providers**: Email (10), Google (1)
- **Completed Onboarding**: 3 users

---

## Core Buyer Tables

### 1. `users` - Main User Entity
**Primary buyer table containing core user information**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | integer | NO | auto-increment | Primary key |
| `username` | varchar | NO | - | User display name |
| `email` | varchar | NO | - | Unique email address |
| `created_at` | timestamp | YES | CURRENT_TIMESTAMP | Account creation date |
| `updated_at` | timestamp | YES | now() | Last update timestamp |
| `last_login` | timestamp | YES | null | Last login time |
| `last_active` | timestamp | YES | null | Last activity timestamp |

#### Authentication & OAuth Integration
| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `google_id` | varchar | null | Google OAuth identifier |
| `microsoft_id` | varchar | null | Microsoft OAuth identifier |
| `linkedin_id` | varchar | null | LinkedIn OAuth identifier |
| `auth_provider` | varchar | 'email' | Authentication method |
| `google_tokens` | jsonb | null | Stored OAuth tokens |

#### Buyer-Specific Features
| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `buyer_plan` | varchar | 'free' | Subscription tier (free/premium/enterprise) |
| `buyer_plan_start` | timestamp | null | Plan activation date |
| `buyer_plan_end` | timestamp | null | Plan expiration date |
| `early_access_enabled` | boolean | false | Beta feature access |
| `ai_advisor_enabled` | boolean | false | AI advisor feature |
| `premium_alerts_enabled` | boolean | false | Premium alert notifications |
| `due_diligence_reports_used` | integer | 0 | DD reports consumed |
| `meetings_booked` | integer | 0 | Total meetings scheduled |

#### Role & Verification System
| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `role` | varchar | 'user' | System role (user/admin) |
| `primary_role` | varchar | null | Business role (buyer/seller/advisor) |
| `roles` | jsonb | null | Multiple role assignments |
| `is_verified_professional` | boolean | false | Professional verification status |
| `professional_type` | varchar | null | Type of professional (accountant/lawyer/etc) |
| `professional_verification_date` | timestamp | null | Verification completion date |

#### Onboarding & Discovery
| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `onboarding_completed` | boolean | false | Onboarding flow completion |
| `onboarding_completed_at` | timestamp | null | Onboarding completion date |
| `onboarding_data` | jsonb | null | Onboarding responses |
| `discovery_source` | varchar | null | How user found platform |
| `has_questionnaire` | boolean | false | Questionnaire completion flag |
| `questionnaire_id` | integer | null | Linked questionnaire record |
| `questionnaire_linked_at` | timestamp | null | Questionnaire link date |

#### Payment & Subscription
| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `stripe_customer_id` | varchar | null | Stripe customer identifier |
| `subscription_type` | varchar | 'free' | General subscription type |
| `subscription_end` | timestamp | null | Subscription expiration |
| `api_calls_count` | integer | 0 | API usage counter |

**Indexes**: 
- Primary key on `id`
- Unique on `email`, `stripe_customer_id`
- Indexes on OAuth IDs, role fields, timestamps
- Performance indexes on common query fields

---

### 2. `users_auth` - Authentication Security
**Secure authentication data separate from main user table**

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `user_id` | integer | NO | Foreign key to users.id |
| `password_hash` | varchar | NO | Encrypted password |
| `verified` | boolean | YES (default: false) | Email verification status |
| `verification_token` | varchar | YES | Email verification token |
| `verification_expires` | timestamp | YES | Token expiration |

**Security Features**:
- Separate table for sensitive auth data
- Primary key on `user_id` (1:1 relationship)
- Email verification workflow

---

### 3. `buyer_activity` - Activity Tracking
**Comprehensive buyer behavior and interaction logging**

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | integer | NO | Primary key |
| `user_id` | integer | YES | Foreign key to users.id |
| `activity_type` | varchar | NO | Type of activity |
| `business_id` | integer | YES | Related business (if applicable) |
| `metadata` | jsonb | YES | Activity-specific data |
| `created_at` | timestamp | YES | Activity timestamp |

**Foreign Keys**:
- `user_id` → `users.id`
- `business_id` → `businesses.id`

**Indexes**: 
- Compound index on (`user_id`, `created_at`)

---

### 4. `buyer_alerts` - Alert Management System
**Customizable buyer alert preferences and notifications**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | integer | NO | auto-increment | Primary key |
| `user_id` | integer | YES | - | Foreign key to users.id |
| `alert_name` | varchar | NO | - | User-defined alert name |
| `criteria` | jsonb | NO | - | Search criteria for matching |
| `is_active` | boolean | YES | true | Alert enabled status |
| `created_at` | timestamp | YES | CURRENT_TIMESTAMP | Alert creation date |
| `updated_at` | timestamp | YES | CURRENT_TIMESTAMP | Last modification |
| `last_triggered` | timestamp | YES | null | Last trigger time |
| `trigger_count` | integer | YES | 0 | Total trigger count |

**Features**:
- JSONB criteria for flexible search parameters
- Activity tracking (last triggered, count)
- Performance index on (`user_id`, `is_active`)

---

## Buyer Behavior & Intelligence

### 5. `user_behavioral_tracking` - Advanced Analytics
**Machine learning-ready behavioral data collection**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | integer | NO | auto-increment | Primary key |
| `user_id` | integer | YES | - | Foreign key to users.id |
| `session_id` | varchar | YES | - | Session identifier |
| `behavior_type` | varchar | NO | - | Behavior category |
| `behavior_data` | jsonb | NO | - | Detailed behavior data |
| `role_indicators` | jsonb | YES | '{}' | Role detection signals |
| `timestamp` | timestamp with time zone | YES | CURRENT_TIMESTAMP | Event timestamp |
| `weight` | numeric | YES | 1.00 | Behavior importance weight |

**Advanced Features**:
- Machine learning data structure
- Role inference capabilities
- Weighted behavior scoring
- Session tracking
- Timezone-aware timestamps

---

### 6. `user_role_preferences` - AI Role Detection
**Intelligent role preference detection and caching**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | integer | NO | auto-increment | Primary key |
| `user_id` | integer | YES | - | Foreign key to users.id |
| `session_id` | varchar | YES | - | Session identifier |
| `preferred_role` | varchar | NO | - | Detected/preferred role |
| `confidence_score` | numeric | YES | 0.00 | AI confidence level |
| `detection_method` | varchar | YES | - | How role was determined |
| `behavioral_data` | jsonb | YES | '{}' | Supporting behavior data |
| `created_at` | timestamp with time zone | YES | CURRENT_TIMESTAMP | Detection timestamp |
| `updated_at` | timestamp with time zone | YES | CURRENT_TIMESTAMP | Last update |
| `expires_at` | timestamp with time zone | YES | null | Cache expiration |
| `is_active` | boolean | YES | true | Active preference flag |

**AI Features**:
- Confidence scoring system
- Multiple detection methods
- Temporal caching with expiration
- Unique constraint on `user_id`

---

### 7. `user_role_activities` - Role-Based Activity Tracking
**Activity logging with role context**

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | integer | NO | Primary key |
| `user_id` | integer | NO | Foreign key to users.id |
| `role` | varchar | NO | User role during activity |
| `activity_type` | varchar | NO | Type of activity |
| `business_id` | integer | YES | Related business |
| `activity_data` | jsonb | YES | Activity metadata |
| `created_at` | timestamp | YES | Activity timestamp |

**Performance Indexes**:
- `user_id`, `role`, `activity_type`

---

## User Intelligence & Personalization

### 8. `user_questionnaires` - Onboarding Intelligence
**User questionnaire responses for personalization**

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | integer | NO | Primary key |
| `user_id` | integer | YES | Foreign key to users.id |
| `responses` | jsonb | NO | Questionnaire answers |
| `recommended_role` | varchar | YES | AI-recommended role |
| `created_at` | timestamp | YES | Completion timestamp |

---

### 9. `user_session_cache` - Performance Optimization
**Session-based caching for improved performance**

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | integer | NO | Primary key |
| `session_id` | varchar | NO | Session identifier |
| `user_id` | integer | YES | Foreign key to users.id |
| `cache_key` | varchar | NO | Cache entry key |
| `cache_value` | jsonb | NO | Cached data |
| `expires_at` | timestamp with time zone | NO | Cache expiration |
| `created_at` | timestamp with time zone | YES | Cache creation |
| `updated_at` | timestamp with time zone | YES | Last update |

**Performance Features**:
- Unique constraint on (`session_id`, `cache_key`)
- Automatic expiration handling
- Session-based partitioning

---

## Business Interaction Systems

### 10. `saved_businesses` - Buyer Favorites
**Business bookmarking and favorites system**

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | integer | NO | Primary key |
| `user_id` | integer | YES | Foreign key to users.id |
| `business_id` | integer | YES | Foreign key to businesses.id |
| `saved_at` | timestamp with time zone | YES | Save timestamp |

**Constraints**:
- Unique constraint on (`user_id`, `business_id`)
- Foreign keys to both users and businesses
- Performance indexes on both foreign keys

---

### 11. `saved_searches` - Search Persistence
**Saved search queries and alert integration**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | integer | NO | auto-increment | Primary key |
| `user_id` | integer | YES | - | Foreign key to users.id |
| `search_name` | varchar | NO | - | User-defined search name |
| `search_criteria` | jsonb | NO | - | Search parameters |
| `alert_enabled` | boolean | YES | false | Convert to alert |
| `created_at` | timestamp | YES | CURRENT_TIMESTAMP | Search save date |
| `updated_at` | timestamp | YES | CURRENT_TIMESTAMP | Last modification |

---

### 12. `business_meetings` - Meeting Management
**Comprehensive meeting scheduling and payment system**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | integer | NO | auto-increment | Primary key |
| `business_id` | integer | YES | - | Related business |
| `buyer_id` | integer | YES | - | Buyer user ID |
| `seller_id` | integer | YES | - | Seller user ID |
| `meeting_type` | varchar | NO | - | Meeting category |
| `scheduled_at` | timestamp | NO | - | Meeting date/time |
| `duration_minutes` | integer | YES | 60 | Meeting duration |
| `meeting_url` | varchar | YES | - | Video call URL |
| `meeting_location` | text | YES | - | Physical location |
| `status` | varchar | YES | 'scheduled' | Meeting status |
| `notes` | text | YES | - | Meeting notes |
| `payment_amount` | numeric | YES | - | Meeting fee |
| `payment_status` | varchar | YES | 'pending' | Payment status |
| `stripe_payment_intent_id` | varchar | YES | - | Stripe payment ID |
| `created_at` | timestamp | YES | CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | timestamp | YES | CURRENT_TIMESTAMP | Last update |

**Business Logic**:
- Three-way relationship (business, buyer, seller)
- Integrated payment processing
- Meeting status workflow
- Both virtual and physical meeting support

---

## Verification & Trust Systems

### 13. `professional_verification_requests` - Professional Verification
**Comprehensive professional credential verification**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | integer | NO | auto-increment | Primary key |
| `user_id` | integer | NO | - | Foreign key to users.id |
| `professional_type` | varchar | NO | - | Professional category |
| `request_date` | timestamp | YES | CURRENT_TIMESTAMP | Request submission |
| `status` | varchar | YES | 'pending' | Verification status |
| `verification_documents` | ARRAY | YES | - | Document references |
| `reviewer_id` | integer | YES | - | Assigned reviewer |
| `review_date` | timestamp | YES | - | Review completion |
| `review_notes` | text | YES | - | Reviewer comments |
| `reviewed_by` | integer | YES | - | Final reviewer |
| `reviewed_at` | timestamp | YES | - | Final review date |
| `verification_notes` | text | YES | - | Verification details |

**Workflow Features**:
- Multi-stage review process
- Document attachment system
- Status tracking (pending → approved/rejected)
- Dual reviewer system
- Unique constraint on (`user_id`, `status`)

**Current Data**: 1 approved accountant verification

---

### 14. `business_verifications` - Business Verification System
**AI-powered business verification and scoring**

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | integer | NO | Primary key |
| `business_id` | integer | NO | Foreign key to businesses.id |
| `user_id` | integer | NO | Requesting user |
| `verification_data` | jsonb | NO | Verification results |
| `weighted_score` | numeric | YES | AI confidence score |
| `confidence_level` | varchar | NO | Confidence category |
| `request_id` | varchar | NO | Unique request identifier |
| `created_at` | timestamp | NO | Verification timestamp |
| `processing_time` | integer | YES | Time taken (ms) |
| `model_used` | varchar | YES | AI model version |

**AI Features**:
- Machine learning verification
- Weighted scoring system
- Performance monitoring
- Model versioning

---

### 15. `verification_feedback` - Verification Quality Control
**User feedback on verification accuracy**

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | integer | NO | Primary key |
| `verification_id` | integer | NO | Foreign key to business_verifications.id |
| `user_id` | integer | NO | Feedback provider |
| `feedback_type` | varchar | NO | Feedback category |
| `comments` | text | YES | User comments |
| `created_at` | timestamp | NO | Feedback timestamp |

---

## Email & Communication

### 16. `customer_emails` - Email Management
**Anonymous and authenticated email tracking**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | integer | NO | auto-increment | Primary key |
| `email` | varchar | NO | - | Email address |
| `source` | varchar | YES | - | Email source/campaign |
| `anonymous_id` | varchar | YES | - | Anonymous tracking ID |
| `user_id` | uuid | YES | - | Linked user account |
| `opt_in` | boolean | YES | true | Marketing consent |
| `interaction_count` | integer | YES | 1 | Email interactions |
| `notes` | text | YES | - | Admin notes |
| `created_at` | timestamp | NO | now() | First seen |
| `updated_at` | timestamp | NO | now() | Last update |
| `last_seen_at` | timestamp | NO | now() | Last activity |

**Features**:
- Anonymous visitor tracking
- GDPR compliance (opt_in)
- Interaction frequency tracking
- User account linking

---

## Preference & Customization Systems

### 17. `thread_preferences` - General Thread Preferences
**Basic thread customization preferences**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | integer | NO | auto-increment | Primary key |
| `user_id` | integer | NO | - | Foreign key to users.id |
| `preferences` | jsonb | YES | '{}' | User preferences |
| `created_at` | timestamp | YES | CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | timestamp | YES | CURRENT_TIMESTAMP | Last update |

---

### 18. `a2a_thread_preferences` - A2A Agent Thread Preferences
**Advanced Agent-to-Agent conversation preferences**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | integer | NO | auto-increment | Primary key |
| `user_id` | integer | NO | - | Foreign key to users.id |
| `session_id` | integer | NO | - | A2A session ID |
| `thread_id` | varchar | YES | - | Thread identifier |
| `is_pinned` | boolean | YES | false | Pinned status |
| `is_archived` | boolean | YES | false | Archived status |
| `is_muted` | boolean | YES | false | Muted notifications |
| `custom_title` | varchar | YES | - | User-defined title |
| `custom_avatar_url` | text | YES | - | Custom avatar |
| `notification_settings` | jsonb | YES | default_notifications | Notification preferences |
| `tags` | jsonb | YES | '[]' | User tags |
| `preferences` | jsonb | YES | '{}' | Additional preferences |
| `created_at` | timestamp with time zone | YES | now() | Creation timestamp |
| `updated_at` | timestamp with time zone | YES | now() | Last update |

**Advanced Features**:
- A2A protocol integration
- Rich customization options
- Notification granular control
- Tagging system
- Default notification settings: `{"sound": true, "desktop": true, "enabled": true}`

---

## Database Views & Analytics

### 19. `v_user_conversations` - User Conversation View
**Aggregated conversation data for dashboard display**

| Column | Type | Description |
|--------|------|-------------|
| `id` | integer | Conversation ID |
| `title` | varchar | Conversation title |
| `last_message` | text | Most recent message |
| `conversation_type` | varchar | Type of conversation |
| `updated_at` | timestamp | Last update |
| `user_id` | integer | Associated user |
| `last_read_at` | timestamp | Last read timestamp |
| `unread_count` | bigint | Unread message count |
| `total_messages` | bigint | Total message count |

---

### 20. `v_verification_analytics` - Verification Analytics View
**Performance analytics for verification system**

| Column | Type | Description |
|--------|------|-------------|
| `day` | timestamp with time zone | Analytics date |
| `event_type` | varchar | Verification event type |
| `total_events` | bigint | Total events |
| `successful_events` | bigint | Successful verifications |
| `success_rate` | numeric | Success percentage |
| `avg_verification_time` | numeric | Average processing time |
| `max_attempts` | integer | Maximum attempts |
| `avg_attempts` | numeric | Average attempts |

---

### 21. `v_verification_by_device` - Device-Based Verification Analytics
**Verification success rates by device type**

| Column | Type | Description |
|--------|------|-------------|
| `device_type` | varchar | Device category |
| `source` | varchar | Traffic source |
| `total_events` | bigint | Total verification attempts |
| `successful_events` | bigint | Successful verifications |
| `success_rate` | numeric | Success rate percentage |

---

### 22. `v_a2a_thread_preferences_unified` - Unified A2A Preferences View
**Consolidated A2A thread preferences across systems**

| Column | Type | Description |
|--------|------|-------------|
| `id` | integer | Preference ID |
| `user_id` | integer | User ID |
| `thread_id` | varchar | Thread identifier |
| `session_id` | integer | Session ID |
| `preferences` | jsonb | Combined preferences |
| `created_at` | timestamp with time zone | Creation timestamp |
| `updated_at` | timestamp with time zone | Last update |

---

## Database Relationships

### Primary Relationships
```
users (1) ←→ (many) buyer_activity
users (1) ←→ (many) buyer_alerts  
users (1) ←→ (many) saved_businesses
users (1) ←→ (many) saved_searches
users (1) ←→ (1) users_auth
users (1) ←→ (many) business_meetings (as buyer)
users (1) ←→ (many) business_meetings (as seller)
users (1) ←→ (many) professional_verification_requests
users (1) ←→ (1) user_role_preferences
users (1) ←→ (many) user_behavioral_tracking
```

### Business Integration
```
businesses (1) ←→ (many) saved_businesses
businesses (1) ←→ (many) buyer_activity
businesses (1) ←→ (many) business_meetings
businesses (1) ←→ (many) business_verifications
```

---

## Performance Optimizations

### Key Indexes
- **User lookups**: `users.email`, `users.google_id`, `users.stripe_customer_id`
- **Activity tracking**: `buyer_activity(user_id, created_at)`
- **Alerts**: `buyer_alerts(user_id, is_active)`
- **Behavioral analytics**: `user_behavioral_tracking(user_id)`, `user_behavioral_tracking(session_id)`
- **Verification**: `professional_verification_requests(user_id, status)`
- **Business interactions**: `saved_businesses(user_id, business_id)` (unique)

### Unique Constraints
- **Email uniqueness**: `users.email`
- **Stripe integration**: `users.stripe_customer_id`
- **Saved businesses**: No duplicate saves per user
- **Role preferences**: One active preference per user
- **Session cache**: Unique session+key combinations

---

## Security & Privacy Features

### Authentication Security
- Separate `users_auth` table for sensitive data
- Email verification workflow
- OAuth integration (Google, Microsoft, LinkedIn)
- Stripe customer ID protection

### Data Privacy
- GDPR compliance in `customer_emails.opt_in`
- Anonymous tracking capabilities
- Secure token storage for OAuth
- Encrypted password storage

### Role-Based Access
- Professional verification system
- Multi-role support (`primary_role`, `roles` JSONB)
- Verification status tracking
- Admin/user role separation

---

## Business Intelligence Capabilities

### Behavioral Analytics
- Complete user journey tracking
- Session-based analysis
- Role inference through behavior
- Weighted behavior scoring
- ML-ready data structure

### Performance Metrics
- Verification success rates by device
- Time-based analytics
- User engagement tracking
- Meeting booking conversion
- Alert effectiveness monitoring

### Personalization Engine
- Questionnaire-based recommendations
- Behavioral role detection
- Preference caching system
- Custom alert criteria
- Saved search patterns

---

## Current System Status

### User Distribution
- **Total Users**: 11
- **Authentication**: 10 email, 1 Google OAuth
- **Onboarding**: 3 completed (27% completion rate)
- **Verifications**: 1 approved professional (accountant)
- **Subscription**: All users on free plans
- **Role Assignment**: No explicit buyer roles assigned yet

### System Readiness
- ✅ Complete buyer infrastructure in place
- ✅ Advanced behavioral tracking ready
- ✅ Professional verification system operational
- ✅ Meeting and payment systems configured
- ✅ AI/ML data structures prepared
- ⚠️ Low user adoption (needs marketing/onboarding optimization)
- ⚠️ No behavioral data collected yet (new system)

---

## Recommendations for Buyer Experience Enhancement

1. **Onboarding Optimization**: Improve completion rate from 27%
2. **Behavioral Data Collection**: Implement frontend tracking
3. **Role Detection**: Activate AI role inference system
4. **Alert System**: Promote saved searches → alerts conversion
5. **Professional Network**: Expand verification categories
6. **Payment Integration**: Test meeting booking with payments
7. **Analytics Dashboard**: Build buyer behavior insights
8. **A/B Testing**: Leverage existing A/B test framework for buyer flows

---

*Analysis completed: July 19, 2025*
*Database Schema Version: Latest (A2A Protocol Enabled)*

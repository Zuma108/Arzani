# Marketplace User Role Management System Implementation Plan

## Overview

This document outlines the implementation plan for enhancing the marketplace with a user role management system. The goal is to differentiate between buyers, sellers, and professional roles while maintaining flexibility for users to act in multiple capacities.

## Current State

The marketplace currently has a simple user table with basic role designation (primarily 'user' vs 'admin'). Users can act as both buyers and sellers without explicit differentiation in the database schema or user interface.

## Implementation Plan Checklist

### Phase 1: Database Schema Changes

- [x] Add `primary_role` column to users table (VARCHAR(20), default NULL)
- [x] Add `roles` JSONB column to store detailed role information
- [x] Add professional verification fields:
  - [x] `is_verified_professional` (BOOLEAN, default FALSE)
  - [x] `professional_type` (VARCHAR(50), default NULL)
  - [x] `professional_verification_date` (TIMESTAMP, default NULL)
- [x] Create role activity tracking table to monitor user behaviors in different roles
- [x] Create appropriate indexes for optimization

**SQL Schema Changes:**
```sql
-- Main schema changes
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS primary_role VARCHAR(20) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS roles JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_verified_professional BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS professional_type VARCHAR(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS professional_verification_date TIMESTAMP DEFAULT NULL;

-- Create role activity tracking table
CREATE TABLE IF NOT EXISTS user_role_activities (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    business_id INTEGER REFERENCES businesses(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_primary_role ON users(primary_role);
CREATE INDEX IF NOT EXISTS idx_users_is_verified_professional ON users(is_verified_professional);
CREATE INDEX IF NOT EXISTS idx_user_role_activities_user_id ON user_role_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_activities_role ON user_role_activities(role);
```

### Phase 2: API Development

- [x] Create endpoint for users to set primary role preference
- [x] Create endpoint for updating role details stored in JSONB
- [x] Implement API for professional verification requests
- [x] Develop role-based access control middleware
- [x] Create endpoints to retrieve role-specific data

**Key API Endpoints:**
- POST `/api/users/roles/primary`
- PUT `/api/users/roles`
- POST `/api/users/roles/request-verification`
- GET `/api/users/roles/data`

### Phase 3: User Interface Implementation

- [x] Implement role selection during user onboarding
- [ ] Add questionnaire for buyer/seller preference determination
- [x] Develop role toggle for switching contexts in navigation
- [x] Create role-specific dashboard views
- [x] Implement professional verification request form

### Phase 4: Professional Verification System

- [x] Build admin interface for verification review
- [x] Implement document upload system for verification requests
- [x] Create approval workflow with notifications
- [x] Develop AI-assisted verification to streamline process
- [x] Enable special permissions for verified professionals

### Phase 5: Analytics & Measurement

- [ ] Track role distribution percentages
- [ ] Measure role switching frequency
- [ ] Monitor professional verification conversion rates
- [ ] Implement A/B testing to optimize role selection flows
- [ ] Create admin dashboard for role analytics

## Success Criteria

1. **User Adoption:**
   - [ ] 70%+ of users have a defined primary role
   - [ ] 25%+ registration completion increase with streamlined role selection

2. **User Experience:**
   - [ ] 30% decrease in interface confusion (via user feedback)
   - [ ] 40% increase in feature discovery based on role

3. **Professional Engagement:**
   - [ ] 20% increase in professional user signups
   - [ ] 35% increase in interactions between verified professionals and users

## Future Enhancements

- Role-based AI agents customized to user type
- Dynamic pricing based on role types
- Enhanced matchmaking between complementary roles
- Role-based notification preferences
- Professional networking features for verified users
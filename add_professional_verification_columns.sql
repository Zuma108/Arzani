-- Migration to add professional verification columns to users table
-- Run this to fix the "column does not exist" error

-- Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified_professional BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS professional_type VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS professional_verification_date TIMESTAMP WITHOUT TIME ZONE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_is_verified_professional ON users(is_verified_professional);
CREATE INDEX IF NOT EXISTS idx_users_professional_type ON users(professional_type);

-- Update existing users who might have verified requests
-- This will mark users as verified if they have an approved verification request
UPDATE users 
SET 
    is_verified_professional = TRUE,
    professional_type = pvr.professional_type,
    professional_verification_date = pvr.review_date
FROM professional_verification_requests pvr
WHERE users.id = pvr.user_id 
    AND pvr.status = 'approved'
    AND users.is_verified_professional = FALSE;

-- Display summary
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN is_verified_professional = TRUE THEN 1 END) as verified_professionals
FROM users;
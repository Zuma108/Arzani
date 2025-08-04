-- Add profile_data column to professional_verification_requests table
-- This column stores the professional profile information submitted during verification

ALTER TABLE professional_verification_requests 
ADD COLUMN IF NOT EXISTS profile_data JSONB DEFAULT '{}'::jsonb;

-- Add index for better performance on profile data searches
CREATE INDEX IF NOT EXISTS idx_verification_requests_profile_data 
ON professional_verification_requests USING GIN(profile_data);

-- Add comment for documentation
COMMENT ON COLUMN professional_verification_requests.profile_data IS 'Professional profile information submitted during verification including bio, services, etc.';

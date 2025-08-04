-- Add new column for S3 URL
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS s3_profile_picture TEXT;

-- Migrate existing profile pictures to S3 URLs
UPDATE users 
SET s3_profile_picture = 
  CASE 
    WHEN profile_picture LIKE 'https://%s3.eu-north-1.amazonaws.com%' THEN profile_picture
    WHEN profile_picture IS NOT NULL THEN NULL
    ELSE NULL
  END;

-- Add constraint to ensure S3 URLs
ALTER TABLE users
ADD CONSTRAINT profile_picture_s3_url CHECK (
  s3_profile_picture IS NULL OR 
  s3_profile_picture LIKE 'https://%s3.eu-north-1.amazonaws.com%'
);

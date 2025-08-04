-- Add profile_picture column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS profile_picture TEXT;

-- Add updated_at column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

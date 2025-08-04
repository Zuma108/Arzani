-- Migration to ensure consistency between user table columns and blog references

-- Check if profile_picture column exists in users table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'profile_picture'
    ) THEN
        -- Add profile_picture column if it doesn't exist
        ALTER TABLE users ADD COLUMN profile_picture VARCHAR(255);
        
        -- Log the change
        RAISE NOTICE 'Added profile_picture column to users table';
    ELSE
        RAISE NOTICE 'profile_picture column already exists in users table';
    END IF;
END $$;

-- Check for any old data in profile_image column if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'profile_image'
    ) THEN
        -- Migrate data from profile_image to profile_picture if needed
        UPDATE users 
        SET profile_picture = profile_image 
        WHERE profile_picture IS NULL AND profile_image IS NOT NULL;
        
        RAISE NOTICE 'Migrated data from profile_image to profile_picture where needed';
    END IF;
END $$;

-- Add default avatar for users without profile pictures
UPDATE users
SET profile_picture = '/figma design exports/images/default-avatar.png'
WHERE profile_picture IS NULL OR profile_picture = '';

-- Create an index on the profile_picture column for better query performance
CREATE INDEX IF NOT EXISTS idx_users_profile_picture ON users(profile_picture);

-- Update the comments to clarify column usage
COMMENT ON COLUMN users.profile_picture IS 'URL to user profile picture. Used by blog and other profile displays';

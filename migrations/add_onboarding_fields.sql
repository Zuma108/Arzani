-- Migration: Add onboarding fields to users table
-- Description: Adds onboarding tracking and discovery source for marketing attribution
-- Created: July 2, 2025

-- Begin transaction
BEGIN;

-- Add onboarding fields to users table
DO $$ 
BEGIN
    -- Check and add onboarding_completed column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'onboarding_completed'
    ) THEN
        ALTER TABLE users ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added onboarding_completed column to users table';
    ELSE
        RAISE NOTICE 'onboarding_completed column already exists';
    END IF;

    -- Check and add discovery_source column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'discovery_source'
    ) THEN
        ALTER TABLE users ADD COLUMN discovery_source VARCHAR(100);
        RAISE NOTICE 'Added discovery_source column to users table';
    ELSE
        RAISE NOTICE 'discovery_source column already exists';
    END IF;

    -- Check and add onboarding_completed_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'onboarding_completed_at'
    ) THEN
        ALTER TABLE users ADD COLUMN onboarding_completed_at TIMESTAMP;
        RAISE NOTICE 'Added onboarding_completed_at column to users table';
    ELSE
        RAISE NOTICE 'onboarding_completed_at column already exists';
    END IF;

    -- Check and add onboarding_data column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'onboarding_data'
    ) THEN
        ALTER TABLE users ADD COLUMN onboarding_data JSONB;
        RAISE NOTICE 'Added onboarding_data column to users table';
    ELSE
        RAISE NOTICE 'onboarding_data column already exists';
    END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_onboarding_completed ON users(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_users_discovery_source ON users(discovery_source);
CREATE INDEX IF NOT EXISTS idx_users_onboarding_completed_at ON users(onboarding_completed_at);

-- Add comments for documentation
COMMENT ON COLUMN users.onboarding_completed IS 'Tracks whether user has completed the onboarding flow';
COMMENT ON COLUMN users.discovery_source IS 'How the user discovered the platform (google, reddit, chatgpt, etc.)';
COMMENT ON COLUMN users.onboarding_completed_at IS 'Timestamp when user completed onboarding';
COMMENT ON COLUMN users.onboarding_data IS 'Additional onboarding data stored as JSON';

-- Commit transaction
COMMIT;

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('onboarding_completed', 'discovery_source', 'onboarding_completed_at', 'onboarding_data')
ORDER BY column_name;

-- User Role Management Migration
-- Created: April 13, 2025
-- Description: Adds columns and tables needed for the enhanced role management system

-- Add role-related columns to users table
DO $$ 
BEGIN
    -- Check and add primary_role column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'primary_role'
    ) THEN
        ALTER TABLE users ADD COLUMN primary_role VARCHAR(20) DEFAULT NULL;
        RAISE NOTICE 'Added primary_role column to users table';
    END IF;

    -- Check and add roles JSONB column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'roles'
    ) THEN
        ALTER TABLE users ADD COLUMN roles JSONB DEFAULT NULL;
        RAISE NOTICE 'Added roles JSONB column to users table';
    END IF;

    -- Check and add professional verification fields
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'is_verified_professional'
    ) THEN
        ALTER TABLE users ADD COLUMN is_verified_professional BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_verified_professional column to users table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'professional_type'
    ) THEN
        ALTER TABLE users ADD COLUMN professional_type VARCHAR(50) DEFAULT NULL;
        RAISE NOTICE 'Added professional_type column to users table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'professional_verification_date'
    ) THEN
        ALTER TABLE users ADD COLUMN professional_verification_date TIMESTAMP DEFAULT NULL;
        RAISE NOTICE 'Added professional_verification_date column to users table';
    END IF;
END $$;

-- Create user_role_activities table
CREATE TABLE IF NOT EXISTS user_role_activities (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    business_id INTEGER REFERENCES businesses(id) ON DELETE SET NULL,
    activity_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create professional_verification_requests table to track verification workflow
CREATE TABLE IF NOT EXISTS professional_verification_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    professional_type VARCHAR(50) NOT NULL,
    request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',
    verification_documents TEXT[],
    reviewer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    review_date TIMESTAMP,
    review_notes TEXT,
    UNIQUE(user_id, status)
);

-- Create indexes for optimization
CREATE INDEX IF NOT EXISTS idx_users_primary_role ON users(primary_role);
CREATE INDEX IF NOT EXISTS idx_users_is_verified_professional ON users(is_verified_professional);
CREATE INDEX IF NOT EXISTS idx_users_professional_type ON users(professional_type);
CREATE INDEX IF NOT EXISTS idx_user_role_activities_user_id ON user_role_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_activities_role ON user_role_activities(role);
CREATE INDEX IF NOT EXISTS idx_user_role_activities_activity_type ON user_role_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_prof_verification_user_id ON professional_verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_prof_verification_status ON professional_verification_requests(status);

-- Create a function to update roles JSONB when primary_role changes
CREATE OR REPLACE FUNCTION update_roles_on_primary_role_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.primary_role IS NOT NULL AND (OLD.primary_role IS NULL OR OLD.primary_role <> NEW.primary_role) THEN
        -- Initialize roles JSONB if NULL
        IF NEW.roles IS NULL THEN
            NEW.roles := '{}';
        END IF;
        
        -- Add primary role to roles with timestamp
        NEW.roles := jsonb_set(
            COALESCE(NEW.roles, '{}'::jsonb),
            ARRAY[NEW.primary_role],
            jsonb_build_object(
                'active', true,
                'since', extract(epoch from now())::bigint
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update roles JSONB when primary_role changes
DROP TRIGGER IF EXISTS update_roles_trigger ON users;
CREATE TRIGGER update_roles_trigger
BEFORE UPDATE OF primary_role ON users
FOR EACH ROW
EXECUTE FUNCTION update_roles_on_primary_role_change();
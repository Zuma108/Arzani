-- Onboarding System Database Schema - 2025
-- Enhanced schema for comprehensive user onboarding with progress tracking
-- Compatible with pgAdmin execution

-- First, let's check if users table exists and examine its structure
DO $$
BEGIN
    -- Check if users table exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        -- Create users table if it doesn't exist
        CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255),
            username VARCHAR(100),
            first_name VARCHAR(100),
            last_name VARCHAR(100),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            email_verified BOOLEAN DEFAULT false,
            last_login TIMESTAMP,
            is_active BOOLEAN DEFAULT true,
            -- Google OAuth fields
            google_id VARCHAR(255) UNIQUE,
            google_email VARCHAR(255),
            google_name VARCHAR(255),
            google_picture VARCHAR(500),
            provider VARCHAR(50) DEFAULT 'local' -- 'local', 'google', etc.
        );
        
        -- Create indexes for performance
        CREATE INDEX idx_users_email ON users(email);
        CREATE INDEX idx_users_google_id ON users(google_id);
        CREATE INDEX idx_users_created_at ON users(created_at);
        CREATE INDEX idx_users_last_login ON users(last_login);
        
        RAISE NOTICE 'Created users table with basic authentication fields';
    ELSE
        RAISE NOTICE 'Users table already exists, will add onboarding fields';
    END IF;
END $$;

-- Now add onboarding-specific columns to users table
DO $$
BEGIN
    -- Add user_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'user_type') THEN
        ALTER TABLE users ADD COLUMN user_type VARCHAR(20) DEFAULT 'buyer';
        RAISE NOTICE 'Added user_type column';
    END IF;
    
    -- Add business_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'business_name') THEN
        ALTER TABLE users ADD COLUMN business_name VARCHAR(100);
        RAISE NOTICE 'Added business_name column';
    END IF;
    
    -- Add business_email column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'business_email') THEN
        ALTER TABLE users ADD COLUMN business_email VARCHAR(255);
        RAISE NOTICE 'Added business_email column';
    END IF;
    
    -- Add business_phone column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'business_phone') THEN
        ALTER TABLE users ADD COLUMN business_phone VARCHAR(20);
        RAISE NOTICE 'Added business_phone column';
    END IF;
    
    -- Add business_address column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'business_address') THEN
        ALTER TABLE users ADD COLUMN business_address TEXT;
        RAISE NOTICE 'Added business_address column';
    END IF;
    
    -- Add industry column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'industry') THEN
        ALTER TABLE users ADD COLUMN industry VARCHAR(50);
        RAISE NOTICE 'Added industry column';
    END IF;
    
    -- Add company_size column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'company_size') THEN
        ALTER TABLE users ADD COLUMN company_size VARCHAR(20);
        RAISE NOTICE 'Added company_size column';
    END IF;
    
    -- Add onboarding_completed column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'onboarding_completed') THEN
        ALTER TABLE users ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added onboarding_completed column';
    END IF;
    
    -- Add profile_updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'profile_updated_at') THEN
        ALTER TABLE users ADD COLUMN profile_updated_at TIMESTAMP DEFAULT NOW();
        RAISE NOTICE 'Added profile_updated_at column';
    END IF;
END $$;

-- Create index for onboarding status queries
CREATE INDEX IF NOT EXISTS idx_users_onboarding_completed ON users(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_industry ON users(industry);

-- Create onboarding_progress table for temporary data storage
CREATE TABLE IF NOT EXISTS onboarding_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    form_data JSONB NOT NULL DEFAULT '{}',
    step INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create index for progress tracking
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_id ON onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_updated_at ON onboarding_progress(updated_at);

-- Create user_preferences table for storing user preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preferences JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create index for preferences queries
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_preferences ON user_preferences USING GIN(preferences);

-- Create user_activity_logs table for tracking user actions
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    activity_data JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for activity logs
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_activity_type ON user_activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at);

-- Add constraints for user_type
ALTER TABLE users 
ADD CONSTRAINT IF NOT EXISTS chk_user_type 
CHECK (user_type IN ('seller', 'buyer', 'investor', 'advisor'));

-- Add constraints for industry
ALTER TABLE users 
ADD CONSTRAINT IF NOT EXISTS chk_industry 
CHECK (industry IN (
    'technology', 'healthcare', 'finance', 'retail', 'manufacturing',
    'education', 'hospitality', 'real-estate', 'automotive', 'agriculture',
    'consulting', 'marketing', 'legal', 'construction', 'other'
));

-- Add constraints for company_size
ALTER TABLE users 
ADD CONSTRAINT IF NOT EXISTS chk_company_size 
CHECK (company_size IN ('1-10', '11-50', '51-200', '201-500', '500+'));

-- Create function to clean up old onboarding progress
CREATE OR REPLACE FUNCTION cleanup_old_onboarding_progress()
RETURNS void AS $$
BEGIN
    DELETE FROM onboarding_progress 
    WHERE updated_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update user profile_updated_at
CREATE OR REPLACE FUNCTION update_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.profile_updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_profile_updated_at ON users;
CREATE TRIGGER trigger_update_profile_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    WHEN (OLD.business_name IS DISTINCT FROM NEW.business_name OR
          OLD.business_email IS DISTINCT FROM NEW.business_email OR
          OLD.business_phone IS DISTINCT FROM NEW.business_phone OR
          OLD.business_address IS DISTINCT FROM NEW.business_address OR
          OLD.industry IS DISTINCT FROM NEW.industry OR
          OLD.company_size IS DISTINCT FROM NEW.company_size OR
          OLD.user_type IS DISTINCT FROM NEW.user_type)
    EXECUTE FUNCTION update_profile_updated_at();

-- Create trigger to update onboarding_progress updated_at
CREATE OR REPLACE FUNCTION update_onboarding_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_onboarding_progress_updated_at ON onboarding_progress;
CREATE TRIGGER trigger_update_onboarding_progress_updated_at
    BEFORE UPDATE ON onboarding_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_onboarding_progress_updated_at();

-- Create trigger to update user_preferences updated_at
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER trigger_update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_user_preferences_updated_at();

-- Insert default industries if they don't exist (for reference)
CREATE TABLE IF NOT EXISTS industry_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert industry data
INSERT INTO industry_categories (name, display_name, description, sort_order) VALUES
('technology', 'Technology & Software', 'Software development, IT services, tech startups', 1),
('healthcare', 'Healthcare & Medical', 'Medical services, pharmaceuticals, health tech', 2),
('finance', 'Finance & Banking', 'Financial services, banking, fintech, insurance', 3),
('retail', 'Retail & E-commerce', 'Retail stores, online commerce, consumer goods', 4),
('manufacturing', 'Manufacturing & Industrial', 'Manufacturing, production, industrial services', 5),
('education', 'Education & Training', 'Educational institutions, training services, edtech', 6),
('hospitality', 'Hospitality & Tourism', 'Hotels, restaurants, travel, entertainment', 7),
('real-estate', 'Real Estate & Property', 'Real estate, property management, construction', 8),
('automotive', 'Automotive & Transportation', 'Auto sales, transport, logistics', 9),
('agriculture', 'Agriculture & Food', 'Agriculture, food production, farming', 10),
('consulting', 'Consulting & Professional Services', 'Business consulting, professional services', 11),
('marketing', 'Marketing & Advertising', 'Marketing agencies, advertising, PR', 12),
('legal', 'Legal Services', 'Law firms, legal consulting, compliance', 13),
('construction', 'Construction & Engineering', 'Construction, engineering, infrastructure', 14),
('other', 'Other Industries', 'Industries not listed above', 15)
ON CONFLICT (name) DO NOTHING;

-- Create view for user onboarding analytics
CREATE OR REPLACE VIEW onboarding_analytics AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as total_users,
    COUNT(CASE WHEN onboarding_completed = true THEN 1 END) as completed_onboarding,
    COUNT(CASE WHEN onboarding_completed = false THEN 1 END) as incomplete_onboarding,
    ROUND(
        COUNT(CASE WHEN onboarding_completed = true THEN 1 END) * 100.0 / COUNT(*), 
        2
    ) as completion_rate,
    COUNT(CASE WHEN user_type = 'seller' THEN 1 END) as sellers,
    COUNT(CASE WHEN user_type = 'buyer' THEN 1 END) as buyers,
    COUNT(CASE WHEN user_type = 'investor' THEN 1 END) as investors,
    COUNT(CASE WHEN user_type = 'advisor' THEN 1 END) as advisors
FROM users 
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- Create view for user preferences summary
CREATE OR REPLACE VIEW user_preferences_summary AS
SELECT 
    u.id,
    u.business_name,
    u.user_type,
    u.industry,
    u.company_size,
    u.onboarding_completed,
    COALESCE(up.preferences, '{}'::jsonb) as preferences,
    u.created_at,
    u.profile_updated_at
FROM users u
LEFT JOIN user_preferences up ON u.id = up.user_id
WHERE u.onboarding_completed = true;

-- Create view for onboarding progress monitoring
CREATE OR REPLACE VIEW onboarding_progress_monitoring AS
SELECT 
    u.id as user_id,
    u.email,
    u.business_name,
    u.created_at as user_created_at,
    u.onboarding_completed,
    op.step as current_step,
    op.updated_at as last_progress_update,
    EXTRACT(EPOCH FROM (NOW() - op.updated_at))/3600 as hours_since_last_update,
    CASE 
        WHEN u.onboarding_completed = true THEN 'completed'
        WHEN op.step IS NULL THEN 'not_started'
        WHEN EXTRACT(EPOCH FROM (NOW() - op.updated_at))/3600 > 24 THEN 'stalled'
        ELSE 'in_progress'
    END as status
FROM users u
LEFT JOIN onboarding_progress op ON u.id = op.user_id
WHERE u.created_at > NOW() - INTERVAL '30 days'
ORDER BY u.created_at DESC;

-- Create function to get onboarding completion stats
CREATE OR REPLACE FUNCTION get_onboarding_stats(days_back INTEGER DEFAULT 30)
RETURNS TABLE(
    total_users BIGINT,
    completed_users BIGINT,
    completion_rate NUMERIC,
    avg_completion_time_hours NUMERIC,
    most_popular_user_type TEXT,
    most_popular_industry TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_users,
        COUNT(CASE WHEN u.onboarding_completed = true THEN 1 END)::BIGINT as completed_users,
        ROUND(
            COUNT(CASE WHEN u.onboarding_completed = true THEN 1 END) * 100.0 / COUNT(*), 
            2
        ) as completion_rate,
        ROUND(
            AVG(EXTRACT(EPOCH FROM (u.profile_updated_at - u.created_at))/3600), 
            2
        ) as avg_completion_time_hours,
        MODE() WITHIN GROUP (ORDER BY u.user_type) as most_popular_user_type,
        MODE() WITHIN GROUP (ORDER BY u.industry) as most_popular_industry
    FROM users u
    WHERE u.created_at > NOW() - INTERVAL '1 day' * days_back;
END;
$$ LANGUAGE plpgsql;

-- Insert sample successful onboarding completion for testing
-- (Remove this in production)
INSERT INTO user_activity_logs (user_id, activity_type, activity_data, created_at)
SELECT 
    1 as user_id,
    'onboarding_completed' as activity_type,
    '{"businessType": "seller", "industry": "technology", "completedAt": "2025-01-27T10:00:00Z"}'::jsonb as activity_data,
    NOW() as created_at
WHERE EXISTS (SELECT 1 FROM users WHERE id = 1)
ON CONFLICT DO NOTHING;

-- Create cleanup job (to be scheduled via cron or application)
-- This should be run daily to clean up old progress data
CREATE OR REPLACE FUNCTION daily_onboarding_cleanup()
RETURNS void AS $$
BEGIN
    -- Clean up old onboarding progress (older than 7 days)
    DELETE FROM onboarding_progress 
    WHERE updated_at < NOW() - INTERVAL '7 days';
    
    -- Clean up old activity logs (older than 6 months)
    DELETE FROM user_activity_logs 
    WHERE created_at < NOW() - INTERVAL '6 months'
    AND activity_type IN ('onboarding_progress_saved', 'onboarding_step_completed');
    
    -- Log cleanup completion
    INSERT INTO user_activity_logs (user_id, activity_type, activity_data, created_at)
    VALUES (0, 'system_cleanup', '{"type": "onboarding_cleanup"}', NOW());
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions (adjust user names as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON users TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON onboarding_progress TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON user_preferences TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON user_activity_logs TO app_user;
-- GRANT SELECT ON industry_categories TO app_user;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;

COMMIT;
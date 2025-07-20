-- Role Selection and Caching Enhancement Migration
-- This migration enhances role selection functionality with proper caching support

-- Create User Role Preferences table for caching role selections
CREATE TABLE IF NOT EXISTS user_role_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    session_id VARCHAR(255),
    preferred_role VARCHAR(100) NOT NULL, -- 'buyer', 'seller', 'professional', 'investor'
    confidence_score DECIMAL(3,2) DEFAULT 0.00, -- 0.00 to 1.00
    detection_method VARCHAR(100), -- 'manual_selection', 'behavioral_analysis', 'questionnaire', 'historical_data'
    behavioral_data JSONB DEFAULT '{}', -- Store behavioral analysis data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE, -- Cache expiration
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id) -- One active preference per user
);

-- Create Role Selection History table to track changes
CREATE TABLE IF NOT EXISTS user_role_selection_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    session_id VARCHAR(255),
    previous_role VARCHAR(100),
    new_role VARCHAR(100) NOT NULL,
    change_reason VARCHAR(200), -- 'manual_selection', 'system_detected', 'questionnaire_result'
    confidence_score DECIMAL(3,2) DEFAULT 0.00,
    behavioral_indicators JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create User Session Cache table for storing temporary role data
CREATE TABLE IF NOT EXISTS user_session_cache (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    user_id INTEGER REFERENCES users(id),
    cache_key VARCHAR(200) NOT NULL,
    cache_value JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, cache_key)
);

-- Create Behavioral Tracking table for role detection
CREATE TABLE IF NOT EXISTS user_behavioral_tracking (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    session_id VARCHAR(255),
    behavior_type VARCHAR(100) NOT NULL, -- 'page_view', 'search', 'click', 'time_spent'
    behavior_data JSONB NOT NULL,
    role_indicators JSONB DEFAULT '{}', -- Which roles this behavior suggests
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    weight DECIMAL(3,2) DEFAULT 1.00 -- How much this behavior weighs in role detection
);

-- Create Smart Routing Cache table for performance
CREATE TABLE IF NOT EXISTS smart_routing_cache (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    session_id VARCHAR(255),
    routing_data JSONB NOT NULL,
    confidence_scores JSONB DEFAULT '{}', -- Scores for each role
    recommended_variant VARCHAR(100),
    cache_version INTEGER DEFAULT 1,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, session_id)
);

-- Add new columns to existing users table for enhanced role management
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role_confidence DECIMAL(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS role_last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS role_detection_method VARCHAR(100) DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS behavioral_score JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS role_cache_expires TIMESTAMP WITH TIME ZONE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_role_preferences_user_id ON user_role_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_preferences_session_id ON user_role_preferences(session_id);
CREATE INDEX IF NOT EXISTS idx_user_role_preferences_expires_at ON user_role_preferences(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_role_preferences_is_active ON user_role_preferences(is_active);

CREATE INDEX IF NOT EXISTS idx_user_role_selection_history_user_id ON user_role_selection_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_selection_history_created_at ON user_role_selection_history(created_at);

CREATE INDEX IF NOT EXISTS idx_user_session_cache_session_id ON user_session_cache(session_id);
CREATE INDEX IF NOT EXISTS idx_user_session_cache_expires_at ON user_session_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_session_cache_cache_key ON user_session_cache(cache_key);

CREATE INDEX IF NOT EXISTS idx_user_behavioral_tracking_user_id ON user_behavioral_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_user_behavioral_tracking_session_id ON user_behavioral_tracking(session_id);
CREATE INDEX IF NOT EXISTS idx_user_behavioral_tracking_behavior_type ON user_behavioral_tracking(behavior_type);
CREATE INDEX IF NOT EXISTS idx_user_behavioral_tracking_timestamp ON user_behavioral_tracking(timestamp);

CREATE INDEX IF NOT EXISTS idx_smart_routing_cache_user_id ON smart_routing_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_smart_routing_cache_session_id ON smart_routing_cache(session_id);
CREATE INDEX IF NOT EXISTS idx_smart_routing_cache_expires_at ON smart_routing_cache(expires_at);

-- Create function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache() RETURNS void AS $$
BEGIN
    DELETE FROM user_role_preferences WHERE expires_at < CURRENT_TIMESTAMP;
    DELETE FROM user_session_cache WHERE expires_at < CURRENT_TIMESTAMP;
    DELETE FROM smart_routing_cache WHERE expires_at < CURRENT_TIMESTAMP;
    
    -- Clean up old behavioral tracking data (older than 30 days)
    DELETE FROM user_behavioral_tracking WHERE timestamp < CURRENT_TIMESTAMP - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Create function to update role confidence based on behavioral data
CREATE OR REPLACE FUNCTION update_role_confidence(p_user_id INTEGER) RETURNS void AS $$
DECLARE
    buyer_score DECIMAL(3,2) := 0.00;
    seller_score DECIMAL(3,2) := 0.00;
    professional_score DECIMAL(3,2) := 0.00;
    investor_score DECIMAL(3,2) := 0.00;
    total_behaviors INTEGER := 0;
BEGIN
    -- Calculate role scores based on behavioral tracking
    SELECT 
        COALESCE(AVG(CASE WHEN (behavior_data->>'role_indicator') = 'buyer' THEN weight END), 0),
        COALESCE(AVG(CASE WHEN (behavior_data->>'role_indicator') = 'seller' THEN weight END), 0),
        COALESCE(AVG(CASE WHEN (behavior_data->>'role_indicator') = 'professional' THEN weight END), 0),
        COALESCE(AVG(CASE WHEN (behavior_data->>'role_indicator') = 'investor' THEN weight END), 0),
        COUNT(*)
    INTO buyer_score, seller_score, professional_score, investor_score, total_behaviors
    FROM user_behavioral_tracking 
    WHERE user_id = p_user_id 
    AND timestamp > CURRENT_TIMESTAMP - INTERVAL '7 days';
    
    -- Update user's behavioral score
    UPDATE users 
    SET 
        behavioral_score = jsonb_build_object(
            'buyer', buyer_score,
            'seller', seller_score,
            'professional', professional_score,
            'investor', investor_score,
            'total_behaviors', total_behaviors,
            'last_calculated', CURRENT_TIMESTAMP
        ),
        role_last_updated = CURRENT_TIMESTAMP
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE user_role_preferences IS 'Stores cached user role preferences with confidence scores';
COMMENT ON TABLE user_role_selection_history IS 'Tracks history of role changes for analysis';
COMMENT ON TABLE user_session_cache IS 'General purpose session-based caching for user data';
COMMENT ON TABLE user_behavioral_tracking IS 'Tracks user behaviors for intelligent role detection';
COMMENT ON TABLE smart_routing_cache IS 'Caches smart routing decisions for performance';

COMMENT ON FUNCTION cleanup_expired_cache() IS 'Removes expired cache entries and old behavioral data';
COMMENT ON FUNCTION update_role_confidence(INTEGER) IS 'Updates user role confidence scores based on behavioral data';

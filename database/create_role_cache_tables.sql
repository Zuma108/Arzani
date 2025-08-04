-- Create role caching tables
CREATE TABLE IF NOT EXISTS user_role_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    session_id VARCHAR(255),
    preferred_role VARCHAR(100) NOT NULL,
    confidence_score DECIMAL(3,2) DEFAULT 0.00,
    detection_method VARCHAR(100),
    behavioral_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id)
);

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

CREATE TABLE IF NOT EXISTS user_behavioral_tracking (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    session_id VARCHAR(255),
    behavior_type VARCHAR(100) NOT NULL,
    behavior_data JSONB NOT NULL,
    role_indicators JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    weight DECIMAL(3,2) DEFAULT 1.00
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_role_preferences_user_id ON user_role_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_session_cache_session_id ON user_session_cache(session_id);
CREATE INDEX IF NOT EXISTS idx_user_behavioral_tracking_user_id ON user_behavioral_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_user_behavioral_tracking_session_id ON user_behavioral_tracking(session_id);

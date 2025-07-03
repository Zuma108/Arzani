-- Fix A2A Database Schema Issues
-- This script fixes the missing columns and tables causing 500 errors
-- Run this in pgAdmin to resolve the schema mismatches

-- =============================================================================
-- ADD MISSING COLUMNS TO EXISTING TABLES
-- =============================================================================

-- Add session_data column to a2a_session_context table
DO $$
BEGIN
    -- Check if the column exists before adding it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a2a_session_context' AND column_name = 'session_data'
    ) THEN
        ALTER TABLE a2a_session_context 
        ADD COLUMN session_data JSONB DEFAULT '{}';
        
        RAISE NOTICE 'Added session_data column to a2a_session_context table';
    ELSE
        RAISE NOTICE 'session_data column already exists in a2a_session_context table';
    END IF;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'Table a2a_session_context does not exist - will create it';
END $$;

-- =============================================================================
-- CREATE MISSING TABLES
-- =============================================================================

-- Create a2a_thread_preferences table
CREATE TABLE IF NOT EXISTS a2a_thread_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    thread_id VARCHAR(255) NOT NULL,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, thread_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create a2a_thread_cache table if it doesn't exist
CREATE TABLE IF NOT EXISTS a2a_thread_cache (
    id SERIAL PRIMARY KEY,
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    cache_data JSONB NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

-- Create a2a_file_uploads table if it doesn't exist (different from chat version)
CREATE TABLE IF NOT EXISTS a2a_file_uploads (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    session_id VARCHAR(255),
    message_id VARCHAR(255),
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT,
    file_url TEXT,
    file_type VARCHAR(100),
    file_size BIGINT,
    upload_status VARCHAR(20) DEFAULT 'pending' CHECK (upload_status IN ('pending', 'uploading', 'completed', 'failed')),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create a2a_agent_transitions table if it doesn't exist
CREATE TABLE IF NOT EXISTS a2a_agent_transitions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    from_agent VARCHAR(100) NOT NULL,
    to_agent VARCHAR(100) NOT NULL,
    transition_reason TEXT,
    message_id VARCHAR(255),
    success BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =============================================================================

-- Indexes for a2a_thread_preferences
CREATE INDEX IF NOT EXISTS idx_a2a_thread_preferences_user_id ON a2a_thread_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_a2a_thread_preferences_thread_id ON a2a_thread_preferences(thread_id);

-- Indexes for a2a_thread_cache
CREATE INDEX IF NOT EXISTS idx_a2a_thread_cache_key ON a2a_thread_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_a2a_thread_cache_expires ON a2a_thread_cache(expires_at);

-- Indexes for a2a_file_uploads
CREATE INDEX IF NOT EXISTS idx_a2a_file_uploads_user_id ON a2a_file_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_a2a_file_uploads_session_id ON a2a_file_uploads(session_id);
CREATE INDEX IF NOT EXISTS idx_a2a_file_uploads_status ON a2a_file_uploads(upload_status);

-- Indexes for a2a_agent_transitions
CREATE INDEX IF NOT EXISTS idx_a2a_agent_transitions_user_id ON a2a_agent_transitions(user_id);
CREATE INDEX IF NOT EXISTS idx_a2a_agent_transitions_session_id ON a2a_agent_transitions(session_id);
CREATE INDEX IF NOT EXISTS idx_a2a_agent_transitions_agents ON a2a_agent_transitions(from_agent, to_agent);

-- =============================================================================
-- UPDATE TRIGGERS
-- =============================================================================

-- Update trigger for a2a_thread_preferences
CREATE TRIGGER update_a2a_thread_preferences_updated_at 
    BEFORE UPDATE ON a2a_thread_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- UTILITY FUNCTIONS
-- =============================================================================

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_a2a_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM a2a_thread_cache 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get thread preferences
CREATE OR REPLACE FUNCTION get_a2a_thread_preferences(
    p_user_id INTEGER,
    p_thread_id VARCHAR(255)
)
RETURNS JSONB AS $$
DECLARE
    user_preferences JSONB;
BEGIN
    SELECT preferences INTO user_preferences
    FROM a2a_thread_preferences
    WHERE user_id = p_user_id AND thread_id = p_thread_id;
    
    RETURN COALESCE(user_preferences, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql;

-- Function to set thread preferences
CREATE OR REPLACE FUNCTION set_a2a_thread_preferences(
    p_user_id INTEGER,
    p_thread_id VARCHAR(255),
    p_preferences JSONB
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO a2a_thread_preferences (user_id, thread_id, preferences)
    VALUES (p_user_id, p_thread_id, p_preferences)
    ON CONFLICT (user_id, thread_id) 
    DO UPDATE SET 
        preferences = p_preferences,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- VERIFY TABLES AND COLUMNS
-- =============================================================================

DO $$
DECLARE
    table_count INTEGER;
    column_count INTEGER;
BEGIN
    -- Check if all required tables exist
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_name IN (
        'a2a_session_context',
        'a2a_thread_preferences', 
        'a2a_thread_cache',
        'a2a_file_uploads',
        'a2a_agent_transitions'
    );
    
    -- Check if session_data column exists
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns
    WHERE table_name = 'a2a_session_context' AND column_name = 'session_data';
    
    RAISE NOTICE 'Database schema fix completed!';
    RAISE NOTICE 'Tables found: % out of 5 required', table_count;
    RAISE NOTICE 'session_data column exists: %', CASE WHEN column_count > 0 THEN 'YES' ELSE 'NO' END;
    
    IF table_count >= 4 AND column_count > 0 THEN
        RAISE NOTICE '✅ Schema fix successful - all required structures created';
    ELSE
        RAISE NOTICE '⚠️  Some structures may still be missing - check the logs above';
    END IF;
END $$;

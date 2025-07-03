-- Fix A2A Database Schema Issues - CORRECTED VERSION
-- This script fixes the remaining database issues after the first run
-- Run this in pgAdmin to complete the schema fixes

-- =============================================================================
-- FIX A2A_AGENT_INTERACTIONS TABLE
-- =============================================================================

-- Add missing session_id column to a2a_agent_interactions table
DO $agent_interactions_fix$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a2a_agent_interactions' AND column_name = 'session_id'
    ) THEN
        ALTER TABLE a2a_agent_interactions 
        ADD COLUMN session_id INTEGER;
        
        -- Add foreign key constraint if a2a_chat_sessions table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'a2a_chat_sessions') THEN
            ALTER TABLE a2a_agent_interactions 
            ADD CONSTRAINT fk_agent_interactions_session 
            FOREIGN KEY (session_id) REFERENCES a2a_chat_sessions(id) ON DELETE CASCADE;
        END IF;
        
        RAISE NOTICE 'Added session_id column to a2a_agent_interactions table';
    ELSE
        RAISE NOTICE 'session_id column already exists in a2a_agent_interactions table';
    END IF;
END $agent_interactions_fix$;

-- Fix thread_previews table to include user_id
DO $thread_previews_fix$
BEGIN
    -- Drop the table if it exists and recreate with correct structure
    DROP TABLE IF EXISTS thread_previews CASCADE;
    
    CREATE TABLE thread_previews (
        id SERIAL PRIMARY KEY,
        thread_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        last_message TEXT,
        last_message_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE(thread_id, user_id),
        FOREIGN KEY (thread_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    
    RAISE NOTICE 'Created thread_previews table with correct structure including user_id';
END $thread_previews_fix$;

-- =============================================================================
-- ADD MISSING COLUMNS TO EXISTING TABLES
-- =============================================================================

-- Add session_data column to a2a_session_context table (if it wasn't added before)
DO $session_data_fix$
BEGIN
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
END $session_data_fix$;

-- Fix a2a_thread_preferences table structure
-- The existing table has different columns than expected, so we need to add the missing ones

-- Add thread_id column (aliased to session_id for compatibility)
DO $thread_id_fix$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a2a_thread_preferences' AND column_name = 'thread_id'
    ) THEN
        -- Add thread_id as an alias/copy of session_id
        ALTER TABLE a2a_thread_preferences 
        ADD COLUMN thread_id VARCHAR(255);
        
        -- Update thread_id to match session_id for existing records
        UPDATE a2a_thread_preferences 
        SET thread_id = session_id::VARCHAR;
        
        RAISE NOTICE 'Added thread_id column to a2a_thread_preferences table';
    ELSE
        RAISE NOTICE 'thread_id column already exists in a2a_thread_preferences table';
    END IF;
END $thread_id_fix$;

-- Add preferences column
DO $preferences_fix$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a2a_thread_preferences' AND column_name = 'preferences'
    ) THEN
        ALTER TABLE a2a_thread_preferences 
        ADD COLUMN preferences JSONB DEFAULT '{}';
        
        -- Migrate existing data to preferences column
        UPDATE a2a_thread_preferences 
        SET preferences = jsonb_build_object(
            'is_pinned', COALESCE(is_pinned, false),
            'is_archived', COALESCE(is_archived, false),
            'is_muted', COALESCE(is_muted, false),
            'custom_title', custom_title,
            'custom_avatar_url', custom_avatar_url,
            'notification_settings', COALESCE(notification_settings, '{}'::jsonb),
            'tags', COALESCE(tags, '[]'::jsonb)
        );
        
        RAISE NOTICE 'Added preferences column to a2a_thread_preferences table and migrated data';
    ELSE
        RAISE NOTICE 'preferences column already exists in a2a_thread_preferences table';
    END IF;
END $preferences_fix$;

-- =============================================================================
-- CREATE INDEXES FOR NEW COLUMNS
-- =============================================================================

-- Index for thread_id in a2a_thread_preferences
CREATE INDEX IF NOT EXISTS idx_a2a_thread_preferences_thread_id_new ON a2a_thread_preferences(thread_id);

-- Index for session_data in a2a_session_context
CREATE INDEX IF NOT EXISTS idx_a2a_session_context_session_data ON a2a_session_context USING GIN(session_data);

-- Index for session_id in a2a_agent_interactions
CREATE INDEX IF NOT EXISTS idx_a2a_agent_interactions_session_id ON a2a_agent_interactions(session_id);

-- Index for thread_previews
CREATE INDEX IF NOT EXISTS idx_thread_previews_thread_id ON thread_previews(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_previews_user_id ON thread_previews(user_id);
CREATE INDEX IF NOT EXISTS idx_thread_previews_updated_at ON thread_previews(updated_at DESC);

-- =============================================================================
-- UPDATE FUNCTIONS TO HANDLE NEW STRUCTURE
-- =============================================================================

-- Updated function to get thread preferences (handles both thread_id and session_id)
CREATE OR REPLACE FUNCTION get_a2a_thread_preferences_fixed(
    p_user_id INTEGER,
    p_thread_id VARCHAR(255)
)
RETURNS JSONB AS $get_prefs$
DECLARE
    user_preferences JSONB;
BEGIN
    -- Try to get preferences using thread_id first, then session_id as fallback
    SELECT preferences INTO user_preferences
    FROM a2a_thread_preferences
    WHERE user_id = p_user_id 
    AND (thread_id = p_thread_id OR session_id::VARCHAR = p_thread_id);
    
    RETURN COALESCE(user_preferences, '{}'::JSONB);
END;
$get_prefs$ LANGUAGE plpgsql;

-- Updated function to set thread preferences
CREATE OR REPLACE FUNCTION set_a2a_thread_preferences_fixed(
    p_user_id INTEGER,
    p_thread_id VARCHAR(255),
    p_preferences JSONB
)
RETURNS BOOLEAN AS $set_prefs$
BEGIN
    INSERT INTO a2a_thread_preferences (user_id, session_id, thread_id, preferences)
    VALUES (p_user_id, p_thread_id::INTEGER, p_thread_id, p_preferences)
    ON CONFLICT (user_id, session_id) 
    DO UPDATE SET 
        thread_id = p_thread_id,
        preferences = p_preferences,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$set_prefs$ LANGUAGE plpgsql;

-- Function to update thread preview
CREATE OR REPLACE FUNCTION update_thread_preview(
    p_thread_id INTEGER,
    p_user_id INTEGER,
    p_last_message TEXT
)
RETURNS BOOLEAN AS $update_preview$
BEGIN
    INSERT INTO thread_previews (thread_id, user_id, last_message, last_message_at)
    VALUES (p_thread_id, p_user_id, p_last_message, CURRENT_TIMESTAMP)
    ON CONFLICT (thread_id, user_id)
    DO UPDATE SET
        last_message = p_last_message,
        last_message_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$update_preview$ LANGUAGE plpgsql;

-- =============================================================================
-- CREATE VIEWS FOR COMPATIBILITY
-- =============================================================================

-- View to provide a unified interface for thread preferences
CREATE OR REPLACE VIEW v_a2a_thread_preferences_unified AS
SELECT 
    id,
    user_id,
    COALESCE(thread_id, session_id::VARCHAR) as thread_id,
    session_id,
    preferences,
    created_at,
    updated_at
FROM a2a_thread_preferences;

-- =============================================================================
-- VERIFY FINAL STATE
-- =============================================================================

DO $verification$
DECLARE
    session_data_exists BOOLEAN;
    thread_id_exists BOOLEAN;
    preferences_exists BOOLEAN;
    thread_previews_exists BOOLEAN;
    agent_interactions_session_id_exists BOOLEAN;
BEGIN
    -- Check session_data column
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a2a_session_context' AND column_name = 'session_data'
    ) INTO session_data_exists;
    
    -- Check thread_id column
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a2a_thread_preferences' AND column_name = 'thread_id'
    ) INTO thread_id_exists;
    
    -- Check preferences column
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a2a_thread_preferences' AND column_name = 'preferences'
    ) INTO preferences_exists;
    
    -- Check thread_previews table
    SELECT EXISTS(
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'thread_previews'
    ) INTO thread_previews_exists;
    
    -- Check session_id column in a2a_agent_interactions
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a2a_agent_interactions' AND column_name = 'session_id'
    ) INTO agent_interactions_session_id_exists;
    
    RAISE NOTICE '=== A2A DATABASE SCHEMA FIX VERIFICATION ===';
    RAISE NOTICE 'session_data column in a2a_session_context: %', CASE WHEN session_data_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    RAISE NOTICE 'thread_id column in a2a_thread_preferences: %', CASE WHEN thread_id_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    RAISE NOTICE 'preferences column in a2a_thread_preferences: %', CASE WHEN preferences_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    RAISE NOTICE 'thread_previews table: %', CASE WHEN thread_previews_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    RAISE NOTICE 'session_id column in a2a_agent_interactions: %', CASE WHEN agent_interactions_session_id_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    
    IF session_data_exists AND thread_id_exists AND preferences_exists AND thread_previews_exists AND agent_interactions_session_id_exists THEN
        RAISE NOTICE '🎉 ALL DATABASE SCHEMA FIXES COMPLETED SUCCESSFULLY!';
        RAISE NOTICE 'The persistence manager should now work without errors.';
    ELSE
        RAISE NOTICE '⚠️  Some fixes may have failed - check the individual messages above.';
    END IF;
END $verification$;

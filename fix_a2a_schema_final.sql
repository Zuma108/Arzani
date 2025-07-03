-- CRITICAL: A2A Chat Schema Final Alignment
-- This script fixes all database schema mismatches for Arzani-X integration
-- Run this FIRST before any code changes

-- =============================================================================
-- PHASE 1: Fix a2a_chat_sessions table to match threads.js expectations
-- =============================================================================

-- Add missing columns that threads.js expects
ALTER TABLE a2a_chat_sessions 
ADD COLUMN IF NOT EXISTS title VARCHAR(255),
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0;

-- Migrate existing data
UPDATE a2a_chat_sessions 
SET title = COALESCE(session_name, 'Untitled Chat')
WHERE title IS NULL;

UPDATE a2a_chat_sessions 
SET last_active_at = COALESCE(updated_at, created_at)
WHERE last_active_at IS NULL;

-- =============================================================================
-- PHASE 2: Fix a2a_chat_messages table to match persistence expectations  
-- =============================================================================

-- Ensure content column exists (some tables may have message_content instead)
ALTER TABLE a2a_chat_messages 
ADD COLUMN IF NOT EXISTS content TEXT;

-- Migrate message_content to content if needed
UPDATE a2a_chat_messages 
SET content = message_content 
WHERE content IS NULL AND message_content IS NOT NULL;

-- Ensure sender_type column has proper constraints
ALTER TABLE a2a_chat_messages 
ALTER COLUMN sender_type SET DEFAULT 'user',
ADD CONSTRAINT IF NOT EXISTS check_sender_type 
CHECK (sender_type IN ('user', 'assistant', 'system'));

-- =============================================================================
-- PHASE 3: Create missing related tables that threads.js references
-- =============================================================================

-- a2a_thread_preferences table (for pinning, custom titles, etc.)
CREATE TABLE IF NOT EXISTS a2a_thread_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES a2a_chat_sessions(id) ON DELETE CASCADE,
    custom_title VARCHAR(255),
    is_pinned BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    custom_avatar_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, session_id)
);

-- a2a_thread_analytics table (for message counts, performance tracking)
CREATE TABLE IF NOT EXISTS a2a_thread_analytics (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES a2a_chat_sessions(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    total_messages INTEGER DEFAULT 0,
    last_message_at TIMESTAMP WITH TIME ZONE,
    average_response_time INTEGER DEFAULT 0,
    agent_switches INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_id)
);

-- a2a_thread_cache table (for performance caching as used in threads.js)
CREATE TABLE IF NOT EXISTS a2a_thread_cache (
    id SERIAL PRIMARY KEY,
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    cache_data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- PHASE 4: Create performance indexes
-- =============================================================================

-- Critical indexes for conversation loading performance
CREATE INDEX IF NOT EXISTS idx_a2a_chat_sessions_user_id ON a2a_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_a2a_chat_sessions_last_active ON a2a_chat_sessions(last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_a2a_chat_sessions_is_active ON a2a_chat_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_a2a_chat_sessions_agent_type ON a2a_chat_sessions(agent_type);

-- Message loading performance
CREATE INDEX IF NOT EXISTS idx_a2a_chat_messages_session_id ON a2a_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_a2a_chat_messages_created_at ON a2a_chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_a2a_chat_messages_sender_type ON a2a_chat_messages(sender_type);

-- Related tables indexes
CREATE INDEX IF NOT EXISTS idx_a2a_thread_preferences_user_session ON a2a_thread_preferences(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_a2a_thread_analytics_session ON a2a_thread_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_a2a_thread_cache_key ON a2a_thread_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_a2a_thread_cache_expires ON a2a_thread_cache(expires_at);

-- =============================================================================
-- PHASE 5: Create triggers for automatic maintenance
-- =============================================================================

-- Function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_a2a_chat_sessions_updated_at ON a2a_chat_sessions;
CREATE TRIGGER update_a2a_chat_sessions_updated_at 
    BEFORE UPDATE ON a2a_chat_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_a2a_thread_preferences_updated_at ON a2a_thread_preferences;
CREATE TRIGGER update_a2a_thread_preferences_updated_at 
    BEFORE UPDATE ON a2a_thread_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update thread analytics
CREATE OR REPLACE FUNCTION update_thread_analytics()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO a2a_thread_analytics (session_id, user_id, total_messages, last_message_at)
    SELECT 
        NEW.session_id,
        s.user_id,
        (SELECT COUNT(*) FROM a2a_chat_messages WHERE session_id = NEW.session_id),
        NEW.created_at
    FROM a2a_chat_sessions s
    WHERE s.id = NEW.session_id
    ON CONFLICT (session_id) DO UPDATE SET
        total_messages = EXCLUDED.total_messages,
        last_message_at = EXCLUDED.last_message_at;
        
    -- Also update the session's last_active_at
    UPDATE a2a_chat_sessions 
    SET last_active_at = NEW.created_at
    WHERE id = NEW.session_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply analytics trigger
DROP TRIGGER IF EXISTS update_analytics_on_message ON a2a_chat_messages;
CREATE TRIGGER update_analytics_on_message 
    AFTER INSERT ON a2a_chat_messages 
    FOR EACH ROW EXECUTE FUNCTION update_thread_analytics();

-- =============================================================================
-- PHASE 6: Data validation and cleanup
-- =============================================================================

-- Clean up any inconsistent data
UPDATE a2a_chat_sessions 
SET is_active = true 
WHERE is_active IS NULL;

UPDATE a2a_chat_sessions 
SET unread_count = 0 
WHERE unread_count IS NULL;

-- Initialize analytics for existing sessions
INSERT INTO a2a_thread_analytics (session_id, user_id, total_messages, last_message_at)
SELECT 
    s.id,
    s.user_id,
    COALESCE(msg_count.total, 0),
    msg_count.last_message
FROM a2a_chat_sessions s
LEFT JOIN (
    SELECT 
        session_id,
        COUNT(*) as total,
        MAX(created_at) as last_message
    FROM a2a_chat_messages 
    GROUP BY session_id
) msg_count ON s.id = msg_count.session_id
WHERE NOT EXISTS (
    SELECT 1 FROM a2a_thread_analytics WHERE session_id = s.id
);

-- =============================================================================
-- PHASE 7: Verification queries
-- =============================================================================

-- Verify all expected tables exist
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name LIKE 'a2a_%'
ORDER BY table_name;

-- Verify a2a_chat_sessions has all required columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'a2a_chat_sessions' 
ORDER BY ordinal_position;

-- Check recent data integrity
SELECT 
    s.id,
    s.title,
    s.last_active_at,
    s.unread_count,
    a.total_messages
FROM a2a_chat_sessions s
LEFT JOIN a2a_thread_analytics a ON s.id = a.session_id
WHERE s.created_at > NOW() - INTERVAL '7 days'
ORDER BY s.last_active_at DESC
LIMIT 10;

-- =============================================================================
-- SUCCESS CONFIRMATION
-- =============================================================================

-- This should return no errors if schema is properly aligned
DO $$
DECLARE
    missing_tables TEXT[] := ARRAY[]::TEXT[];
    missing_columns TEXT[] := ARRAY[]::TEXT[];
    table_name TEXT;
    column_name TEXT;
BEGIN
    -- Check required tables
    FOR table_name IN 
        SELECT unnest(ARRAY['a2a_chat_sessions', 'a2a_chat_messages', 'a2a_thread_preferences', 'a2a_thread_analytics', 'a2a_thread_cache'])
    LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name) THEN
            missing_tables := array_append(missing_tables, table_name);
        END IF;
    END LOOP;
    
    -- Check required columns in a2a_chat_sessions
    FOR column_name IN 
        SELECT unnest(ARRAY['id', 'user_id', 'title', 'session_name', 'agent_type', 'last_active_at', 'is_pinned', 'unread_count', 'is_active'])
    LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'a2a_chat_sessions' AND column_name = column_name) THEN
            missing_columns := array_append(missing_columns, 'a2a_chat_sessions.' || column_name);
        END IF;
    END LOOP;
    
    -- Report results
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE NOTICE 'ERROR: Missing tables: %', array_to_string(missing_tables, ', ');
    END IF;
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE NOTICE 'ERROR: Missing columns: %', array_to_string(missing_columns, ', ');
    END IF;
    
    IF array_length(missing_tables, 1) IS NULL AND array_length(missing_columns, 1) IS NULL THEN
        RAISE NOTICE 'SUCCESS: All required schema elements are present!';
        RAISE NOTICE 'Arzani-X database schema is now properly aligned.';
    END IF;
END $$;

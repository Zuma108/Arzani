-- A2A Threads Enhancement SQL
-- This script extends the existing A2A database schema to support the /api/threads endpoint
-- with conversation threading, pinning, and metadata features

-- ==============================================================================
-- 1. EXTEND EXISTING TABLES
-- ==============================================================================

-- Add thread-specific columns to a2a_chat_sessions
ALTER TABLE a2a_chat_sessions 
ADD COLUMN IF NOT EXISTS title VARCHAR(255),
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS thread_metadata JSONB DEFAULT '{}';

-- Update title for existing sessions that don't have one
UPDATE a2a_chat_sessions 
SET title = session_name 
WHERE title IS NULL AND session_name IS NOT NULL;

-- Update last_active_at for existing sessions
UPDATE a2a_chat_sessions 
SET last_active_at = updated_at 
WHERE last_active_at IS NULL;

-- ==============================================================================
-- 2. CREATE THREAD PREFERENCES TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS a2a_thread_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    session_id INTEGER NOT NULL REFERENCES a2a_chat_sessions(id) ON DELETE CASCADE,
    is_pinned BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    is_muted BOOLEAN DEFAULT false,
    custom_title VARCHAR(255),
    custom_avatar_url TEXT,
    notification_settings JSONB DEFAULT '{"enabled": true, "sound": true, "desktop": true}',
    tags JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, session_id)
);

-- ==============================================================================
-- 3. CREATE THREAD ANALYTICS TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS a2a_thread_analytics (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES a2a_chat_sessions(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,
    total_messages INTEGER DEFAULT 0,
    user_messages INTEGER DEFAULT 0,
    agent_messages INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    avg_response_time_ms INTEGER DEFAULT 0,
    first_message_at TIMESTAMP WITH TIME ZONE,
    last_message_at TIMESTAMP WITH TIME ZONE,
    agents_involved JSONB DEFAULT '[]',
    task_count INTEGER DEFAULT 0,
    file_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(session_id, user_id)
);

-- ==============================================================================
-- 4. CREATE THREAD CACHE TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS a2a_thread_cache (
    id SERIAL PRIMARY KEY,
    cache_key VARCHAR(255) NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    cache_data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_a2a_thread_cache_key_user ON a2a_thread_cache(cache_key, user_id);
CREATE INDEX IF NOT EXISTS idx_a2a_thread_cache_expires ON a2a_thread_cache(expires_at);

-- ==============================================================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- ==============================================================================

-- Indexes for a2a_chat_sessions
CREATE INDEX IF NOT EXISTS idx_a2a_chat_sessions_user_active 
ON a2a_chat_sessions(user_id, is_active, last_active_at DESC);

CREATE INDEX IF NOT EXISTS idx_a2a_chat_sessions_user_pinned 
ON a2a_chat_sessions(user_id, is_pinned, last_active_at DESC);

CREATE INDEX IF NOT EXISTS idx_a2a_chat_sessions_last_active 
ON a2a_chat_sessions(last_active_at DESC);

-- Indexes for a2a_thread_preferences
CREATE INDEX IF NOT EXISTS idx_a2a_thread_preferences_user 
ON a2a_thread_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_a2a_thread_preferences_pinned 
ON a2a_thread_preferences(user_id, is_pinned);

-- Indexes for a2a_thread_analytics
CREATE INDEX IF NOT EXISTS idx_a2a_thread_analytics_session 
ON a2a_thread_analytics(session_id);

CREATE INDEX IF NOT EXISTS idx_a2a_thread_analytics_user 
ON a2a_thread_analytics(user_id);

-- ==============================================================================
-- 6. CREATE TRIGGERS FOR AUTOMATIC UPDATES
-- ==============================================================================

-- Function to update last_active_at when messages are added
CREATE OR REPLACE FUNCTION update_session_last_active()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE a2a_chat_sessions 
    SET last_active_at = NEW.created_at,
        updated_at = NEW.created_at
    WHERE id = NEW.session_id;
    
    -- Update analytics
    INSERT INTO a2a_thread_analytics (session_id, user_id, total_messages, last_message_at)
    SELECT 
        NEW.session_id,
        cs.user_id,
        1,
        NEW.created_at
    FROM a2a_chat_sessions cs 
    WHERE cs.id = NEW.session_id
    ON CONFLICT (session_id, user_id) 
    DO UPDATE SET 
        total_messages = a2a_thread_analytics.total_messages + 1,
        last_message_at = NEW.created_at,
        user_messages = CASE WHEN NEW.sender_type = 'user' 
                       THEN a2a_thread_analytics.user_messages + 1 
                       ELSE a2a_thread_analytics.user_messages END,
        agent_messages = CASE WHEN NEW.sender_type = 'agent' 
                        THEN a2a_thread_analytics.agent_messages + 1 
                        ELSE a2a_thread_analytics.agent_messages END,
        updated_at = NEW.created_at;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for a2a_chat_messages
DROP TRIGGER IF EXISTS trigger_update_session_last_active ON a2a_chat_messages;
CREATE TRIGGER trigger_update_session_last_active
    AFTER INSERT ON a2a_chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_session_last_active();

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM a2a_thread_cache WHERE expires_at < now();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 7. CREATE VIEW FOR THREADS API
-- ==============================================================================

CREATE OR REPLACE VIEW v_a2a_threads AS
SELECT 
    cs.id,
    cs.user_id,
    COALESCE(tp.custom_title, cs.title, cs.session_name, 'Untitled Conversation') as title,
    cs.last_active_at,
    COALESCE(tp.is_pinned, cs.is_pinned, false) as is_pinned,
    COALESCE(tp.custom_avatar_url, cs.avatar_url) as avatar_url,
    cs.unread_count,
    cs.is_active,
    cs.agent_type,
    cs.created_at,
    cs.updated_at,
    -- Analytics data
    COALESCE(ta.total_messages, 0) as message_count,
    COALESCE(ta.user_messages, 0) as user_message_count,
    COALESCE(ta.agent_messages, 0) as agent_message_count,
    COALESCE(ta.total_tokens, 0) as total_tokens,
    COALESCE(ta.agents_involved, '[]'::jsonb) as agents_involved,
    COALESCE(ta.task_count, 0) as task_count,
    COALESCE(ta.file_count, 0) as file_count,
    ta.first_message_at,
    ta.last_message_at,
    -- Preferences
    COALESCE(tp.is_archived, false) as is_archived,
    COALESCE(tp.is_muted, false) as is_muted,
    COALESCE(tp.tags, '[]'::jsonb) as tags,
    COALESCE(tp.notification_settings, '{"enabled": true, "sound": true, "desktop": true}'::jsonb) as notification_settings,
    -- Enhanced metadata
    jsonb_build_object(
        'session_metadata', cs.metadata,
        'thread_metadata', cs.thread_metadata,
        'agent_type', cs.agent_type,
        'analytics', jsonb_build_object(
            'total_messages', COALESCE(ta.total_messages, 0),
            'avg_response_time_ms', COALESCE(ta.avg_response_time_ms, 0),
            'agents_involved', COALESCE(ta.agents_involved, '[]'::jsonb)
        )
    ) as metadata
FROM a2a_chat_sessions cs
LEFT JOIN a2a_thread_preferences tp ON cs.id = tp.session_id AND cs.user_id = tp.user_id
LEFT JOIN a2a_thread_analytics ta ON cs.id = ta.session_id AND cs.user_id = ta.user_id
WHERE cs.is_active = true;

-- ==============================================================================
-- 8. HELPER FUNCTIONS FOR THREADS API
-- ==============================================================================

-- Function to get threads with bucket partitioning
CREATE OR REPLACE FUNCTION get_user_threads_bucketed(
    p_user_id INTEGER,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    pinned_threads JSONB;
    today_threads JSONB;
    yesterday_threads JSONB;
    last7days_threads JSONB;
    older_threads JSONB;
    today_start TIMESTAMP WITH TIME ZONE;
    yesterday_start TIMESTAMP WITH TIME ZONE;
    week_start TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calculate time boundaries
    today_start := date_trunc('day', now());
    yesterday_start := today_start - interval '1 day';
    week_start := today_start - interval '7 days';
    
    -- Get pinned threads
    SELECT jsonb_agg(to_jsonb(t)) INTO pinned_threads
    FROM (
        SELECT * FROM v_a2a_threads 
        WHERE user_id = p_user_id AND is_pinned = true AND is_archived = false
        ORDER BY last_active_at DESC
        LIMIT p_limit OFFSET p_offset
    ) t;
    
    -- Get today's threads (non-pinned)
    SELECT jsonb_agg(to_jsonb(t)) INTO today_threads
    FROM (
        SELECT * FROM v_a2a_threads 
        WHERE user_id = p_user_id 
        AND is_pinned = false 
        AND is_archived = false
        AND last_active_at >= today_start
        ORDER BY last_active_at DESC
        LIMIT p_limit OFFSET p_offset
    ) t;
    
    -- Get yesterday's threads (non-pinned)
    SELECT jsonb_agg(to_jsonb(t)) INTO yesterday_threads
    FROM (
        SELECT * FROM v_a2a_threads 
        WHERE user_id = p_user_id 
        AND is_pinned = false 
        AND is_archived = false
        AND last_active_at >= yesterday_start 
        AND last_active_at < today_start
        ORDER BY last_active_at DESC
        LIMIT p_limit OFFSET p_offset
    ) t;
    
    -- Get last 7 days threads (non-pinned)
    SELECT jsonb_agg(to_jsonb(t)) INTO last7days_threads
    FROM (
        SELECT * FROM v_a2a_threads 
        WHERE user_id = p_user_id 
        AND is_pinned = false 
        AND is_archived = false
        AND last_active_at >= week_start 
        AND last_active_at < yesterday_start
        ORDER BY last_active_at DESC
        LIMIT p_limit OFFSET p_offset
    ) t;
    
    -- Get older threads (non-pinned)
    SELECT jsonb_agg(to_jsonb(t)) INTO older_threads
    FROM (
        SELECT * FROM v_a2a_threads 
        WHERE user_id = p_user_id 
        AND is_pinned = false 
        AND is_archived = false
        AND last_active_at < week_start
        ORDER BY last_active_at DESC
        LIMIT p_limit OFFSET p_offset
    ) t;
    
    -- Build result
    result := jsonb_build_object(
        'pinned', COALESCE(pinned_threads, '[]'::jsonb),
        'today', COALESCE(today_threads, '[]'::jsonb),
        'yesterday', COALESCE(yesterday_threads, '[]'::jsonb),
        'last7Days', COALESCE(last7days_threads, '[]'::jsonb),
        'older', COALESCE(older_threads, '[]'::jsonb),
        'metadata', jsonb_build_object(
            'totalCount', (
                SELECT count(*) FROM v_a2a_threads 
                WHERE user_id = p_user_id AND is_archived = false
            ),
            'pinnedCount', (
                SELECT count(*) FROM v_a2a_threads 
                WHERE user_id = p_user_id AND is_pinned = true AND is_archived = false
            ),
            'todayCount', (
                SELECT count(*) FROM v_a2a_threads 
                WHERE user_id = p_user_id AND is_pinned = false AND is_archived = false
                AND last_active_at >= today_start
            ),
            'yesterdayCount', (
                SELECT count(*) FROM v_a2a_threads 
                WHERE user_id = p_user_id AND is_pinned = false AND is_archived = false
                AND last_active_at >= yesterday_start AND last_active_at < today_start
            ),
            'last7DaysCount', (
                SELECT count(*) FROM v_a2a_threads 
                WHERE user_id = p_user_id AND is_pinned = false AND is_archived = false
                AND last_active_at >= week_start AND last_active_at < yesterday_start
            ),
            'olderCount', (
                SELECT count(*) FROM v_a2a_threads 
                WHERE user_id = p_user_id AND is_pinned = false AND is_archived = false
                AND last_active_at < week_start
            ),
            'limit', p_limit,
            'offset', p_offset,
            'generatedAt', now()
        )
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to cache thread results
CREATE OR REPLACE FUNCTION cache_thread_results(
    p_cache_key VARCHAR(255),
    p_user_id INTEGER,
    p_data JSONB,
    p_ttl_seconds INTEGER DEFAULT 30
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO a2a_thread_cache (cache_key, user_id, cache_data, expires_at)
    VALUES (p_cache_key, p_user_id, p_data, now() + (p_ttl_seconds || ' seconds')::interval)
    ON CONFLICT (cache_key) 
    DO UPDATE SET 
        cache_data = p_data,
        expires_at = now() + (p_ttl_seconds || ' seconds')::interval,
        created_at = now();
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to get cached thread results
CREATE OR REPLACE FUNCTION get_cached_thread_results(
    p_cache_key VARCHAR(255),
    p_user_id INTEGER
)
RETURNS JSONB AS $$
DECLARE
    cached_data JSONB;
BEGIN
    SELECT cache_data INTO cached_data
    FROM a2a_thread_cache
    WHERE cache_key = p_cache_key 
    AND user_id = p_user_id 
    AND expires_at > now();
    
    RETURN cached_data;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 9. SAMPLE DATA (for testing)
-- ==============================================================================

-- Insert sample thread preferences for existing sessions
INSERT INTO a2a_thread_preferences (user_id, session_id, is_pinned, custom_title)
SELECT 
    user_id, 
    id, 
    (random() > 0.8)::boolean, -- 20% chance of being pinned
    CASE 
        WHEN random() > 0.5 THEN 'Custom: ' || session_name
        ELSE NULL
    END
FROM a2a_chat_sessions 
WHERE user_id IS NOT NULL
ON CONFLICT (user_id, session_id) DO NOTHING;

-- Update analytics for existing sessions
INSERT INTO a2a_thread_analytics (session_id, user_id, total_messages, user_messages, agent_messages, first_message_at, last_message_at)
SELECT 
    cm.session_id,
    cs.user_id,
    COUNT(*) as total_messages,
    COUNT(CASE WHEN cm.sender_type = 'user' THEN 1 END) as user_messages,
    COUNT(CASE WHEN cm.sender_type = 'agent' THEN 1 END) as agent_messages,
    MIN(cm.created_at) as first_message_at,
    MAX(cm.created_at) as last_message_at
FROM a2a_chat_messages cm
JOIN a2a_chat_sessions cs ON cm.session_id = cs.id
WHERE cs.user_id IS NOT NULL
GROUP BY cm.session_id, cs.user_id
ON CONFLICT (session_id, user_id) DO UPDATE SET
    total_messages = EXCLUDED.total_messages,
    user_messages = EXCLUDED.user_messages,
    agent_messages = EXCLUDED.agent_messages,
    first_message_at = EXCLUDED.first_message_at,
    last_message_at = EXCLUDED.last_message_at,
    updated_at = now();

-- ==============================================================================
-- 10. CLEANUP AND MAINTENANCE
-- ==============================================================================

-- Schedule periodic cache cleanup (run this as a cron job or scheduled task)
-- SELECT clean_expired_cache();

-- Performance monitoring query
-- SELECT 
--     'a2a_chat_sessions' as table_name,
--     pg_size_pretty(pg_total_relation_size('a2a_chat_sessions')) as size,
--     count(*) as rows
-- FROM a2a_chat_sessions
-- UNION ALL
-- SELECT 
--     'a2a_thread_cache' as table_name,
--     pg_size_pretty(pg_total_relation_size('a2a_thread_cache')) as size,
--     count(*) as rows
-- FROM a2a_thread_cache;

-- ==============================================================================
-- SCRIPT COMPLETE
-- ==============================================================================
-- This script enhances the A2A database to support advanced thread management
-- Features added:
-- 1. Extended session metadata (title, pinning, avatar, unread count)
-- 2. Thread preferences per user
-- 3. Thread analytics and performance tracking
-- 4. Caching system with automatic expiration
-- 5. Bucketed thread retrieval function
-- 6. Automatic triggers for real-time updates
-- 7. Comprehensive indexing for performance
-- 8. View for easy thread API access
-- 
-- Usage:
-- - Run this script against your existing A2A database
-- - Use get_user_threads_bucketed() function in your API endpoint
-- - Implement cache_thread_results() and get_cached_thread_results() in your app
-- ==============================================================================
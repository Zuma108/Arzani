-- Enhanced database setup for modern chat threads UI
-- Run this in PG Admin to ensure optimal performance and missing constraints

-- Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_a2a_chat_sessions_user_active 
ON a2a_chat_sessions(user_id, is_active, last_active_at DESC);

CREATE INDEX IF NOT EXISTS idx_a2a_chat_sessions_last_active 
ON a2a_chat_sessions(last_active_at DESC) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_a2a_thread_preferences_user_session 
ON a2a_thread_preferences(user_id, session_id);

CREATE INDEX IF NOT EXISTS idx_a2a_thread_analytics_session 
ON a2a_thread_analytics(session_id);

CREATE INDEX IF NOT EXISTS idx_a2a_chat_messages_session_order 
ON a2a_chat_messages(session_id, message_order);

-- Add unique constraints if they don't exist
ALTER TABLE a2a_thread_preferences 
ADD CONSTRAINT unique_user_session_prefs 
UNIQUE (user_id, session_id);

-- Create cache table for thread data if it doesn't exist
CREATE TABLE IF NOT EXISTS a2a_thread_cache (
  id SERIAL PRIMARY KEY,
  cache_key VARCHAR(255) NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  cache_data JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_a2a_thread_cache_key_expires 
ON a2a_thread_cache(cache_key, expires_at);

CREATE INDEX IF NOT EXISTS idx_a2a_thread_cache_user_expires 
ON a2a_thread_cache(user_id, expires_at);

-- Update any NULL last_active_at with updated_at or created_at
UPDATE a2a_chat_sessions 
SET last_active_at = COALESCE(updated_at, created_at)
WHERE last_active_at IS NULL AND is_active = true;

-- Ensure default values for important fields
UPDATE a2a_chat_sessions 
SET is_active = true 
WHERE is_active IS NULL;

UPDATE a2a_chat_sessions 
SET unread_count = 0 
WHERE unread_count IS NULL;

-- Add triggers to automatically update last_active_at when messages are added
CREATE OR REPLACE FUNCTION update_session_last_active()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE a2a_chat_sessions 
  SET last_active_at = NOW(), updated_at = NOW()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_session_last_active ON a2a_chat_messages;
CREATE TRIGGER trigger_update_session_last_active
  AFTER INSERT ON a2a_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_session_last_active();

-- Create function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_thread_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM a2a_thread_cache 
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Sample data for testing (optional - only run if you want test data)
/*
INSERT INTO a2a_chat_sessions (
  user_id, session_name, title, agent_type, created_at, updated_at, last_active_at, is_active, unread_count, is_pinned
) VALUES 
  (1, 'Finance Planning', 'My Investment Portfolio', 'finance', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour', true, 2, true),
  (1, 'Legal Consultation', 'Contract Review Help', 'legal', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', true, 0, false),
  (1, 'Property Search', 'Finding a New Home', 'broker', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', true, 1, false),
  (1, 'General Chat', 'Questions about services', 'orchestrator', NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week', true, 0, false),
  (1, 'Tax Questions', 'Year-end tax planning', 'finance', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '15 minutes', true, 3, false)
ON CONFLICT DO NOTHING;
*/

-- Verification queries to check the setup
/*
-- Check indexes
SELECT schemaname, tablename, indexname, indexdef 
FROM pg_indexes 
WHERE tablename LIKE 'a2a_%' 
ORDER BY tablename, indexname;

-- Check constraints
SELECT conname, contype, conrelid::regclass AS table_name, confrelid::regclass AS foreign_table
FROM pg_constraint 
WHERE conrelid::regclass::text LIKE 'a2a_%'
ORDER BY table_name;

-- Test the thread fetching query
SELECT 
  s.id,
  COALESCE(tp.custom_title, s.title, s.session_name, 'Untitled Chat') as title,
  COALESCE(s.last_active_at, s.updated_at, s.created_at) as last_active_at,
  COALESCE(tp.is_pinned, s.is_pinned, false) as is_pinned,
  s.agent_type,
  s.unread_count
FROM a2a_chat_sessions s
LEFT JOIN a2a_thread_preferences tp ON s.id = tp.session_id AND tp.user_id = 1
WHERE s.user_id = 1 AND s.is_active = true
ORDER BY 
  CASE WHEN COALESCE(tp.is_pinned, s.is_pinned, false) THEN 0 ELSE 1 END,
  COALESCE(s.last_active_at, s.updated_at, s.created_at) DESC;
*/

-- Performance monitoring query
/*
SELECT 
  'a2a_chat_sessions' as table_name,
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE is_active = true) as active_sessions,
  COUNT(*) FILTER (WHERE is_pinned = true) as pinned_sessions
FROM a2a_chat_sessions
UNION ALL
SELECT 
  'a2a_thread_preferences' as table_name,
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE is_pinned = true) as pinned_preferences,
  COUNT(*) FILTER (WHERE is_archived = true) as archived_preferences
FROM a2a_thread_preferences;
*/

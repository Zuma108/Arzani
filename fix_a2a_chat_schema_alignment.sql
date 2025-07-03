-- A2A Chat Tables Schema Alignment
-- This script ensures all A2A chat tables match the expectations from the frontend code
-- Run this in PostgreSQL to fix schema mismatches

-- First, let's check what tables currently exist
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name LIKE 'a2a_%'
ORDER BY table_name;

-- Check a2a_chat_sessions schema
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'a2a_chat_sessions' 
ORDER BY ordinal_position;

-- Fix a2a_chat_sessions table to match threads.js expectations
ALTER TABLE a2a_chat_sessions 
ADD COLUMN IF NOT EXISTS title VARCHAR(255),
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0;

-- Update existing records to have proper title
UPDATE a2a_chat_sessions 
SET title = COALESCE(session_name, 'Untitled Chat')
WHERE title IS NULL;

-- Update last_active_at for existing records
UPDATE a2a_chat_sessions 
SET last_active_at = COALESCE(updated_at, created_at)
WHERE last_active_at IS NULL;

-- Check a2a_chat_messages schema
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'a2a_chat_messages' 
ORDER BY ordinal_position;

-- Fix a2a_chat_messages table to match expected schema
ALTER TABLE a2a_chat_messages 
ADD COLUMN IF NOT EXISTS content TEXT,
ADD COLUMN IF NOT EXISTS sender_type VARCHAR(20) DEFAULT 'user';

-- Migrate message_content to content if needed
UPDATE a2a_chat_messages 
SET content = message_content 
WHERE content IS NULL AND message_content IS NOT NULL;

-- Create missing tables that are referenced in the code

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

-- a2a_thread_analytics table (for message counts, etc.)
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

-- a2a_thread_cache table (for performance caching)
CREATE TABLE IF NOT EXISTS a2a_thread_cache (
    id SERIAL PRIMARY KEY,
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    cache_data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_a2a_chat_sessions_user_id ON a2a_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_a2a_chat_sessions_last_active ON a2a_chat_sessions(last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_a2a_chat_sessions_is_active ON a2a_chat_sessions(is_active);

CREATE INDEX IF NOT EXISTS idx_a2a_chat_messages_session_id ON a2a_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_a2a_chat_messages_created_at ON a2a_chat_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_a2a_thread_preferences_user_session ON a2a_thread_preferences(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_a2a_thread_analytics_session ON a2a_thread_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_a2a_thread_cache_key ON a2a_thread_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_a2a_thread_cache_expires ON a2a_thread_cache(expires_at);

-- Add triggers for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_a2a_chat_sessions_updated_at 
    BEFORE UPDATE ON a2a_chat_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_a2a_thread_preferences_updated_at 
    BEFORE UPDATE ON a2a_thread_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update thread analytics automatically
CREATE OR REPLACE FUNCTION update_thread_analytics()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO a2a_thread_analytics (session_id, user_id, total_messages, last_message_at)
    SELECT 
        NEW.session_id,
        s.user_id,
        COUNT(*),
        MAX(NEW.created_at)
    FROM a2a_chat_sessions s
    WHERE s.id = NEW.session_id
    ON CONFLICT (session_id) DO UPDATE SET
        total_messages = EXCLUDED.total_messages,
        last_message_at = EXCLUDED.last_message_at;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_analytics_on_message 
    AFTER INSERT ON a2a_chat_messages 
    FOR EACH ROW EXECUTE FUNCTION update_thread_analytics();

-- Verify all tables and columns exist
SELECT 
    table_name,
    COUNT(*) as column_count,
    array_agg(column_name ORDER BY ordinal_position) as columns
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name LIKE 'a2a_%'
GROUP BY table_name
ORDER BY table_name;

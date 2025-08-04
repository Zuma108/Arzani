-- A2A Chat History Migration - Fixed Version
-- This creates tables specifically for A2A chat history with database persistence
-- Run this in pgAdmin to create the necessary tables

-- Drop tables if they exist (in reverse dependency order) - UNCOMMENT ONLY IF YOU WANT TO RECREATE TABLES
-- DROP TABLE IF EXISTS a2a_file_uploads CASCADE;
-- DROP TABLE IF EXISTS a2a_agent_transitions CASCADE;
-- DROP TABLE IF EXISTS a2a_chat_messages CASCADE;
-- DROP TABLE IF EXISTS a2a_chat_sessions CASCADE;

-- Create A2A chat sessions table FIRST (no dependencies)
CREATE TABLE IF NOT EXISTS a2a_chat_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER, -- Will add foreign key after confirming users table exists
    session_name VARCHAR(255) DEFAULT 'Untitled Session',
    agent_type VARCHAR(50) NOT NULL DEFAULT 'orchestrator', -- orchestrator, broker, legal, finance
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}' -- Store additional session data
);

-- Create A2A chat messages table SECOND (depends on sessions)
CREATE TABLE IF NOT EXISTS a2a_chat_messages (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL,
    message_content TEXT NOT NULL,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('user', 'assistant', 'system')),
    agent_type VARCHAR(50), -- Which agent sent this message (for assistant messages)
    task_id VARCHAR(255), -- A2A protocol task ID if applicable
    message_order INTEGER NOT NULL, -- Order within the session
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}', -- Store additional message data like file attachments, etc.
    FOREIGN KEY (session_id) REFERENCES a2a_chat_sessions(id) ON DELETE CASCADE
);

-- Create A2A agent transitions table THIRD (depends on sessions and messages)
CREATE TABLE IF NOT EXISTS a2a_agent_transitions (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL,
    from_agent VARCHAR(50) NOT NULL,
    to_agent VARCHAR(50) NOT NULL,
    transition_reason TEXT,
    message_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (session_id) REFERENCES a2a_chat_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (message_id) REFERENCES a2a_chat_messages(id) ON DELETE SET NULL
);

-- Create A2A file uploads table FOURTH (depends on sessions and messages)
CREATE TABLE IF NOT EXISTS a2a_file_uploads (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL,
    message_id INTEGER,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,
    upload_status VARCHAR(20) DEFAULT 'completed' CHECK (upload_status IN ('uploading', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (session_id) REFERENCES a2a_chat_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (message_id) REFERENCES a2a_chat_messages(id) ON DELETE CASCADE
);

-- Add foreign key for user_id if users table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'a2a_chat_sessions_user_id_fkey'
        ) THEN
            ALTER TABLE a2a_chat_sessions 
            ADD CONSTRAINT a2a_chat_sessions_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_a2a_chat_sessions_user_id ON a2a_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_a2a_chat_sessions_created_at ON a2a_chat_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_a2a_chat_sessions_agent_type ON a2a_chat_sessions(agent_type);
CREATE INDEX IF NOT EXISTS idx_a2a_chat_sessions_active ON a2a_chat_sessions(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_a2a_chat_messages_session_id ON a2a_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_a2a_chat_messages_order ON a2a_chat_messages(session_id, message_order);
CREATE INDEX IF NOT EXISTS idx_a2a_chat_messages_created_at ON a2a_chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_a2a_chat_messages_sender_type ON a2a_chat_messages(sender_type);
CREATE INDEX IF NOT EXISTS idx_a2a_chat_messages_agent_type ON a2a_chat_messages(agent_type) WHERE agent_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_a2a_agent_transitions_session_id ON a2a_agent_transitions(session_id);
CREATE INDEX IF NOT EXISTS idx_a2a_agent_transitions_created_at ON a2a_agent_transitions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_a2a_agent_transitions_agents ON a2a_agent_transitions(from_agent, to_agent);

CREATE INDEX IF NOT EXISTS idx_a2a_file_uploads_session_id ON a2a_file_uploads(session_id);
CREATE INDEX IF NOT EXISTS idx_a2a_file_uploads_message_id ON a2a_file_uploads(message_id);
CREATE INDEX IF NOT EXISTS idx_a2a_file_uploads_status ON a2a_file_uploads(upload_status);

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION update_a2a_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_a2a_session_updated_at ON a2a_chat_sessions;
CREATE TRIGGER trigger_update_a2a_session_updated_at
    BEFORE UPDATE ON a2a_chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_a2a_session_updated_at();

-- Verify table creation
SELECT 
    schemaname,
    tablename,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE tablename LIKE 'a2a_%'
ORDER BY tablename;

-- Show table dependencies
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name LIKE 'a2a_%'
ORDER BY tc.table_name, tc.constraint_name;

-- Add table comments
COMMENT ON TABLE a2a_chat_sessions IS 'Stores A2A chat sessions with agent tracking and user associations';
COMMENT ON TABLE a2a_chat_messages IS 'Stores individual messages within A2A chat sessions with proper ordering';
COMMENT ON TABLE a2a_agent_transitions IS 'Tracks agent handoffs during conversations for analytics and debugging';
COMMENT ON TABLE a2a_file_uploads IS 'Tracks files uploaded during A2A chat sessions with status monitoring';

-- Add column comments for clarity
COMMENT ON COLUMN a2a_chat_sessions.agent_type IS 'Current or primary agent handling this session';
COMMENT ON COLUMN a2a_chat_sessions.metadata IS 'JSON metadata for session context, settings, and custom data';
COMMENT ON COLUMN a2a_chat_messages.message_order IS 'Sequential order of messages within a session for proper chronology';
COMMENT ON COLUMN a2a_chat_messages.task_id IS 'A2A protocol task identifier for tracking distributed task execution';
COMMENT ON COLUMN a2a_agent_transitions.transition_reason IS 'Human-readable reason for agent handoff for analysis and debugging';

-- Success message
SELECT 'A2A Chat History tables created successfully!' as status,
       COUNT(*) as tables_created
FROM information_schema.tables 
WHERE table_name LIKE 'a2a_%';

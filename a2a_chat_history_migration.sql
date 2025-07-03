-- A2A Chat History Migration
-- This creates tables specifically for A2A chat history with database persistence
-- Run this in pgAdmin to create the necessary tables

-- Create A2A chat sessions table
CREATE TABLE IF NOT EXISTS a2a_chat_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_name VARCHAR(255) DEFAULT 'Untitled Session',
    agent_type VARCHAR(50) NOT NULL DEFAULT 'orchestrator', -- orchestrator, broker, legal, finance
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}' -- Store additional session data
);

-- Create A2A chat messages table
CREATE TABLE IF NOT EXISTS a2a_chat_messages (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES a2a_chat_sessions(id) ON DELETE CASCADE,
    message_content TEXT NOT NULL,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('user', 'assistant', 'system')),
    agent_type VARCHAR(50), -- Which agent sent this message (for assistant messages)
    task_id VARCHAR(255), -- A2A protocol task ID if applicable
    message_order INTEGER NOT NULL, -- Order within the session
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}' -- Store additional message data like file attachments, etc.
);

-- Create A2A agent transitions table (for tracking agent handoffs)
CREATE TABLE IF NOT EXISTS a2a_agent_transitions (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES a2a_chat_sessions(id) ON DELETE CASCADE,
    from_agent VARCHAR(50) NOT NULL,
    to_agent VARCHAR(50) NOT NULL,
    transition_reason TEXT,
    message_id INTEGER REFERENCES a2a_chat_messages(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create A2A file uploads table (for tracking files uploaded in A2A chats)
CREATE TABLE IF NOT EXISTS a2a_file_uploads (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES a2a_chat_sessions(id) ON DELETE CASCADE,
    message_id INTEGER, -- Will add foreign key constraint after a2a_chat_messages table is confirmed to exist
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,
    upload_status VARCHAR(20) DEFAULT 'completed' CHECK (upload_status IN ('uploading', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint for message_id after ensuring a2a_chat_messages table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'a2a_chat_messages') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'a2a_file_uploads_message_id_fkey'
        ) THEN
            ALTER TABLE a2a_file_uploads 
            ADD CONSTRAINT a2a_file_uploads_message_id_fkey 
            FOREIGN KEY (message_id) REFERENCES a2a_chat_messages(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_a2a_chat_sessions_user_id ON a2a_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_a2a_chat_sessions_created_at ON a2a_chat_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_a2a_chat_sessions_agent_type ON a2a_chat_sessions(agent_type);

CREATE INDEX IF NOT EXISTS idx_a2a_chat_messages_session_id ON a2a_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_a2a_chat_messages_order ON a2a_chat_messages(session_id, message_order);
CREATE INDEX IF NOT EXISTS idx_a2a_chat_messages_created_at ON a2a_chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_a2a_chat_messages_sender_type ON a2a_chat_messages(sender_type);

CREATE INDEX IF NOT EXISTS idx_a2a_agent_transitions_session_id ON a2a_agent_transitions(session_id);
CREATE INDEX IF NOT EXISTS idx_a2a_agent_transitions_created_at ON a2a_agent_transitions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_a2a_file_uploads_session_id ON a2a_file_uploads(session_id);
CREATE INDEX IF NOT EXISTS idx_a2a_file_uploads_message_id ON a2a_file_uploads(message_id);

-- Create trigger to update updated_at timestamp on a2a_chat_sessions
CREATE OR REPLACE FUNCTION update_a2a_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_a2a_session_updated_at
    BEFORE UPDATE ON a2a_chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_a2a_session_updated_at();

-- Insert some sample data for testing (optional)
-- Uncomment the following lines if you want to add test data

/*
-- Sample user (assuming you have a users table)
INSERT INTO a2a_chat_sessions (user_id, session_name, agent_type, metadata) 
VALUES 
    (1, 'Business Valuation Discussion', 'finance', '{"initial_agent": "orchestrator", "total_transitions": 2}'),
    (1, 'Legal Document Review', 'legal', '{"initial_agent": "orchestrator", "total_transitions": 1}'),
    (1, 'Market Analysis Chat', 'broker', '{"initial_agent": "broker", "total_transitions": 0}');

-- Sample messages
INSERT INTO a2a_chat_messages (session_id, message_content, sender_type, agent_type, message_order, metadata)
VALUES 
    (1, 'I need help with valuing my restaurant business', 'user', NULL, 1, '{}'),
    (1, 'I can help you with business valuation. Let me transfer you to our finance agent for detailed analysis.', 'assistant', 'orchestrator', 2, '{"transition_triggered": true}'),
    (1, 'Hello! I''m the finance agent. I''ll help you with your restaurant valuation. Can you provide some basic financial information?', 'assistant', 'finance', 3, '{"agent_introduction": true}');

-- Sample agent transition
INSERT INTO a2a_agent_transitions (session_id, from_agent, to_agent, transition_reason, message_id)
VALUES (1, 'orchestrator', 'finance', 'User requested business valuation - specialized finance knowledge required', 2);
*/

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON a2a_chat_sessions TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON a2a_chat_messages TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON a2a_agent_transitions TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON a2a_file_uploads TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE a2a_chat_sessions_id_seq TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE a2a_chat_messages_id_seq TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE a2a_agent_transitions_id_seq TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE a2a_file_uploads_id_seq TO your_app_user;

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

COMMENT ON TABLE a2a_chat_sessions IS 'Stores A2A chat sessions with agent tracking';
COMMENT ON TABLE a2a_chat_messages IS 'Stores individual messages within A2A chat sessions';
COMMENT ON TABLE a2a_agent_transitions IS 'Tracks agent handoffs during conversations';
COMMENT ON TABLE a2a_file_uploads IS 'Tracks files uploaded during A2A chat sessions';

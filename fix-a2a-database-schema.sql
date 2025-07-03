-- Fix A2A Database Schema Issues
-- This script adds missing tables and columns required by the A2A API

-- =============================================================================
-- ADD MISSING TABLES
-- =============================================================================

-- A2A Chat Sessions Table (referenced by API but missing from schema)
CREATE TABLE IF NOT EXISTS a2a_chat_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    session_name VARCHAR(255),
    agent_type VARCHAR(100) DEFAULT 'orchestrator',
    title VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- A2A Chat Messages Table (referenced by API but missing from schema)
CREATE TABLE IF NOT EXISTS a2a_chat_messages (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL,
    message_content TEXT NOT NULL,
    sender_type VARCHAR(50) NOT NULL, -- 'user', 'agent', 'system'
    agent_type VARCHAR(100),
    message_order INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (session_id) REFERENCES a2a_chat_sessions(id) ON DELETE CASCADE
);

-- A2A Thread Analytics Table (referenced by API)
CREATE TABLE IF NOT EXISTS a2a_thread_analytics (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    total_messages INTEGER DEFAULT 0,
    user_messages INTEGER DEFAULT 0,
    agent_messages INTEGER DEFAULT 0,
    last_message_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (session_id) REFERENCES a2a_chat_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- A2A Thread Cache Table (referenced by API)
CREATE TABLE IF NOT EXISTS a2a_thread_cache (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    data JSONB NOT NULL,
    expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- A2A Thread Preferences Table (referenced by API)
CREATE TABLE IF NOT EXISTS a2a_thread_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    session_id INTEGER,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES a2a_chat_sessions(id) ON DELETE CASCADE
);

-- A2A File Uploads Table (referenced by API)
CREATE TABLE IF NOT EXISTS a2a_file_uploads (
    id SERIAL PRIMARY KEY,
    upload_id VARCHAR(255) UNIQUE,
    session_id INTEGER,
    user_id INTEGER NOT NULL,
    message_id INTEGER,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    file_size BIGINT,
    file_type VARCHAR(100),
    file_path TEXT,
    upload_status VARCHAR(50) DEFAULT 'completed',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES a2a_chat_sessions(id) ON DELETE SET NULL
);

-- A2A Agent Transitions Table (referenced by API)
CREATE TABLE IF NOT EXISTS a2a_agent_transitions (
    id SERIAL PRIMARY KEY,
    session_id INTEGER,
    user_id INTEGER NOT NULL,
    from_agent VARCHAR(100) NOT NULL,
    to_agent VARCHAR(100),
    transition_reason TEXT,
    message_id INTEGER,
    transition_data JSONB DEFAULT '{}',
    transition_type VARCHAR(50),
    reason TEXT,
    success BOOLEAN DEFAULT TRUE,
    response_time_ms INTEGER,
    confidence_score DECIMAL(3,2),
    context_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES a2a_chat_sessions(id) ON DELETE SET NULL
);

-- =============================================================================
-- ADD MISSING COLUMNS TO EXISTING TABLES
-- =============================================================================

-- Add missing columns to a2a_session_context
DO $$
BEGIN
    -- Check and add context_data column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a2a_session_context' AND column_name = 'context_data'
    ) THEN
        ALTER TABLE a2a_session_context ADD COLUMN context_data JSONB DEFAULT '{}';
        RAISE NOTICE 'Added context_data column to a2a_session_context';
    END IF;
    
    -- Check and add session_data column  
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a2a_session_context' AND column_name = 'session_data'
    ) THEN
        ALTER TABLE a2a_session_context ADD COLUMN session_data JSONB DEFAULT '{}';
        RAISE NOTICE 'Added session_data column to a2a_session_context';
    END IF;
END $$;

-- Add missing columns to a2a_agent_interactions
DO $$
BEGIN
    -- Check and add context_data column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a2a_agent_interactions' AND column_name = 'context_data'
    ) THEN
        ALTER TABLE a2a_agent_interactions ADD COLUMN context_data JSONB DEFAULT '{}';
        RAISE NOTICE 'Added context_data column to a2a_agent_interactions';
    END IF;
END $$;

-- Add missing columns to a2a_tasks
DO $$
BEGIN
    -- Check and add session_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a2a_tasks' AND column_name = 'session_id'
    ) THEN
        ALTER TABLE a2a_tasks ADD COLUMN session_id INTEGER;
        RAISE NOTICE 'Added session_id column to a2a_tasks';
    END IF;
    
    -- Check and add task_data column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a2a_tasks' AND column_name = 'task_data'
    ) THEN
        ALTER TABLE a2a_tasks ADD COLUMN task_data JSONB DEFAULT '{}';
        RAISE NOTICE 'Added task_data column to a2a_tasks';
    END IF;
    
    -- Check and add agent_type column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a2a_tasks' AND column_name = 'agent_type'
    ) THEN
        ALTER TABLE a2a_tasks ADD COLUMN agent_type VARCHAR(100);
        RAISE NOTICE 'Added agent_type column to a2a_tasks';
    END IF;
    
    -- Check and add result_data column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a2a_tasks' AND column_name = 'result_data'
    ) THEN
        ALTER TABLE a2a_tasks ADD COLUMN result_data JSONB DEFAULT '{}';
        RAISE NOTICE 'Added result_data column to a2a_tasks';
    END IF;
    
    -- Check and add progress_percentage column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a2a_tasks' AND column_name = 'progress_percentage'
    ) THEN
        ALTER TABLE a2a_tasks ADD COLUMN progress_percentage INTEGER DEFAULT 0;
        RAISE NOTICE 'Added progress_percentage column to a2a_tasks';
    END IF;
    
    -- Check and add error_message column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a2a_tasks' AND column_name = 'error_message'
    ) THEN
        ALTER TABLE a2a_tasks ADD COLUMN error_message TEXT;
        RAISE NOTICE 'Added error_message column to a2a_tasks';
    END IF;
END $$;

-- Modify a2a_messages to allow NULL task_id for compatibility
DO $$
BEGIN
    -- Check if task_id is NOT NULL and modify if needed
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a2a_messages' 
        AND column_name = 'task_id' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE a2a_messages ALTER COLUMN task_id DROP NOT NULL;
        RAISE NOTICE 'Modified task_id column in a2a_messages to allow NULL values';
    END IF;
    
    -- Add session_id column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a2a_messages' AND column_name = 'session_id'
    ) THEN
        ALTER TABLE a2a_messages ADD COLUMN session_id INTEGER;
        RAISE NOTICE 'Added session_id column to a2a_messages';
    END IF;
END $$;

-- Add missing columns to a2a_agent_interactions
DO $$
BEGIN
    -- Add session_id column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a2a_agent_interactions' AND column_name = 'session_id'
    ) THEN
        ALTER TABLE a2a_agent_interactions ADD COLUMN session_id INTEGER;
        RAISE NOTICE 'Added session_id column to a2a_agent_interactions';
    END IF;
    
    -- Add interaction_data column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a2a_agent_interactions' AND column_name = 'interaction_data'
    ) THEN
        ALTER TABLE a2a_agent_interactions ADD COLUMN interaction_data JSONB DEFAULT '{}';
        RAISE NOTICE 'Added interaction_data column to a2a_agent_interactions';
    END IF;
END $$;

-- =============================================================================
-- CREATE INDEXES FOR NEW TABLES
-- =============================================================================

-- Indexes for a2a_chat_sessions
CREATE INDEX IF NOT EXISTS idx_a2a_chat_sessions_user_id ON a2a_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_a2a_chat_sessions_active ON a2a_chat_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_a2a_chat_sessions_agent_type ON a2a_chat_sessions(agent_type);
CREATE INDEX IF NOT EXISTS idx_a2a_chat_sessions_last_active ON a2a_chat_sessions(last_active_at);

-- Indexes for a2a_chat_messages
CREATE INDEX IF NOT EXISTS idx_a2a_chat_messages_session_id ON a2a_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_a2a_chat_messages_sender_type ON a2a_chat_messages(sender_type);
CREATE INDEX IF NOT EXISTS idx_a2a_chat_messages_created_at ON a2a_chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_a2a_chat_messages_order ON a2a_chat_messages(session_id, message_order);

-- Indexes for a2a_thread_analytics
CREATE INDEX IF NOT EXISTS idx_a2a_thread_analytics_session_id ON a2a_thread_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_a2a_thread_analytics_user_id ON a2a_thread_analytics(user_id);

-- Indexes for a2a_thread_cache
CREATE INDEX IF NOT EXISTS idx_a2a_thread_cache_user_id ON a2a_thread_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_a2a_thread_cache_expires_at ON a2a_thread_cache(expires_at);

-- Indexes for a2a_thread_preferences
CREATE INDEX IF NOT EXISTS idx_a2a_thread_preferences_user_id ON a2a_thread_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_a2a_thread_preferences_session_id ON a2a_thread_preferences(session_id);

-- Indexes for a2a_file_uploads
CREATE INDEX IF NOT EXISTS idx_a2a_file_uploads_user_id ON a2a_file_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_a2a_file_uploads_session_id ON a2a_file_uploads(session_id);
CREATE INDEX IF NOT EXISTS idx_a2a_file_uploads_upload_id ON a2a_file_uploads(upload_id);

-- Indexes for a2a_agent_transitions
CREATE INDEX IF NOT EXISTS idx_a2a_agent_transitions_user_id ON a2a_agent_transitions(user_id);
CREATE INDEX IF NOT EXISTS idx_a2a_agent_transitions_session_id ON a2a_agent_transitions(session_id);
CREATE INDEX IF NOT EXISTS idx_a2a_agent_transitions_from_agent ON a2a_agent_transitions(from_agent);
CREATE INDEX IF NOT EXISTS idx_a2a_agent_transitions_to_agent ON a2a_agent_transitions(to_agent);

-- =============================================================================
-- UPDATE TRIGGERS FOR NEW TABLES
-- =============================================================================

-- Triggers for a2a_chat_sessions
CREATE TRIGGER update_a2a_chat_sessions_updated_at 
    BEFORE UPDATE ON a2a_chat_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers for a2a_thread_analytics  
CREATE TRIGGER update_a2a_thread_analytics_updated_at 
    BEFORE UPDATE ON a2a_thread_analytics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers for a2a_file_uploads
CREATE TRIGGER update_a2a_file_uploads_updated_at 
    BEFORE UPDATE ON a2a_file_uploads 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers for a2a_thread_preferences
CREATE TRIGGER update_a2a_thread_preferences_updated_at 
    BEFORE UPDATE ON a2a_thread_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'A2A Database Schema Fix Completed Successfully!';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'New tables created:';
    RAISE NOTICE '  - a2a_chat_sessions';
    RAISE NOTICE '  - a2a_chat_messages';  
    RAISE NOTICE '  - a2a_thread_analytics';
    RAISE NOTICE '  - a2a_thread_cache';
    RAISE NOTICE '  - a2a_thread_preferences';
    RAISE NOTICE '  - a2a_file_uploads';
    RAISE NOTICE '  - a2a_agent_transitions';
    RAISE NOTICE '';
    RAISE NOTICE 'Missing columns added to existing tables:';
    RAISE NOTICE '  - a2a_session_context: context_data, session_data';
    RAISE NOTICE '  - a2a_agent_interactions: context_data, session_id, interaction_data';
    RAISE NOTICE '  - a2a_tasks: session_id, task_data, agent_type, result_data, progress_percentage, error_message';
    RAISE NOTICE '  - a2a_messages: session_id (task_id made nullable)';
    RAISE NOTICE '';
    RAISE NOTICE 'All indexes and triggers created successfully!';
    RAISE NOTICE 'A2A API endpoints should now work without schema errors.';
    RAISE NOTICE '=============================================================================';
END $$;

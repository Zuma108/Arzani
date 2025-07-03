-- A2A Tables Verification and Creation Script
-- Run this in pgAdmin to verify and create all required A2A tables
-- Generated: June 11, 2025

-- ==============================================================================
-- VERIFY AND CREATE ALL A2A TABLES
-- ==============================================================================

-- 1. A2A Tasks Table (Core A2A Protocol)
CREATE TABLE IF NOT EXISTS a2a_tasks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    task_id VARCHAR(255) UNIQUE NOT NULL,
    initial_query TEXT NOT NULL,
    task_type VARCHAR(100) NOT NULL, -- 'broker', 'legal', 'finance', 'general'
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed', 'cancelled'
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    
    -- AI Classification Results
    primary_agent VARCHAR(100) NOT NULL,
    classification_confidence DECIMAL(3,2) CHECK (classification_confidence >= 0.0 AND classification_confidence <= 1.0),
    classification_reasoning TEXT,
    ai_insights JSONB,
    
    -- Task Metadata
    metadata JSONB DEFAULT '{}',
    context JSONB DEFAULT '{}',
    requirements JSONB DEFAULT '{}',
    
    -- Agent Assignment
    assigned_agents JSONB DEFAULT '[]', -- Array of agent names
    current_agent VARCHAR(100),
    agent_handoffs INTEGER DEFAULT 0,
    
    -- Progress Tracking
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    steps_completed INTEGER DEFAULT 0,
    total_steps INTEGER,
    current_step TEXT,
    
    -- Results and Output
    result JSONB,
    final_response TEXT,
    deliverables JSONB DEFAULT '[]',
    
    -- Error Handling
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Timing
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITHOUT TIME ZONE,
    completed_at TIMESTAMP WITHOUT TIME ZONE,
    estimated_completion TIMESTAMP WITHOUT TIME ZONE,
    
    -- Relationships
    parent_task_id VARCHAR(255), -- For subtasks
    related_task_ids JSONB DEFAULT '[]', -- Related tasks
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_task_id) REFERENCES a2a_tasks(task_id) ON DELETE SET NULL
);

-- 2. A2A Messages Table (Core A2A Protocol)
CREATE TABLE IF NOT EXISTS a2a_messages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    task_id VARCHAR(255) NOT NULL,
    message_id VARCHAR(255) UNIQUE NOT NULL,
    
    -- Message Content
    content TEXT NOT NULL,
    message_type VARCHAR(50) NOT NULL, -- 'user_input', 'agent_response', 'agent_to_agent', 'system', 'error'
    format VARCHAR(20) DEFAULT 'text', -- 'text', 'json', 'markdown', 'html'
    
    -- Agent Information
    sender_agent VARCHAR(100), -- NULL for user messages
    recipient_agent VARCHAR(100), -- NULL for user-facing messages
    sender_type VARCHAR(20) NOT NULL, -- 'user', 'agent', 'system'
    
    -- Message Metadata
    metadata JSONB DEFAULT '{}',
    attachments JSONB DEFAULT '[]',
    referenced_message_ids JSONB DEFAULT '[]', -- Referenced message IDs
    
    -- Processing Information
    processing_time_ms INTEGER,
    token_count INTEGER,
    model_used VARCHAR(100),
    
    -- Status and Flags
    is_internal BOOLEAN DEFAULT FALSE, -- Agent-to-agent vs user-facing
    is_error BOOLEAN DEFAULT FALSE,
    is_system BOOLEAN DEFAULT FALSE,
    requires_response BOOLEAN DEFAULT FALSE,
    
    -- Timing
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITHOUT TIME ZONE,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES a2a_tasks(task_id) ON DELETE CASCADE
);

-- 3. A2A Agent Interactions Table
CREATE TABLE IF NOT EXISTS a2a_agent_interactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    task_id VARCHAR(255) NOT NULL,
    interaction_id VARCHAR(255) UNIQUE NOT NULL,
    
    -- Interaction Details
    interaction_type VARCHAR(50) NOT NULL, -- 'handoff', 'collaboration', 'delegation', 'escalation', 'completion'
    from_agent VARCHAR(100) NOT NULL,
    to_agent VARCHAR(100),
    
    -- Performance Metrics
    response_time_ms INTEGER,
    success BOOLEAN,
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    
    -- Context and Reasoning
    reason TEXT,
    context_passed JSONB DEFAULT '{}',
    decision_factors JSONB DEFAULT '[]',
    
    -- Results
    outcome VARCHAR(100),
    next_actions JSONB DEFAULT '[]',
    
    -- Timing
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITHOUT TIME ZONE,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES a2a_tasks(task_id) ON DELETE CASCADE
);

-- 4. A2A Session Context Table
CREATE TABLE IF NOT EXISTS a2a_session_context (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    
    -- Context Data
    conversation_history JSONB DEFAULT '[]',
    shared_context JSONB DEFAULT '{}',
    user_preferences JSONB DEFAULT '{}',
    
    -- Session State
    active_task_ids JSONB DEFAULT '[]',
    current_agent VARCHAR(100),
    session_state VARCHAR(50) DEFAULT 'active', -- 'active', 'paused', 'completed', 'expired'
    
    -- Metadata
    session_metadata JSONB DEFAULT '{}',
    
    -- Timing
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITHOUT TIME ZONE,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. A2A Chat Sessions Table (Enhanced for Arzani-X)
CREATE TABLE IF NOT EXISTS a2a_chat_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    session_name VARCHAR(255) DEFAULT 'Untitled Session',
    title VARCHAR(255),
    agent_type VARCHAR(50) NOT NULL DEFAULT 'orchestrator', -- orchestrator, broker, legal, finance
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    is_pinned BOOLEAN DEFAULT false,
    avatar_url TEXT,
    unread_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    thread_metadata JSONB DEFAULT '{}',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. A2A Chat Messages Table
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

-- 7. A2A Agent Transitions Table
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

-- 8. A2A File Uploads Table
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

-- 9. A2A Thread Preferences Table
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
    UNIQUE(user_id, session_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 10. A2A Thread Analytics Table
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
    UNIQUE(session_id, user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 11. A2A Thread Cache Table
CREATE TABLE IF NOT EXISTS a2a_thread_cache (
    id SERIAL PRIMARY KEY,
    cache_key VARCHAR(255) NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    cache_data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ==============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ==============================================================================

-- A2A Tasks Indexes
CREATE INDEX IF NOT EXISTS idx_a2a_tasks_user_id ON a2a_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_a2a_tasks_task_id ON a2a_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_a2a_tasks_status ON a2a_tasks(status);
CREATE INDEX IF NOT EXISTS idx_a2a_tasks_task_type ON a2a_tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_a2a_tasks_primary_agent ON a2a_tasks(primary_agent);
CREATE INDEX IF NOT EXISTS idx_a2a_tasks_created_at ON a2a_tasks(created_at);

-- A2A Messages Indexes
CREATE INDEX IF NOT EXISTS idx_a2a_messages_user_id ON a2a_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_a2a_messages_task_id ON a2a_messages(task_id);
CREATE INDEX IF NOT EXISTS idx_a2a_messages_message_type ON a2a_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_a2a_messages_sender_agent ON a2a_messages(sender_agent);
CREATE INDEX IF NOT EXISTS idx_a2a_messages_created_at ON a2a_messages(created_at);

-- A2A Agent Interactions Indexes
CREATE INDEX IF NOT EXISTS idx_a2a_interactions_user_id ON a2a_agent_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_a2a_interactions_task_id ON a2a_agent_interactions(task_id);
CREATE INDEX IF NOT EXISTS idx_a2a_interactions_from_agent ON a2a_agent_interactions(from_agent);
CREATE INDEX IF NOT EXISTS idx_a2a_interactions_to_agent ON a2a_agent_interactions(to_agent);
CREATE INDEX IF NOT EXISTS idx_a2a_interactions_type ON a2a_agent_interactions(interaction_type);

-- A2A Session Context Indexes
CREATE INDEX IF NOT EXISTS idx_a2a_session_user_id ON a2a_session_context(user_id);
CREATE INDEX IF NOT EXISTS idx_a2a_session_session_id ON a2a_session_context(session_id);
CREATE INDEX IF NOT EXISTS idx_a2a_session_state ON a2a_session_context(session_state);

-- A2A Chat Sessions Indexes
CREATE INDEX IF NOT EXISTS idx_a2a_chat_sessions_user_id ON a2a_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_a2a_chat_sessions_created_at ON a2a_chat_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_a2a_chat_sessions_agent_type ON a2a_chat_sessions(agent_type);
CREATE INDEX IF NOT EXISTS idx_a2a_chat_sessions_active ON a2a_chat_sessions(is_active) WHERE is_active = true;

-- A2A Chat Messages Indexes
CREATE INDEX IF NOT EXISTS idx_a2a_chat_messages_session_id ON a2a_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_a2a_chat_messages_order ON a2a_chat_messages(session_id, message_order);
CREATE INDEX IF NOT EXISTS idx_a2a_chat_messages_created_at ON a2a_chat_messages(created_at DESC);

-- A2A Agent Transitions Indexes
CREATE INDEX IF NOT EXISTS idx_a2a_agent_transitions_session_id ON a2a_agent_transitions(session_id);
CREATE INDEX IF NOT EXISTS idx_a2a_agent_transitions_created_at ON a2a_agent_transitions(created_at DESC);

-- A2A File Uploads Indexes
CREATE INDEX IF NOT EXISTS idx_a2a_file_uploads_session_id ON a2a_file_uploads(session_id);
CREATE INDEX IF NOT EXISTS idx_a2a_file_uploads_message_id ON a2a_file_uploads(message_id);

-- A2A Thread Cache Indexes
CREATE INDEX IF NOT EXISTS idx_a2a_thread_cache_key_user ON a2a_thread_cache(cache_key, user_id);
CREATE INDEX IF NOT EXISTS idx_a2a_thread_cache_expires ON a2a_thread_cache(expires_at);

-- ==============================================================================
-- CREATE TRIGGERS FOR AUTOMATIC UPDATES
-- ==============================================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers (with proper PostgreSQL syntax)
DO $$
BEGIN
    -- Drop triggers if they exist and recreate them
    DROP TRIGGER IF EXISTS update_a2a_tasks_updated_at ON a2a_tasks;
    CREATE TRIGGER update_a2a_tasks_updated_at 
        BEFORE UPDATE ON a2a_tasks 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_a2a_session_context_updated_at ON a2a_session_context;
    CREATE TRIGGER update_a2a_session_context_updated_at 
        BEFORE UPDATE ON a2a_session_context 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_a2a_chat_sessions_updated_at ON a2a_chat_sessions;
    CREATE TRIGGER update_a2a_chat_sessions_updated_at 
        BEFORE UPDATE ON a2a_chat_sessions 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_a2a_thread_preferences_updated_at ON a2a_thread_preferences;
    CREATE TRIGGER update_a2a_thread_preferences_updated_at 
        BEFORE UPDATE ON a2a_thread_preferences 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_a2a_thread_analytics_updated_at ON a2a_thread_analytics;
    CREATE TRIGGER update_a2a_thread_analytics_updated_at 
        BEFORE UPDATE ON a2a_thread_analytics 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END $$;

-- ==============================================================================
-- VERIFICATION QUERIES
-- ==============================================================================

-- Check if all tables exist
DO $$
BEGIN
    RAISE NOTICE 'Verifying A2A Tables...';
    
    -- Check each table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'a2a_tasks') THEN
        RAISE NOTICE '✅ a2a_tasks table exists';
    ELSE
        RAISE NOTICE '❌ a2a_tasks table missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'a2a_messages') THEN
        RAISE NOTICE '✅ a2a_messages table exists';
    ELSE
        RAISE NOTICE '❌ a2a_messages table missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'a2a_agent_interactions') THEN
        RAISE NOTICE '✅ a2a_agent_interactions table exists';
    ELSE
        RAISE NOTICE '❌ a2a_agent_interactions table missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'a2a_session_context') THEN
        RAISE NOTICE '✅ a2a_session_context table exists';
    ELSE
        RAISE NOTICE '❌ a2a_session_context table missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'a2a_chat_sessions') THEN
        RAISE NOTICE '✅ a2a_chat_sessions table exists';
    ELSE
        RAISE NOTICE '❌ a2a_chat_sessions table missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'a2a_chat_messages') THEN
        RAISE NOTICE '✅ a2a_chat_messages table exists';
    ELSE
        RAISE NOTICE '❌ a2a_chat_messages table missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'a2a_agent_transitions') THEN
        RAISE NOTICE '✅ a2a_agent_transitions table exists';
    ELSE
        RAISE NOTICE '❌ a2a_agent_transitions table missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'a2a_file_uploads') THEN
        RAISE NOTICE '✅ a2a_file_uploads table exists';
    ELSE
        RAISE NOTICE '❌ a2a_file_uploads table missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'a2a_thread_preferences') THEN
        RAISE NOTICE '✅ a2a_thread_preferences table exists';
    ELSE
        RAISE NOTICE '❌ a2a_thread_preferences table missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'a2a_thread_analytics') THEN
        RAISE NOTICE '✅ a2a_thread_analytics table exists';
    ELSE
        RAISE NOTICE '❌ a2a_thread_analytics table missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'a2a_thread_cache') THEN
        RAISE NOTICE '✅ a2a_thread_cache table exists';
    ELSE
        RAISE NOTICE '❌ a2a_thread_cache table missing';
    END IF;
    
    RAISE NOTICE 'A2A Tables verification complete!';
END $$;

-- A2A (Agent-to-Agent) Database Tables
-- This file contains all database tables and functions needed for A2A integration
-- Execute this script in pgAdmin to create the A2A database infrastructure

-- =============================================================================
-- A2A CORE TABLES
-- =============================================================================

-- A2A Tasks Table
-- Tracks the state and lifecycle of agent-to-agent tasks
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

-- A2A Messages Table
-- Logs all agent-to-agent communications and user interactions
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

-- A2A Agent Interactions Table
-- Tracks agent performance, handoffs, and collaboration patterns
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

-- A2A Session Context Table
-- Maintains conversation context and state across agent interactions
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

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- A2A Tasks Indexes
CREATE INDEX IF NOT EXISTS idx_a2a_tasks_user_id ON a2a_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_a2a_tasks_task_id ON a2a_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_a2a_tasks_status ON a2a_tasks(status);
CREATE INDEX IF NOT EXISTS idx_a2a_tasks_task_type ON a2a_tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_a2a_tasks_primary_agent ON a2a_tasks(primary_agent);
CREATE INDEX IF NOT EXISTS idx_a2a_tasks_created_at ON a2a_tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_a2a_tasks_parent_task ON a2a_tasks(parent_task_id);

-- A2A Messages Indexes
CREATE INDEX IF NOT EXISTS idx_a2a_messages_user_id ON a2a_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_a2a_messages_task_id ON a2a_messages(task_id);
CREATE INDEX IF NOT EXISTS idx_a2a_messages_message_type ON a2a_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_a2a_messages_sender_agent ON a2a_messages(sender_agent);
CREATE INDEX IF NOT EXISTS idx_a2a_messages_created_at ON a2a_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_a2a_messages_is_internal ON a2a_messages(is_internal);

-- A2A Agent Interactions Indexes
CREATE INDEX IF NOT EXISTS idx_a2a_interactions_user_id ON a2a_agent_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_a2a_interactions_task_id ON a2a_agent_interactions(task_id);
CREATE INDEX IF NOT EXISTS idx_a2a_interactions_from_agent ON a2a_agent_interactions(from_agent);
CREATE INDEX IF NOT EXISTS idx_a2a_interactions_to_agent ON a2a_agent_interactions(to_agent);
CREATE INDEX IF NOT EXISTS idx_a2a_interactions_type ON a2a_agent_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_a2a_interactions_created_at ON a2a_agent_interactions(created_at);

-- A2A Session Context Indexes
CREATE INDEX IF NOT EXISTS idx_a2a_session_user_id ON a2a_session_context(user_id);
CREATE INDEX IF NOT EXISTS idx_a2a_session_session_id ON a2a_session_context(session_id);
CREATE INDEX IF NOT EXISTS idx_a2a_session_state ON a2a_session_context(session_state);
CREATE INDEX IF NOT EXISTS idx_a2a_session_last_activity ON a2a_session_context(last_activity);

-- =============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_a2a_tasks_updated_at 
    BEFORE UPDATE ON a2a_tasks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_a2a_session_context_updated_at 
    BEFORE UPDATE ON a2a_session_context 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update last_activity trigger for session context
CREATE OR REPLACE FUNCTION update_session_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_activity = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_session_last_activity_trigger 
    BEFORE UPDATE ON a2a_session_context 
    FOR EACH ROW EXECUTE FUNCTION update_session_last_activity();

-- =============================================================================
-- DATABASE FUNCTIONS FOR A2A OPERATIONS
-- =============================================================================

-- Function: Create A2A Task
CREATE OR REPLACE FUNCTION create_a2a_task(
    p_user_id INTEGER,
    p_task_id VARCHAR(255),
    p_initial_query TEXT,
    p_task_type VARCHAR(100),
    p_primary_agent VARCHAR(100),
    p_classification_confidence DECIMAL(3,2) DEFAULT NULL,
    p_classification_reasoning TEXT DEFAULT NULL,
    p_ai_insights JSONB DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}',
    p_priority INTEGER DEFAULT 5
)
RETURNS INTEGER AS $$
DECLARE
    new_task_pk INTEGER;
BEGIN
    INSERT INTO a2a_tasks (
        user_id, task_id, initial_query, task_type, primary_agent,
        classification_confidence, classification_reasoning, ai_insights,
        metadata, priority, status, started_at
    ) VALUES (
        p_user_id, p_task_id, p_initial_query, p_task_type, p_primary_agent,
        p_classification_confidence, p_classification_reasoning, p_ai_insights,
        p_metadata, p_priority, 'in_progress', CURRENT_TIMESTAMP
    ) RETURNING id INTO new_task_pk;
    
    RETURN new_task_pk;
END;
$$ LANGUAGE plpgsql;

-- Function: Log A2A Message
CREATE OR REPLACE FUNCTION log_a2a_message(
    p_user_id INTEGER,
    p_task_id VARCHAR(255),
    p_message_id VARCHAR(255),
    p_content TEXT,
    p_message_type VARCHAR(50),
    p_sender_agent VARCHAR(100) DEFAULT NULL,
    p_recipient_agent VARCHAR(100) DEFAULT NULL,
    p_sender_type VARCHAR(20) DEFAULT 'agent',
    p_metadata JSONB DEFAULT '{}',
    p_is_internal BOOLEAN DEFAULT FALSE
)
RETURNS INTEGER AS $$
DECLARE
    new_message_pk INTEGER;
BEGIN
    INSERT INTO a2a_messages (
        user_id, task_id, message_id, content, message_type,
        sender_agent, recipient_agent, sender_type, metadata, is_internal
    ) VALUES (
        p_user_id, p_task_id, p_message_id, p_content, p_message_type,
        p_sender_agent, p_recipient_agent, p_sender_type, p_metadata, p_is_internal
    ) RETURNING id INTO new_message_pk;
    
    RETURN new_message_pk;
END;
$$ LANGUAGE plpgsql;

-- Function: Update Task Status
CREATE OR REPLACE FUNCTION update_a2a_task_status(
    p_task_id VARCHAR(255),
    p_status VARCHAR(50),
    p_progress_percentage INTEGER DEFAULT NULL,
    p_current_step TEXT DEFAULT NULL,
    p_result JSONB DEFAULT NULL,
    p_final_response TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    task_exists BOOLEAN;
BEGIN
    -- Check if task exists
    SELECT EXISTS(SELECT 1 FROM a2a_tasks WHERE task_id = p_task_id) INTO task_exists;
    
    IF NOT task_exists THEN
        RETURN FALSE;
    END IF;
    
    -- Update task
    UPDATE a2a_tasks SET
        status = p_status,
        progress_percentage = COALESCE(p_progress_percentage, progress_percentage),
        current_step = COALESCE(p_current_step, current_step),
        result = COALESCE(p_result, result),
        final_response = COALESCE(p_final_response, final_response),
        completed_at = CASE WHEN p_status IN ('completed', 'failed', 'cancelled') 
                           THEN CURRENT_TIMESTAMP 
                           ELSE completed_at END
    WHERE task_id = p_task_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function: Record Agent Interaction
CREATE OR REPLACE FUNCTION record_agent_interaction(
    p_user_id INTEGER,
    p_task_id VARCHAR(255),
    p_interaction_id VARCHAR(255),
    p_interaction_type VARCHAR(50),
    p_from_agent VARCHAR(100),
    p_to_agent VARCHAR(100) DEFAULT NULL,
    p_success BOOLEAN DEFAULT TRUE,
    p_confidence_score DECIMAL(3,2) DEFAULT NULL,
    p_reason TEXT DEFAULT NULL,
    p_context_passed JSONB DEFAULT '{}',
    p_outcome VARCHAR(100) DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    new_interaction_pk INTEGER;
BEGIN
    INSERT INTO a2a_agent_interactions (
        user_id, task_id, interaction_id, interaction_type,
        from_agent, to_agent, success, confidence_score,
        reason, context_passed, outcome, completed_at
    ) VALUES (
        p_user_id, p_task_id, p_interaction_id, p_interaction_type,
        p_from_agent, p_to_agent, p_success, p_confidence_score,
        p_reason, p_context_passed, p_outcome, CURRENT_TIMESTAMP
    ) RETURNING id INTO new_interaction_pk;
    
    RETURN new_interaction_pk;
END;
$$ LANGUAGE plpgsql;

-- Function: Get Task Messages
CREATE OR REPLACE FUNCTION get_task_messages(
    p_task_id VARCHAR(255),
    p_include_internal BOOLEAN DEFAULT FALSE,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE(
    message_id VARCHAR(255),
    content TEXT,
    message_type VARCHAR(50),
    sender_agent VARCHAR(100),
    sender_type VARCHAR(20),
    created_at TIMESTAMP WITHOUT TIME ZONE,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.message_id,
        m.content,
        m.message_type,
        m.sender_agent,
        m.sender_type,
        m.created_at,
        m.metadata
    FROM a2a_messages m
    WHERE m.task_id = p_task_id
    AND (p_include_internal = TRUE OR m.is_internal = FALSE)
    ORDER BY m.created_at ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function: Get User Tasks
CREATE OR REPLACE FUNCTION get_user_a2a_tasks(
    p_user_id INTEGER,
    p_status VARCHAR(50) DEFAULT NULL,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
    task_id VARCHAR(255),
    initial_query TEXT,
    task_type VARCHAR(100),
    status VARCHAR(50),
    primary_agent VARCHAR(100),
    progress_percentage INTEGER,
    created_at TIMESTAMP WITHOUT TIME ZONE,
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    classification_confidence DECIMAL(3,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.task_id,
        t.initial_query,
        t.task_type,
        t.status,
        t.primary_agent,
        t.progress_percentage,
        t.created_at,
        t.updated_at,
        t.classification_confidence
    FROM a2a_tasks t
    WHERE t.user_id = p_user_id
    AND (p_status IS NULL OR t.status = p_status)
    ORDER BY t.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- VIEWS FOR COMMON QUERIES
-- =============================================================================

-- View: Active Tasks Summary
CREATE OR REPLACE VIEW v_a2a_active_tasks AS
SELECT 
    t.task_id,
    t.user_id,
    u.username,
    u.email,
    t.initial_query,
    t.task_type,
    t.status,
    t.primary_agent,
    t.progress_percentage,
    t.classification_confidence,
    t.created_at,
    t.updated_at,
    COUNT(m.id) as message_count,
    COUNT(ai.id) as interaction_count
FROM a2a_tasks t
LEFT JOIN users u ON t.user_id = u.id
LEFT JOIN a2a_messages m ON t.task_id = m.task_id
LEFT JOIN a2a_agent_interactions ai ON t.task_id = ai.task_id
WHERE t.status IN ('pending', 'in_progress')
GROUP BY t.id, u.username, u.email;

-- View: Agent Performance Metrics
CREATE OR REPLACE VIEW v_a2a_agent_performance AS
SELECT 
    ai.from_agent as agent_name,
    COUNT(*) as total_interactions,
    AVG(ai.response_time_ms) as avg_response_time_ms,
    AVG(ai.confidence_score) as avg_confidence_score,
    SUM(CASE WHEN ai.success = TRUE THEN 1 ELSE 0 END) as successful_interactions,
    ROUND((SUM(CASE WHEN ai.success = TRUE THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as success_rate_percentage
FROM a2a_agent_interactions ai
GROUP BY ai.from_agent
ORDER BY success_rate_percentage DESC;

-- View: Task Communication Summary
CREATE OR REPLACE VIEW v_a2a_task_communication AS
SELECT 
    t.task_id,
    t.user_id,
    t.task_type,
    t.status,
    COUNT(m.id) as total_messages,
    COUNT(CASE WHEN m.sender_type = 'user' THEN 1 END) as user_messages,
    COUNT(CASE WHEN m.sender_type = 'agent' THEN 1 END) as agent_messages,
    COUNT(CASE WHEN m.is_internal = TRUE THEN 1 END) as internal_messages,
    MIN(m.created_at) as first_message_at,
    MAX(m.created_at) as last_message_at
FROM a2a_tasks t
LEFT JOIN a2a_messages m ON t.task_id = m.task_id
GROUP BY t.task_id, t.user_id, t.task_type, t.status;

-- =============================================================================
-- CLEANUP AND MAINTENANCE FUNCTIONS
-- =============================================================================

-- Function: Clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_a2a_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM a2a_session_context 
    WHERE expires_at < CURRENT_TIMESTAMP 
    OR (last_activity < CURRENT_TIMESTAMP - INTERVAL '7 days' AND session_state != 'active');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Archive completed tasks older than specified days
CREATE OR REPLACE FUNCTION archive_old_a2a_tasks(days_old INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- This would typically move to an archive table, but for now we'll just update status
    UPDATE a2a_tasks 
    SET status = 'archived'
    WHERE status IN ('completed', 'failed', 'cancelled')
    AND completed_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * days_old;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- GRANT PERMISSIONS (Adjust based on your application user)
-- =============================================================================

-- Grant permissions to application user (replace 'app_user' with your actual database user)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO app_user;

-- =============================================================================
-- SAMPLE DATA (Optional - Remove in production)
-- =============================================================================

-- Uncomment the following to insert sample data for testing
/*
-- Sample A2A Task
INSERT INTO a2a_tasks (
    user_id, task_id, initial_query, task_type, primary_agent, 
    classification_confidence, classification_reasoning, status
) VALUES (
    1, 'task_sample_001', 'Help me understand the legal requirements for selling my business', 
    'legal', 'legal_agent', 0.95, 'High confidence classification based on legal terminology', 'in_progress'
);

-- Sample A2A Message
INSERT INTO a2a_messages (
    user_id, task_id, message_id, content, message_type, sender_type
) VALUES (
    1, 'task_sample_001', 'msg_sample_001', 
    'I understand you need help with legal requirements for selling your business. Let me analyze your specific situation.',
    'agent_response', 'agent'
);
*/

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE 'A2A Database Tables Created Successfully!';
    RAISE NOTICE 'Tables created: a2a_tasks, a2a_messages, a2a_agent_interactions, a2a_session_context';
    RAISE NOTICE 'Functions created: create_a2a_task, log_a2a_message, update_a2a_task_status, record_agent_interaction';
    RAISE NOTICE 'Views created: v_a2a_active_tasks, v_a2a_agent_performance, v_a2a_task_communication';
    RAISE NOTICE 'Database integration ready for A2A system!';
END $$;

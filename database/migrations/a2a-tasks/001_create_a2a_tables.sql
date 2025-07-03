/**
 * A2A Tasks and Messages Database Migration
 * 
 * Creates tables for storing A2A protocol tasks and messages
 * Supporting the multi-agent system state persistence
 */

-- A2A Tasks Table
CREATE TABLE IF NOT EXISTS a2a_tasks (
    id UUID PRIMARY KEY,
    parent_id UUID,
    agent_id VARCHAR(100),
    state VARCHAR(50) NOT NULL DEFAULT 'submitted',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    json_rpc_id VARCHAR(255),
    error_code INTEGER,
    error_message TEXT,
    metadata JSONB,
    
    -- Constraints
    CONSTRAINT valid_state CHECK (state IN ('submitted', 'working', 'input-required', 'completed', 'failed')),
    CONSTRAINT valid_parent_reference FOREIGN KEY (parent_id) REFERENCES a2a_tasks(id) ON DELETE CASCADE
);

-- A2A Messages Table
CREATE TABLE IF NOT EXISTS a2a_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'agent',
    parts JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_role CHECK (role IN ('user', 'agent', 'task')),
    CONSTRAINT fk_task FOREIGN KEY (task_id) REFERENCES a2a_tasks(id) ON DELETE CASCADE
);

-- A2A Agent Registry Table (for dynamic discovery)
CREATE TABLE IF NOT EXISTS a2a_agents (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_url VARCHAR(500) NOT NULL,
    capabilities JSONB,
    specialties JSONB,
    status VARCHAR(50) DEFAULT 'unknown',
    last_health_check TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_status CHECK (status IN ('healthy', 'unhealthy', 'unreachable', 'unknown', 'disabled'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_a2a_tasks_state ON a2a_tasks(state);
CREATE INDEX IF NOT EXISTS idx_a2a_tasks_agent_id ON a2a_tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_a2a_tasks_parent_id ON a2a_tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_a2a_tasks_created_at ON a2a_tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_a2a_tasks_json_rpc_id ON a2a_tasks(json_rpc_id);

CREATE INDEX IF NOT EXISTS idx_a2a_messages_task_id ON a2a_messages(task_id);
CREATE INDEX IF NOT EXISTS idx_a2a_messages_role ON a2a_messages(role);
CREATE INDEX IF NOT EXISTS idx_a2a_messages_created_at ON a2a_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_a2a_agents_status ON a2a_agents(status);
CREATE INDEX IF NOT EXISTS idx_a2a_agents_last_health_check ON a2a_agents(last_health_check);

-- Trigger to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_a2a_tasks_updated_at BEFORE UPDATE ON a2a_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_a2a_messages_updated_at BEFORE UPDATE ON a2a_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_a2a_agents_updated_at BEFORE UPDATE ON a2a_agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default agent registry entries
INSERT INTO a2a_agents (id, name, description, base_url, capabilities, specialties) VALUES
('orchestrator', 'Arzani Generalist Agent', 
 'A generalist orchestration agent that routes queries to specialist agents', 
 'http://localhost:5001', 
 '{"tasks/send": {"description": "Route queries to appropriate specialist agents"}}',
 '["business brokerage", "marketplace", "query routing", "task orchestration"]')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    base_url = EXCLUDED.base_url,
    capabilities = EXCLUDED.capabilities,
    specialties = EXCLUDED.specialties,
    updated_at = NOW();

INSERT INTO a2a_agents (id, name, description, base_url, capabilities, specialties) VALUES
('broker', 'Arzani Broker Agent', 
 'Specialist agent for business valuations, market analysis, and deal structuring', 
 'http://localhost:5002', 
 '{"tasks/send": {"description": "Business valuation and market analysis"}}',
 '["valuation", "marketplace", "listing", "comparables", "pricing"]')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    base_url = EXCLUDED.base_url,
    capabilities = EXCLUDED.capabilities,
    specialties = EXCLUDED.specialties,
    updated_at = NOW();

INSERT INTO a2a_agents (id, name, description, base_url, capabilities, specialties) VALUES
('legal', 'Arzani Legal Agent', 
 'Specialist agent for legal compliance, contracts, and due diligence support', 
 'http://localhost:5003', 
 '{"tasks/send": {"description": "Legal compliance and contract assistance"}}',
 '["compliance", "contracts", "nda", "regulations", "due-diligence"]')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    base_url = EXCLUDED.base_url,
    capabilities = EXCLUDED.capabilities,
    specialties = EXCLUDED.specialties,
    updated_at = NOW();

INSERT INTO a2a_agents (id, name, description, base_url, capabilities, specialties) VALUES
('finance', 'Arzani Finance Agent', 
 'Specialist agent for financial analysis, EBITDA calculations, and tax scenarios', 
 'http://localhost:5004', 
 '{"tasks/send": {"description": "Financial analysis and valuation support"}}',
 '["ebitda", "multiples", "tax", "financial-analysis", "cash-flow"]')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    base_url = EXCLUDED.base_url,
    capabilities = EXCLUDED.capabilities,
    specialties = EXCLUDED.specialties,
    updated_at = NOW();

-- Grant permissions to application user (adjust as needed)
-- GRANT ALL PRIVILEGES ON a2a_tasks TO your_app_user;
-- GRANT ALL PRIVILEGES ON a2a_messages TO your_app_user;
-- GRANT ALL PRIVILEGES ON a2a_agents TO your_app_user;

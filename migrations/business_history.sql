-- Drop existing table if it exists
DROP TABLE IF EXISTS business_history CASCADE;

-- Create business_history table
CREATE TABLE business_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL DEFAULT 'view', -- For tracking different types of interactions
    viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_agent TEXT, -- For tracking browser/device information
    metadata JSONB DEFAULT '{}'::jsonb, -- For storing additional tracking data
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Add unique constraint to prevent duplicate entries within same timestamp
    CONSTRAINT unique_user_business_view UNIQUE (user_id, business_id, viewed_at)
);

-- Create required indexes
CREATE INDEX IF NOT EXISTS idx_business_history_user_id ON business_history(user_id);
CREATE INDEX IF NOT EXISTS idx_business_history_business_id ON business_history(business_id);
CREATE INDEX IF NOT EXISTS idx_business_history_viewed_at ON business_history(viewed_at);
CREATE INDEX IF NOT EXISTS idx_business_history_action_type ON business_history(action_type);

-- Create trigger for updating timestamp
CREATE OR REPLACE FUNCTION update_business_history_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_business_history_timestamp
    BEFORE UPDATE ON business_history
    FOR EACH ROW
    EXECUTE FUNCTION update_business_history_timestamp();

-- Create view for easy querying with business and user details
CREATE OR REPLACE VIEW business_history_view AS
SELECT 
    bh.id,
    bh.viewed_at,
    bh.action_type,
    bh.user_agent,
    bh.metadata,
    u.username,
    u.email,
    b.business_name,
    b.price,
    b.gross_revenue,
    b.ebitda,
    b.date_listed
FROM business_history bh
JOIN users u ON bh.user_id = u.id
JOIN businesses b ON bh.business_id = b.id;

-- Add comments for documentation
COMMENT ON TABLE business_history IS 'Tracks user interactions with business listings';
COMMENT ON COLUMN business_history.user_id IS 'References users table';
COMMENT ON COLUMN business_history.business_id IS 'References businesses table';
COMMENT ON COLUMN business_history.action_type IS 'Type of interaction (view, click, etc.)';
COMMENT ON COLUMN business_history.viewed_at IS 'Timestamp of the interaction';
COMMENT ON COLUMN business_history.metadata IS 'Additional JSON data about the interaction';

-- Cleanup function for old records (optional)
CREATE OR REPLACE FUNCTION cleanup_old_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Keep last 6 months of history
    DELETE FROM business_history
    WHERE viewed_at < CURRENT_TIMESTAMP - INTERVAL '6 months';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Cleanup trigger (runs daily)
CREATE TRIGGER cleanup_old_history_daily
    AFTER INSERT ON business_history
    EXECUTE FUNCTION cleanup_old_history();

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON business_history TO marketplace_user;
GRANT SELECT ON business_history_view TO marketplace_user;
GRANT USAGE ON SEQUENCE business_history_id_seq TO marketplace_user;

-- A/B Testing Tables Migration
-- This migration creates the necessary tables for A/B testing functionality

-- Create A/B Test Sessions table to track variant assignments
CREATE TABLE IF NOT EXISTS ab_test_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    user_id INTEGER REFERENCES users(id),
    variant VARCHAR(50) NOT NULL, -- 'seller_first' or 'buyer_first'
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    routing_method VARCHAR(100), -- 'a_b_testing', 'smart_routing', 'manual_selection'
    UNIQUE(session_id)
);

-- Create A/B Test Events table to track user interactions
CREATE TABLE IF NOT EXISTS ab_test_events (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    user_id INTEGER REFERENCES users(id),
    event_type VARCHAR(100) NOT NULL DEFAULT 'page_view', -- 'page_view', 'click', 'conversion', 'cta_click', etc.
    variant VARCHAR(50) NOT NULL,
    page_url TEXT,
    element_clicked VARCHAR(200),
    event_data JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    routing_method VARCHAR(100) -- Track how user was routed to this variant
);

-- Create A/B Test Conversions table to track conversion events
CREATE TABLE IF NOT EXISTS ab_test_conversions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    user_id INTEGER REFERENCES users(id),
    variant VARCHAR(50) NOT NULL,
    conversion_type VARCHAR(100) NOT NULL, -- 'signup', 'business_submit', 'contact', 'valuation_request', etc.
    conversion_value DECIMAL(10,2),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    conversion_data JSONB DEFAULT '{}',
    FOREIGN KEY (session_id) REFERENCES ab_test_sessions(session_id)
);

-- Create A/B Test Analytics Summary table for quick reporting
CREATE TABLE IF NOT EXISTS ab_test_analytics_summary (
    id SERIAL PRIMARY KEY,
    variant VARCHAR(50) NOT NULL,
    date_recorded DATE NOT NULL DEFAULT CURRENT_DATE,
    total_sessions INTEGER DEFAULT 0,
    total_page_views INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,4) DEFAULT 0.0000,
    unique_users INTEGER DEFAULT 0,
    bounce_rate DECIMAL(5,4) DEFAULT 0.0000,
    avg_session_duration INTEGER DEFAULT 0, -- in seconds
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(variant, date_recorded)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ab_test_sessions_session_id ON ab_test_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_sessions_user_id ON ab_test_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_sessions_variant ON ab_test_sessions(variant);
CREATE INDEX IF NOT EXISTS idx_ab_test_sessions_assigned_at ON ab_test_sessions(assigned_at);

CREATE INDEX IF NOT EXISTS idx_ab_test_events_session_id ON ab_test_events(session_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_events_event_type ON ab_test_events(event_type);
CREATE INDEX IF NOT EXISTS idx_ab_test_events_variant ON ab_test_events(variant);
CREATE INDEX IF NOT EXISTS idx_ab_test_events_timestamp ON ab_test_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_ab_test_events_user_id ON ab_test_events(user_id);

-- Add CHECK constraint for event_type validation
ALTER TABLE ab_test_events ADD CONSTRAINT check_event_type 
CHECK (event_type IN ('page_view', 'button_click', 'form_submit', 'scroll', 'time_spent', 'conversion', 'engagement', 'user_action', 'navigation'));

-- Add composite index for analytics queries
CREATE INDEX IF NOT EXISTS idx_ab_test_events_analytics ON ab_test_events(variant, event_type, timestamp);

CREATE INDEX IF NOT EXISTS idx_ab_test_conversions_session_id ON ab_test_conversions(session_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_conversions_conversion_type ON ab_test_conversions(conversion_type);
CREATE INDEX IF NOT EXISTS idx_ab_test_conversions_variant ON ab_test_conversions(variant);
CREATE INDEX IF NOT EXISTS idx_ab_test_conversions_timestamp ON ab_test_conversions(timestamp);

CREATE INDEX IF NOT EXISTS idx_ab_test_analytics_summary_variant ON ab_test_analytics_summary(variant);
CREATE INDEX IF NOT EXISTS idx_ab_test_analytics_summary_date ON ab_test_analytics_summary(date_recorded);

-- Add comments for documentation
COMMENT ON TABLE ab_test_sessions IS 'Tracks A/B test variant assignments for users and sessions';
COMMENT ON TABLE ab_test_events IS 'Tracks all user interactions and events during A/B testing';
COMMENT ON TABLE ab_test_conversions IS 'Tracks conversion events for A/B test analysis';
COMMENT ON TABLE ab_test_analytics_summary IS 'Pre-aggregated analytics data for A/B test reporting';

-- analytics_events_table.sql
-- SQL script to create the analytics_events table for tracking authentication and verification events

-- Create the analytics_events table
CREATE TABLE IF NOT EXISTS analytics_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,  -- 'signup', 'verification_success', 'verification_failure', etc.
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,  -- Foreign key to users table
    event_data JSONB DEFAULT '{}'::jsonb,  -- Additional event data (OTP attempts, email client info, etc.)
    ip_address VARCHAR(45),  -- Supports both IPv4 and IPv6 addresses
    user_agent TEXT,  -- User's browser and device information
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Additional fields for verification analytics
    verification_code VARCHAR(10),  -- The code sent (hashed or partial for security)
    attempt_count INTEGER DEFAULT 1,  -- Number of attempts for this verification
    success BOOLEAN,  -- Whether the verification was successful
    email_sent BOOLEAN DEFAULT TRUE,  -- Whether an email was sent for this event
    email_delivered BOOLEAN,  -- Whether the email was delivered (if tracking is available)
    time_to_verify INTEGER,  -- Time in seconds between code generation and successful verification
    device_type VARCHAR(20),  -- 'mobile', 'desktop', 'tablet', etc.
    source VARCHAR(50)  -- Where the event originated (specific page or app)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_success ON analytics_events(success);

-- Create view for verification success rate analytics
CREATE OR REPLACE VIEW v_verification_analytics AS
SELECT
    date_trunc('day', created_at) AS day,
    event_type,
    COUNT(*) AS total_events,
    SUM(CASE WHEN success = TRUE THEN 1 ELSE 0 END) AS successful_events,
    CASE 
        WHEN COUNT(*) > 0 THEN 
            ROUND((SUM(CASE WHEN success = TRUE THEN 1 ELSE 0 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
        ELSE 0
    END AS success_rate,
    AVG(CASE WHEN success = TRUE THEN time_to_verify ELSE NULL END) AS avg_verification_time,
    MAX(attempt_count) AS max_attempts,
    AVG(attempt_count) AS avg_attempts
FROM
    analytics_events
WHERE
    event_type IN ('signup', 'verification_success', 'verification_failure')
GROUP BY
    date_trunc('day', created_at),
    event_type
ORDER BY
    day DESC, event_type;

-- Create view for device and source analytics
CREATE OR REPLACE VIEW v_verification_by_device AS
SELECT
    device_type,
    source,
    COUNT(*) AS total_events,
    SUM(CASE WHEN success = TRUE THEN 1 ELSE 0 END) AS successful_events,
    CASE 
        WHEN COUNT(*) > 0 THEN 
            ROUND((SUM(CASE WHEN success = TRUE THEN 1 ELSE 0 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
        ELSE 0
    END AS success_rate
FROM
    analytics_events
WHERE
    event_type IN ('verification_success', 'verification_failure')
    AND device_type IS NOT NULL
GROUP BY
    device_type, source
ORDER BY
    total_events DESC;

-- Create function to calculate weekly analytics summary
CREATE OR REPLACE FUNCTION get_weekly_analytics_summary(start_date DATE DEFAULT NULL, end_date DATE DEFAULT NULL)
RETURNS TABLE (
    metric VARCHAR,
    value NUMERIC
) AS $$
DECLARE
    _start_date DATE;
    _end_date DATE;
BEGIN
    -- Default to last 7 days if dates not provided
    _start_date := COALESCE(start_date, CURRENT_DATE - INTERVAL '7 days');
    _end_date := COALESCE(end_date, CURRENT_DATE);
    
    RETURN QUERY
    
    -- Total signups
    SELECT 'total_signups', COUNT(*)::NUMERIC
    FROM analytics_events
    WHERE event_type = 'signup'
    AND created_at::DATE BETWEEN _start_date AND _end_date
    
    UNION ALL
    
    -- Verification attempts
    SELECT 'verification_attempts', COUNT(*)::NUMERIC
    FROM analytics_events
    WHERE event_type IN ('verification_success', 'verification_failure')
    AND created_at::DATE BETWEEN _start_date AND _end_date
    
    UNION ALL
    
    -- Successful verifications
    SELECT 'successful_verifications', COUNT(*)::NUMERIC
    FROM analytics_events
    WHERE event_type = 'verification_success' AND success = TRUE
    AND created_at::DATE BETWEEN _start_date AND _end_date
    
    UNION ALL
    
    -- Verification success rate
    SELECT 'verification_success_rate',
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((SUM(CASE WHEN success = TRUE THEN 1 ELSE 0 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
            ELSE 0
        END
    FROM analytics_events
    WHERE event_type IN ('verification_success', 'verification_failure')
    AND created_at::DATE BETWEEN _start_date AND _end_date
    
    UNION ALL
    
    -- Average time to verify (in seconds)
    SELECT 'avg_time_to_verify', COALESCE(AVG(time_to_verify), 0)::NUMERIC
    FROM analytics_events
    WHERE event_type = 'verification_success' AND success = TRUE
    AND created_at::DATE BETWEEN _start_date AND _end_date
    
    UNION ALL
    
    -- Average verification attempts
    SELECT 'avg_verification_attempts', COALESCE(AVG(attempt_count), 0)::NUMERIC
    FROM analytics_events
    WHERE event_type IN ('verification_success', 'verification_failure')
    AND created_at::DATE BETWEEN _start_date AND _end_date;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE analytics_events IS 'Stores authentication and verification-related analytics events';
COMMENT ON COLUMN analytics_events.event_type IS 'Type of event: signup, verification_success, verification_failure, etc.';
COMMENT ON COLUMN analytics_events.event_data IS 'Additional JSON data specific to the event type';
COMMENT ON COLUMN analytics_events.verification_code IS 'Verification code (hashed or partial for security)';
COMMENT ON COLUMN analytics_events.time_to_verify IS 'Time in seconds between code generation and verification';
COMMENT ON COLUMN analytics_events.device_type IS 'Device type: mobile, desktop, tablet, etc.';
COMMENT ON COLUMN analytics_events.source IS 'Source of the event: specific page or application';

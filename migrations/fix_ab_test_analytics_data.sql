-- Fix AB Test Analytics Database Issues
-- This script populates the ab_test_analytics_summary table with current data
-- and ensures the data structure matches frontend expectations

-- Step 1: Populate ab_test_analytics_summary with current data
DO $$
DECLARE
    today_date DATE := CURRENT_DATE;
    yesterday_date DATE := CURRENT_DATE - INTERVAL '1 day';
    variant_name TEXT;
BEGIN
    -- Loop through each variant
    FOR variant_name IN SELECT DISTINCT variant FROM ab_test_sessions LOOP
        -- Process today's data
        INSERT INTO ab_test_analytics_summary (
            variant,
            date_recorded,
            total_sessions,
            total_page_views,
            total_conversions,
            conversion_rate,
            unique_users,
            bounce_rate,
            avg_session_duration
        )
        SELECT 
            variant_name,
            today_date,
            COALESCE(session_stats.total_sessions, 0),
            COALESCE(event_stats.total_page_views, 0),
            COALESCE(conversion_stats.total_conversions, 0),
            CASE 
                WHEN COALESCE(session_stats.total_sessions, 0) > 0 THEN 
                    COALESCE(conversion_stats.total_conversions, 0)::NUMERIC / session_stats.total_sessions
                ELSE 0 
            END,
            COALESCE(session_stats.unique_users, 0),
            COALESCE(bounce_stats.bounce_rate, 0),
            COALESCE(duration_stats.avg_duration, 0)
        FROM (
            -- Session stats for today
            SELECT 
                COUNT(DISTINCT session_id) as total_sessions,
                COUNT(DISTINCT user_id) as unique_users
            FROM ab_test_sessions 
            WHERE variant = variant_name 
              AND DATE(assigned_at) = today_date
        ) session_stats
        CROSS JOIN (
            -- Event stats for today
            SELECT 
                COUNT(*) as total_page_views
            FROM ab_test_events 
            WHERE variant = variant_name 
              AND event_type = 'page_view'
              AND DATE(timestamp) = today_date
        ) event_stats
        CROSS JOIN (
            -- Conversion stats for today (if conversions table exists)
            SELECT 
                COALESCE(COUNT(*), 0) as total_conversions
            FROM ab_test_conversions 
            WHERE variant = variant_name 
              AND DATE(timestamp) = today_date
        ) conversion_stats
        CROSS JOIN (
            -- Bounce rate calculation
            SELECT 
                CASE 
                    WHEN COUNT(DISTINCT s.session_id) > 0 THEN
                        COUNT(DISTINCT CASE 
                            WHEN event_counts.event_count <= 1 THEN s.session_id 
                        END)::NUMERIC / COUNT(DISTINCT s.session_id)
                    ELSE 0 
                END as bounce_rate
            FROM ab_test_sessions s
            LEFT JOIN (
                SELECT 
                    session_id, 
                    COUNT(*) as event_count
                FROM ab_test_events 
                WHERE DATE(timestamp) = today_date
                GROUP BY session_id
            ) event_counts ON s.session_id = event_counts.session_id
            WHERE s.variant = variant_name 
              AND DATE(s.assigned_at) = today_date
        ) bounce_stats
        CROSS JOIN (
            -- Average session duration (placeholder - would need session end times)
            SELECT 0 as avg_duration
        ) duration_stats
        ON CONFLICT (variant, date_recorded) 
        DO UPDATE SET
            total_sessions = EXCLUDED.total_sessions,
            total_page_views = EXCLUDED.total_page_views,
            total_conversions = EXCLUDED.total_conversions,
            conversion_rate = EXCLUDED.conversion_rate,
            unique_users = EXCLUDED.unique_users,
            bounce_rate = EXCLUDED.bounce_rate,
            avg_session_duration = EXCLUDED.avg_session_duration,
            updated_at = CURRENT_TIMESTAMP;

        -- Process yesterday's data if it doesn't exist
        INSERT INTO ab_test_analytics_summary (
            variant,
            date_recorded,
            total_sessions,
            total_page_views,
            total_conversions,
            conversion_rate,
            unique_users,
            bounce_rate,
            avg_session_duration
        )
        SELECT 
            variant_name,
            yesterday_date,
            COALESCE(session_stats.total_sessions, 0),
            COALESCE(event_stats.total_page_views, 0),
            COALESCE(conversion_stats.total_conversions, 0),
            CASE 
                WHEN COALESCE(session_stats.total_sessions, 0) > 0 THEN 
                    COALESCE(conversion_stats.total_conversions, 0)::NUMERIC / session_stats.total_sessions
                ELSE 0 
            END,
            COALESCE(session_stats.unique_users, 0),
            COALESCE(bounce_stats.bounce_rate, 0),
            COALESCE(duration_stats.avg_duration, 0)
        FROM (
            SELECT 
                COUNT(DISTINCT session_id) as total_sessions,
                COUNT(DISTINCT user_id) as unique_users
            FROM ab_test_sessions 
            WHERE variant = variant_name 
              AND DATE(assigned_at) = yesterday_date
        ) session_stats
        CROSS JOIN (
            SELECT 
                COUNT(*) as total_page_views
            FROM ab_test_events 
            WHERE variant = variant_name 
              AND event_type = 'page_view'
              AND DATE(timestamp) = yesterday_date
        ) event_stats
        CROSS JOIN (
            SELECT 
                COALESCE(COUNT(*), 0) as total_conversions
            FROM ab_test_conversions 
            WHERE variant = variant_name 
              AND DATE(timestamp) = yesterday_date
        ) conversion_stats
        CROSS JOIN (
            SELECT 
                CASE 
                    WHEN COUNT(DISTINCT s.session_id) > 0 THEN
                        COUNT(DISTINCT CASE 
                            WHEN event_counts.event_count <= 1 THEN s.session_id 
                        END)::NUMERIC / COUNT(DISTINCT s.session_id)
                    ELSE 0 
                END as bounce_rate
            FROM ab_test_sessions s
            LEFT JOIN (
                SELECT 
                    session_id, 
                    COUNT(*) as event_count
                FROM ab_test_events 
                WHERE DATE(timestamp) = yesterday_date
                GROUP BY session_id
            ) event_counts ON s.session_id = event_counts.session_id
            WHERE s.variant = variant_name 
              AND DATE(s.assigned_at) = yesterday_date
        ) bounce_stats
        CROSS JOIN (
            SELECT 0 as avg_duration
        ) duration_stats
        ON CONFLICT (variant, date_recorded) DO NOTHING;

        RAISE NOTICE 'Processed analytics data for variant: %', variant_name;
    END LOOP;
END $$;

-- Step 2: Create ab_test_conversions table if it doesn't exist
CREATE TABLE IF NOT EXISTS ab_test_conversions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    user_id INTEGER,
    variant VARCHAR(50) NOT NULL,
    conversion_type VARCHAR(100) NOT NULL,
    conversion_value DECIMAL(10,2),
    conversion_data JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (session_id) REFERENCES ab_test_sessions(session_id) ON DELETE CASCADE
);

-- Create indexes for ab_test_conversions if table was just created
CREATE INDEX IF NOT EXISTS idx_ab_test_conversions_session_id ON ab_test_conversions(session_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_conversions_variant ON ab_test_conversions(variant);
CREATE INDEX IF NOT EXISTS idx_ab_test_conversions_timestamp ON ab_test_conversions(timestamp);
CREATE INDEX IF NOT EXISTS idx_ab_test_conversions_type ON ab_test_conversions(conversion_type);

-- Step 3: Add some sample conversion data for testing if none exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM ab_test_conversions LIMIT 1) THEN
        -- Add sample conversions based on existing events
        INSERT INTO ab_test_conversions (session_id, variant, conversion_type, conversion_value)
        SELECT DISTINCT 
            session_id,
            variant,
            'form_interaction',
            NULL::DECIMAL(10,2)  -- Cast NULL to proper DECIMAL type
        FROM ab_test_events 
        WHERE event_type = 'page_view' 
        AND random() < 0.1  -- 10% conversion rate for testing
        LIMIT 5;
        
        RAISE NOTICE 'Added sample conversion data for testing';
    END IF;
END $$;

-- Step 4: Verify the data
DO $$
BEGIN
    RAISE NOTICE 'Analytics Summary Verification:';
    RAISE NOTICE '====================================';
END $$;

-- Show current summary data
SELECT 
    variant,
    date_recorded,
    total_sessions,
    total_page_views,
    total_conversions,
    ROUND(conversion_rate::NUMERIC, 4) as conversion_rate,
    unique_users,
    ROUND(bounce_rate::NUMERIC, 4) as bounce_rate
FROM ab_test_analytics_summary 
ORDER BY date_recorded DESC, variant;

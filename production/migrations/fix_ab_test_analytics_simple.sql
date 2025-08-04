-- Simple Fix for AB Test Analytics Data - Populate summary table with actual data
-- This script populates the ab_test_analytics_summary table with existing data

-- Clear existing summary data to start fresh
DELETE FROM ab_test_analytics_summary;

-- Insert summary data for each date and variant combination
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
    session_data.variant,  -- Fix: specify which table's variant column
    session_data.session_date,
    COALESCE(session_data.total_sessions, 0),
    COALESCE(event_data.total_page_views, 0),
    0 as total_conversions,  -- No conversions yet
    0.0 as conversion_rate,  -- No conversions yet
    COALESCE(session_data.unique_users, 0),
    COALESCE(bounce_data.bounce_rate, 0.0),
    0 as avg_session_duration
FROM (
    -- Get session data by date and variant
    SELECT 
        variant,
        DATE(assigned_at) as session_date,
        COUNT(DISTINCT session_id) as total_sessions,
        COUNT(DISTINCT user_id) as unique_users
    FROM ab_test_sessions 
    GROUP BY variant, DATE(assigned_at)
) session_data
LEFT JOIN (
    -- Get event data by date and variant
    SELECT 
        variant,
        DATE(timestamp) as event_date,
        COUNT(*) as total_page_views
    FROM ab_test_events 
    WHERE event_type = 'page_view'
    GROUP BY variant, DATE(timestamp)
) event_data ON session_data.variant = event_data.variant 
                AND session_data.session_date = event_data.event_date
LEFT JOIN (
    -- Calculate bounce rate by date and variant
    SELECT 
        s.variant,
        DATE(s.assigned_at) as bounce_date,
        CASE 
            WHEN COUNT(DISTINCT s.session_id) > 0 THEN
                COUNT(DISTINCT CASE 
                    WHEN COALESCE(event_counts.event_count, 0) <= 1 THEN s.session_id 
                END)::NUMERIC / COUNT(DISTINCT s.session_id)
            ELSE 0 
        END as bounce_rate
    FROM ab_test_sessions s
    LEFT JOIN (
        SELECT 
            session_id, 
            COUNT(*) as event_count
        FROM ab_test_events 
        GROUP BY session_id
    ) event_counts ON s.session_id = event_counts.session_id
    GROUP BY s.variant, DATE(s.assigned_at)
) bounce_data ON session_data.variant = bounce_data.variant 
                 AND session_data.session_date = bounce_data.bounce_date
ORDER BY session_data.session_date DESC, session_data.variant;

-- Show results
SELECT 
    'Summary Data Inserted:' as status,
    COUNT(*) as records_inserted
FROM ab_test_analytics_summary;

-- Show detailed results
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

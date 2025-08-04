// New A2A-based threads implementation
// This file contains the updated GET /api/threads endpoint that uses a2a_chat_sessions

const getA2AThreadsQuery = `
    WITH user_sessions AS (
        SELECT 
            s.id,
            COALESCE(s.title, s.session_name, 'Untitled Chat') as title,
            s.session_name as group_name,
            COALESCE(s.last_active_at, s.updated_at, s.created_at) as last_active_at,
            COALESCE(s.last_active_at, s.updated_at, s.created_at) as last_message_time,
            s.updated_at,
            s.created_at,
            s.agent_type,
            s.is_pinned,
            s.avatar_url,
            s.unread_count,
            
            -- Get the last message content
            last_msg.content AS last_message,
            
            -- Calculate time buckets
            CASE 
                WHEN COALESCE(s.last_active_at, s.updated_at, s.created_at)::date = CURRENT_DATE THEN 'today'
                WHEN COALESCE(s.last_active_at, s.updated_at, s.created_at)::date = CURRENT_DATE - INTERVAL '1 day' THEN 'yesterday'
                WHEN COALESCE(s.last_active_at, s.updated_at, s.created_at) >= CURRENT_DATE - INTERVAL '7 days' THEN 'last7Days'
                ELSE 'older'
            END AS time_bucket
            
        FROM a2a_chat_sessions s
        
        -- Get last message
        LEFT JOIN LATERAL (
            SELECT m.content, m.created_at
            FROM a2a_chat_messages m
            WHERE m.session_id = s.id AND m.is_deleted = false
            ORDER BY m.created_at DESC
            LIMIT 1
        ) last_msg ON true
        
        WHERE s.user_id = $1 AND s.is_active = true
        ORDER BY COALESCE(s.last_active_at, s.updated_at, s.created_at) DESC
    ),
    
    bucketed_sessions AS (
        SELECT 
            us.*,
            ROW_NUMBER() OVER (PARTITION BY time_bucket ORDER BY last_message_time DESC) as bucket_row_num
        FROM user_sessions us
    ),
    
    counts AS (
        SELECT 
            COUNT(*) as total_count,
            COUNT(CASE WHEN is_pinned THEN 1 END) as pinned_count,
            COUNT(CASE WHEN time_bucket = 'today' THEN 1 END) as today_count,
            COUNT(CASE WHEN time_bucket = 'yesterday' THEN 1 END) as yesterday_count,
            COUNT(CASE WHEN time_bucket = 'last7Days' THEN 1 END) as last7days_count,
            COUNT(CASE WHEN time_bucket = 'older' THEN 1 END) as older_count
        FROM user_sessions
    )
    
    SELECT 
        bs.*,
        c.total_count,
        c.pinned_count,
        c.today_count,
        c.yesterday_count,
        c.last7days_count,
        c.older_count
    FROM bucketed_sessions bs
    CROSS JOIN counts c
    WHERE bs.bucket_row_num <= $2
    ORDER BY 
        CASE 
            WHEN bs.is_pinned THEN 0
            WHEN bs.time_bucket = 'today' THEN 1
            WHEN bs.time_bucket = 'yesterday' THEN 2
            WHEN bs.time_bucket = 'last7Days' THEN 3
            WHEN bs.time_bucket = 'older' THEN 4
        END,
        bs.last_message_time DESC
`;

module.exports = { getA2AThreadsQuery };

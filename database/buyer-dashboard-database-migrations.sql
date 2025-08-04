-- Buyer Dashboard Database Migrations
-- Created: July 19, 2025
-- Purpose: Enhance database structure to support comprehensive buyer dashboard functionality

-- ==========================================
-- 1. ADD MISSING COLUMNS TO USERS TABLE
-- ==========================================

-- Add buyer dashboard specific columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS dashboard_preferences JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_dashboard_visit TIMESTAMP,
ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
    "email_alerts": true,
    "browser_notifications": true,
    "sms_alerts": false,
    "alert_frequency": "immediate",
    "meeting_reminders": true,
    "weekly_digest": true
}',
ADD COLUMN IF NOT EXISTS search_preferences JSONB DEFAULT '{
    "default_location": "",
    "default_industries": [],
    "price_range_min": null,
    "price_range_max": null,
    "auto_save_searches": true
}';

-- ==========================================
-- 2. BUYER DASHBOARD ANALYTICS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS buyer_dashboard_analytics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    page_section VARCHAR(100) NOT NULL, -- 'stats', 'alerts', 'meetings', 'activity', etc.
    action_type VARCHAR(100) NOT NULL, -- 'view', 'click', 'hover', 'scroll', etc.
    action_details JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

-- Indexes for buyer_dashboard_analytics
CREATE INDEX IF NOT EXISTS idx_buyer_analytics_user_id ON buyer_dashboard_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_buyer_analytics_session ON buyer_dashboard_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_buyer_analytics_timestamp ON buyer_dashboard_analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_buyer_analytics_action ON buyer_dashboard_analytics(action_type);

-- ==========================================
-- 3. BUYER DASHBOARD WIDGETS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS buyer_dashboard_widgets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    widget_type VARCHAR(50) NOT NULL, -- 'stats', 'alerts', 'meetings', 'activity', 'recommendations'
    widget_position INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT true,
    widget_settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, widget_type)
);

-- Indexes for buyer_dashboard_widgets
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_user ON buyer_dashboard_widgets(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_position ON buyer_dashboard_widgets(widget_position);

-- ==========================================
-- 4. ENHANCE BUYER_ALERTS TABLE
-- ==========================================

-- Add missing columns to buyer_alerts
ALTER TABLE buyer_alerts 
ADD COLUMN IF NOT EXISTS alert_priority VARCHAR(20) DEFAULT 'medium' CHECK (alert_priority IN ('low', 'medium', 'high', 'critical')),
ADD COLUMN IF NOT EXISTS delivery_method JSONB DEFAULT '["dashboard", "email"]',
ADD COLUMN IF NOT EXISTS match_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_match_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS alert_frequency VARCHAR(20) DEFAULT 'immediate' CHECK (alert_frequency IN ('immediate', 'hourly', 'daily', 'weekly')),
ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pause_until TIMESTAMP,
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';

-- ==========================================
-- 5. BUYER ALERT MATCHES TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS buyer_alert_matches (
    id SERIAL PRIMARY KEY,
    alert_id INTEGER NOT NULL REFERENCES buyer_alerts(id) ON DELETE CASCADE,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    match_score DECIMAL(3,2) DEFAULT 0.00, -- 0.00 to 1.00
    match_criteria JSONB NOT NULL,
    is_viewed BOOLEAN DEFAULT false,
    is_dismissed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    viewed_at TIMESTAMP,
    dismissed_at TIMESTAMP,
    
    UNIQUE(alert_id, business_id)
);

-- Indexes for buyer_alert_matches
CREATE INDEX IF NOT EXISTS idx_alert_matches_alert ON buyer_alert_matches(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_matches_business ON buyer_alert_matches(business_id);
CREATE INDEX IF NOT EXISTS idx_alert_matches_score ON buyer_alert_matches(match_score);
CREATE INDEX IF NOT EXISTS idx_alert_matches_viewed ON buyer_alert_matches(is_viewed, created_at);

-- ==========================================
-- 6. BUYER RECOMMENDATIONS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS buyer_recommendations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    recommendation_type VARCHAR(50) NOT NULL, -- 'behavioral', 'similar_searches', 'trending', 'ai_suggested'
    confidence_score DECIMAL(3,2) DEFAULT 0.00,
    reasoning JSONB DEFAULT '{}',
    is_viewed BOOLEAN DEFAULT false,
    is_dismissed BOOLEAN DEFAULT false,
    is_saved BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    viewed_at TIMESTAMP,
    dismissed_at TIMESTAMP,
    expires_at TIMESTAMP
);

-- Indexes for buyer_recommendations
CREATE INDEX IF NOT EXISTS idx_recommendations_user ON buyer_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_business ON buyer_recommendations(business_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_type ON buyer_recommendations(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_recommendations_score ON buyer_recommendations(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_active ON buyer_recommendations(user_id, is_dismissed, expires_at);

-- ==========================================
-- 7. BUYER SEARCH HISTORY TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS buyer_search_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    search_query JSONB NOT NULL,
    search_filters JSONB DEFAULT '{}',
    results_count INTEGER DEFAULT 0,
    clicked_businesses INTEGER[] DEFAULT '{}',
    saved_from_search INTEGER[] DEFAULT '{}',
    search_duration_seconds INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for buyer_search_history
CREATE INDEX IF NOT EXISTS idx_search_history_user ON buyer_search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_session ON buyer_search_history(session_id);
CREATE INDEX IF NOT EXISTS idx_search_history_timestamp ON buyer_search_history(created_at);

-- ==========================================
-- 8. BUYER NOTES TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS buyer_notes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    note_type VARCHAR(50) DEFAULT 'general', -- 'general', 'meeting', 'valuation', 'concerns'
    title VARCHAR(255),
    content TEXT NOT NULL,
    is_private BOOLEAN DEFAULT true,
    tags JSONB DEFAULT '[]',
    reminder_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for buyer_notes
CREATE INDEX IF NOT EXISTS idx_buyer_notes_user ON buyer_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_buyer_notes_business ON buyer_notes(business_id);
CREATE INDEX IF NOT EXISTS idx_buyer_notes_type ON buyer_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_buyer_notes_reminder ON buyer_notes(reminder_date);

-- ==========================================
-- 9. ADD MISSING TABLES REFERENCED IN VIEWS
-- ==========================================

-- Create saved_businesses table if it doesn't exist
CREATE TABLE IF NOT EXISTS saved_businesses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    
    UNIQUE(user_id, business_id)
);

-- Create buyer_activity table if it doesn't exist
CREATE TABLE IF NOT EXISTS buyer_activity (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(100) NOT NULL,
    business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_saved_businesses_user ON saved_businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_businesses_business ON saved_businesses(business_id);
CREATE INDEX IF NOT EXISTS idx_buyer_activity_user ON buyer_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_buyer_activity_type ON buyer_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_buyer_activity_business ON buyer_activity(business_id);

-- ==========================================
-- 10. ENHANCE BUSINESS_MEETINGS TABLE
-- ==========================================

-- Add missing columns to business_meetings
ALTER TABLE business_meetings 
ADD COLUMN IF NOT EXISTS meeting_agenda TEXT,
ADD COLUMN IF NOT EXISTS pre_meeting_notes TEXT,
ADD COLUMN IF NOT EXISTS post_meeting_notes TEXT,
ADD COLUMN IF NOT EXISTS attendees JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS meeting_outcome VARCHAR(50), -- 'interested', 'not_interested', 'follow_up', 'offer_made'
ADD COLUMN IF NOT EXISTS follow_up_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS recording_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5),
ADD COLUMN IF NOT EXISTS feedback TEXT;

-- ==========================================
-- 11. BUYER DASHBOARD STATS VIEW
-- ==========================================

CREATE OR REPLACE VIEW v_buyer_dashboard_stats AS
SELECT 
    u.id as user_id,
    u.username,
    u.buyer_plan,
    u.created_at as account_created,
    
    -- Saved businesses count
    COALESCE(sb.saved_count, 0) as saved_businesses_count,
    
    -- Active alerts count
    COALESCE(ba.active_alerts_count, 0) as active_alerts_count,
    
    -- Total meetings count
    COALESCE(bm.total_meetings, 0) as total_meetings_count,
    
    -- Upcoming meetings count
    COALESCE(bm.upcoming_meetings, 0) as upcoming_meetings_count,
    
    -- Recent activity count (last 30 days)
    COALESCE(activity.recent_activity_count, 0) as recent_activity_count,
    
    -- Search history count
    COALESCE(sh.search_count, 0) as total_searches_count,
    
    -- Recommendations count
    COALESCE(rec.recommendations_count, 0) as active_recommendations_count,
    
    -- Last dashboard visit
    u.last_dashboard_visit,
    
    -- Account metrics
    u.due_diligence_reports_used,
    u.meetings_booked,
    u.is_verified_professional,
    u.professional_type

FROM users u

-- Saved businesses
LEFT JOIN (
    SELECT user_id, COUNT(*) as saved_count
    FROM saved_businesses
    GROUP BY user_id
) sb ON u.id = sb.user_id

-- Active alerts
LEFT JOIN (
    SELECT user_id, COUNT(*) as active_alerts_count
    FROM buyer_alerts
    WHERE is_active = true
    GROUP BY user_id
) ba ON u.id = ba.user_id

-- Meetings
LEFT JOIN (
    SELECT 
        buyer_id,
        COUNT(*) as total_meetings,
        COUNT(CASE WHEN scheduled_at > NOW() AND status = 'scheduled' THEN 1 END) as upcoming_meetings
    FROM business_meetings
    GROUP BY buyer_id
) bm ON u.id = bm.buyer_id

-- Recent activity
LEFT JOIN (
    SELECT user_id, COUNT(*) as recent_activity_count
    FROM buyer_activity
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY user_id
) activity ON u.id = activity.user_id

-- Search history
LEFT JOIN (
    SELECT user_id, COUNT(*) as search_count
    FROM buyer_search_history
    WHERE created_at > NOW() - INTERVAL '90 days'
    GROUP BY user_id
) sh ON u.id = sh.user_id

-- Recommendations
LEFT JOIN (
    SELECT user_id, COUNT(*) as recommendations_count
    FROM buyer_recommendations
    WHERE is_dismissed = false AND (expires_at IS NULL OR expires_at > NOW())
    GROUP BY user_id
) rec ON u.id = rec.user_id;

-- ==========================================
-- 12. RECENT ALERTS VIEW
-- ==========================================

CREATE OR REPLACE VIEW v_buyer_recent_alerts AS
SELECT 
    bam.id,
    bam.alert_id,
    ba.alert_name,
    ba.user_id,
    bam.business_id,
    b.business_name,
    b.industry,
    b.price,
    b.location,
    bam.match_score,
    bam.is_viewed,
    bam.created_at,
    ba.alert_priority,
    ba.criteria
FROM buyer_alert_matches bam
JOIN buyer_alerts ba ON bam.alert_id = ba.id
JOIN businesses b ON bam.business_id = b.id
WHERE ba.is_active = true
ORDER BY bam.created_at DESC;

-- ==========================================
-- 13. UPCOMING MEETINGS VIEW
-- ==========================================

CREATE OR REPLACE VIEW v_buyer_upcoming_meetings AS
SELECT 
    bm.id,
    bm.business_id,
    b.business_name,
    b.industry,
    bm.buyer_id,
    bm.seller_id,
    seller.username as seller_name,
    bm.meeting_type,
    bm.scheduled_at,
    bm.duration_minutes,
    bm.meeting_url,
    bm.meeting_location,
    bm.status,
    bm.payment_status,
    bm.meeting_agenda,
    bm.created_at
FROM business_meetings bm
JOIN businesses b ON bm.business_id = b.id
LEFT JOIN users seller ON bm.seller_id = seller.id
WHERE bm.scheduled_at > NOW() 
  AND bm.status IN ('scheduled', 'confirmed')
ORDER BY bm.scheduled_at ASC;

-- ==========================================
-- 14. BUYER ACTIVITY ENHANCED VIEW
-- ==========================================

CREATE OR REPLACE VIEW v_buyer_recent_activity AS
SELECT 
    ba.id,
    ba.user_id,
    ba.activity_type,
    ba.business_id,
    b.business_name,
    b.industry,
    ba.metadata,
    ba.created_at,
    -- Create human-readable activity description
    CASE 
        WHEN ba.activity_type = 'business_view' THEN 'Viewed ' || COALESCE(b.business_name, 'business')
        WHEN ba.activity_type = 'business_save' THEN 'Saved ' || COALESCE(b.business_name, 'business')
        WHEN ba.activity_type = 'search_performed' THEN 'Performed search'
        WHEN ba.activity_type = 'alert_created' THEN 'Created new alert'
        WHEN ba.activity_type = 'meeting_booked' THEN 'Booked meeting for ' || COALESCE(b.business_name, 'business')
        WHEN ba.activity_type = 'contact_seller' THEN 'Contacted seller of ' || COALESCE(b.business_name, 'business')
        ELSE ba.activity_type
    END as activity_description
FROM buyer_activity ba
LEFT JOIN businesses b ON ba.business_id = b.id
ORDER BY ba.created_at DESC;

-- ==========================================
-- 15. CREATE INDEXES FOR PERFORMANCE
-- ==========================================

-- Additional indexes for better dashboard performance
CREATE INDEX IF NOT EXISTS idx_users_last_dashboard_visit ON users(last_dashboard_visit);
CREATE INDEX IF NOT EXISTS idx_users_buyer_plan ON users(buyer_plan);
CREATE INDEX IF NOT EXISTS idx_users_is_verified ON users(is_verified_professional);

CREATE INDEX IF NOT EXISTS idx_buyer_alerts_priority ON buyer_alerts(alert_priority);
CREATE INDEX IF NOT EXISTS idx_buyer_alerts_frequency ON buyer_alerts(alert_frequency);
CREATE INDEX IF NOT EXISTS idx_buyer_alerts_user_active ON buyer_alerts(user_id, is_active, created_at);

CREATE INDEX IF NOT EXISTS idx_business_meetings_upcoming ON business_meetings(buyer_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_business_meetings_status ON business_meetings(status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_buyer_activity_recent ON buyer_activity(user_id, created_at);

-- ==========================================
-- 16. INSERT DEFAULT DASHBOARD WIDGETS
-- ==========================================

-- Function to create default widgets for new users
CREATE OR REPLACE FUNCTION create_default_buyer_widgets(p_user_id INTEGER)
RETURNS VOID AS $$
BEGIN
    INSERT INTO buyer_dashboard_widgets (user_id, widget_type, widget_position, widget_settings)
    VALUES 
        (p_user_id, 'stats', 1, '{"show_comparisons": true, "time_period": "30_days"}'),
        (p_user_id, 'alerts', 2, '{"max_items": 5, "show_priority": true}'),
        (p_user_id, 'meetings', 3, '{"max_items": 3, "show_agenda": true}'),
        (p_user_id, 'activity', 4, '{"max_items": 4, "group_by_date": false}'),
        (p_user_id, 'recommendations', 5, '{"max_items": 3, "min_confidence": 0.7}')
    ON CONFLICT (user_id, widget_type) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 17. UPDATE EXISTING DATA
-- ==========================================

-- Update existing users with dashboard preferences
UPDATE users 
SET dashboard_preferences = '{
    "theme": "light",
    "compact_view": false,
    "show_tour": true,
    "default_view": "overview"
}'
WHERE dashboard_preferences = '{}' OR dashboard_preferences IS NULL;

-- Create default widgets for existing users
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id FROM users LOOP
        PERFORM create_default_buyer_widgets(user_record.id);
    END LOOP;
END $$;

-- ==========================================
-- 18. BUYER DASHBOARD TRIGGER FUNCTIONS
-- ==========================================

-- Function to update last_dashboard_visit
CREATE OR REPLACE FUNCTION update_last_dashboard_visit()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users 
    SET last_dashboard_visit = CURRENT_TIMESTAMP 
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for dashboard analytics
CREATE TRIGGER trigger_update_dashboard_visit
    AFTER INSERT ON buyer_dashboard_analytics
    FOR EACH ROW
    WHEN (NEW.page_section = 'dashboard' AND NEW.action_type = 'page_load')
    EXECUTE FUNCTION update_last_dashboard_visit();

-- Function to update alert match counts
CREATE OR REPLACE FUNCTION update_alert_match_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE buyer_alerts 
        SET match_count = match_count + 1,
            last_match_date = NEW.created_at
        WHERE id = NEW.alert_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE buyer_alerts 
        SET match_count = GREATEST(match_count - 1, 0)
        WHERE id = OLD.alert_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for alert matches
CREATE TRIGGER trigger_update_alert_counts
    AFTER INSERT OR DELETE ON buyer_alert_matches
    FOR EACH ROW
    EXECUTE FUNCTION update_alert_match_count();

-- ==========================================
-- 19. PERMISSIONS AND SECURITY
-- ==========================================

-- RLS policies for buyer dashboard data
ALTER TABLE buyer_dashboard_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_alert_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_notes ENABLE ROW LEVEL SECURITY;

-- Example RLS policy (adjust based on your authentication system)
-- CREATE POLICY buyer_own_data ON buyer_dashboard_analytics 
--     FOR ALL USING (user_id = current_setting('app.current_user_id')::INTEGER);

-- ==========================================
-- MIGRATION COMPLETE
-- ==========================================

-- Log migration completion
INSERT INTO migration_log (migration_name, executed_at, description) 
VALUES (
    'buyer_dashboard_enhancements', 
    CURRENT_TIMESTAMP, 
    'Enhanced database structure for comprehensive buyer dashboard functionality including analytics, widgets, recommendations, and improved data views'
);

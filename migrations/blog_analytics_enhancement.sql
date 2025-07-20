-- Blog Analytics Enhancement Migration
-- This migration adds analytics tracking fields to blog posts

-- Add fields to support analytics tracking
DO $$
BEGIN
    -- Add bounce_rate if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'blog_posts' AND column_name = 'bounce_rate'
    ) THEN
        ALTER TABLE blog_posts ADD COLUMN bounce_rate NUMERIC(5,2);
    END IF;
    
    -- Add avg_time_on_page if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'blog_posts' AND column_name = 'avg_time_on_page'
    ) THEN
        ALTER TABLE blog_posts ADD COLUMN avg_time_on_page INTEGER; -- Stored in seconds
    END IF;
    
    -- Add click_through_rate if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'blog_posts' AND column_name = 'click_through_rate'
    ) THEN
        ALTER TABLE blog_posts ADD COLUMN click_through_rate NUMERIC(5,2);
    END IF;
    
    -- Add leads_generated if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'blog_posts' AND column_name = 'leads_generated'
    ) THEN
        ALTER TABLE blog_posts ADD COLUMN leads_generated INTEGER DEFAULT 0;
    END IF;
    
    -- Add revenue_generated if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'blog_posts' AND column_name = 'revenue_generated'
    ) THEN
        ALTER TABLE blog_posts ADD COLUMN revenue_generated NUMERIC(10,2) DEFAULT 0;
    END IF;
    
    -- Add social_shares if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'blog_posts' AND column_name = 'social_shares'
    ) THEN
        ALTER TABLE blog_posts ADD COLUMN social_shares INTEGER DEFAULT 0;
    END IF;
    
    -- Add last_updated_by if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'blog_posts' AND column_name = 'last_updated_by'
    ) THEN
        ALTER TABLE blog_posts ADD COLUMN last_updated_by VARCHAR(255);
    END IF;
    
    -- Add search_rankings if it doesn't exist (JSON to store keyword positions)
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'blog_posts' AND column_name = 'search_rankings'
    ) THEN
        ALTER TABLE blog_posts ADD COLUMN search_rankings JSONB;
    END IF;
END $$;

-- Create a new table for tracking blog post performance over time
CREATE TABLE IF NOT EXISTS blog_post_analytics (
    id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES blog_posts(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    views INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    avg_time_on_page INTEGER, -- in seconds
    bounce_rate NUMERIC(5,2),
    click_through_rate NUMERIC(5,2),
    leads_generated INTEGER DEFAULT 0,
    revenue_generated NUMERIC(10,2) DEFAULT 0,
    social_shares INTEGER DEFAULT 0,
    search_rankings JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster analytics queries
CREATE INDEX IF NOT EXISTS blog_post_analytics_post_id_idx ON blog_post_analytics(post_id);
CREATE INDEX IF NOT EXISTS blog_post_analytics_date_idx ON blog_post_analytics(date);

-- Add a function to update blog post analytics from daily stats
CREATE OR REPLACE FUNCTION update_blog_post_analytics()
RETURNS VOID AS $$
BEGIN
    -- Update overall metrics for each blog post
    UPDATE blog_posts bp
    SET 
        avg_time_on_page = subquery.avg_time,
        bounce_rate = subquery.avg_bounce,
        click_through_rate = subquery.avg_ctr,
        leads_generated = subquery.total_leads,
        revenue_generated = subquery.total_revenue,
        social_shares = subquery.total_shares
    FROM (
        SELECT 
            post_id,
            AVG(avg_time_on_page) as avg_time,
            AVG(bounce_rate) as avg_bounce,
            AVG(click_through_rate) as avg_ctr,
            SUM(leads_generated) as total_leads,
            SUM(revenue_generated) as total_revenue,
            SUM(social_shares) as total_shares
        FROM blog_post_analytics
        GROUP BY post_id
    ) as subquery
    WHERE bp.id = subquery.post_id;
END;
$$ LANGUAGE plpgsql;

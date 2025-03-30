-- Add missing tables from 16-03-2025 backup.sql
-- This script will recreate the market_trends_mv materialized view

-- First, drop the view if it exists
DROP MATERIALIZED VIEW IF EXISTS market_trends_mv;

-- Create the market_trends_mv materialized view
CREATE MATERIALIZED VIEW market_trends_mv AS
WITH daily_metrics AS (
    SELECT 
        DATE_TRUNC('day', date_listed) as date,
        industry,
        location,
        AVG(price::numeric) as avg_price,
        COUNT(*) as listings_count,
        AVG(CASE 
            WHEN gross_revenue::numeric > 0 
            THEN price::numeric / gross_revenue::numeric 
            ELSE NULL 
        END) as avg_multiple
    FROM businesses
    WHERE date_listed IS NOT NULL
    GROUP BY DATE_TRUNC('day', date_listed), industry, location
)
SELECT * FROM daily_metrics
ORDER BY date DESC;

-- Create a unique index for refreshing concurrently
CREATE UNIQUE INDEX IF NOT EXISTS market_trends_mv_idx 
ON market_trends_mv (date, industry, location);

-- Grant appropriate permissions
ALTER MATERIALIZED VIEW market_trends_mv OWNER TO marketplace_user;
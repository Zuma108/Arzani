-- First check if the materialized view exists and drop it if it does
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'market_trends_mv') THEN
        DROP MATERIALIZED VIEW market_trends_mv;
    END IF;
END $$;

-- Create the materialized view
CREATE MATERIALIZED VIEW market_trends_mv AS
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
    END) as avg_multiple,
    AVG(gross_revenue::numeric) as avg_gross_revenue,
    AVG(ebitda::numeric) as avg_ebitda,
    NULL::numeric as growth_rate
FROM businesses
WHERE date_listed IS NOT NULL
GROUP BY DATE_TRUNC('day', date_listed), industry, location
ORDER BY date DESC;

-- Create indexes for better performance
CREATE INDEX market_trends_date_idx ON market_trends_mv (date);
CREATE INDEX market_trends_industry_idx ON market_trends_mv (industry);
CREATE INDEX market_trends_location_idx ON market_trends_mv (location);

-- Optional: Add a function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_market_trends_view()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY market_trends_mv;
END;
$$ LANGUAGE plpgsql;

-- Add a comment to explain the view
COMMENT ON MATERIALIZED VIEW market_trends_mv IS 'Aggregated market trends data by day, industry, and location. Includes pricing and growth metrics.';

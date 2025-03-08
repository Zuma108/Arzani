-- Add or modify columns in the businesses table
ALTER TABLE businesses
  -- Add columns if they don't exist
  ADD COLUMN IF NOT EXISTS date_listed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS ebitda NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS industry VARCHAR(100),
  ADD COLUMN IF NOT EXISTS location VARCHAR(255);

-- First, convert price to text to clean it
ALTER TABLE businesses 
  ALTER COLUMN price TYPE TEXT;

-- Then clean and convert to numeric
ALTER TABLE businesses 
  ALTER COLUMN price TYPE NUMERIC USING (
    CASE 
      WHEN price IS NULL THEN 0
      WHEN price = '' THEN 0
      ELSE regexp_replace(price, '[^0-9.]', '', 'g')::numeric
    END
  );

-- Add indices for better query performance
CREATE INDEX IF NOT EXISTS idx_date_listed ON businesses(date_listed);
CREATE INDEX IF NOT EXISTS idx_industry ON businesses(industry);
CREATE INDEX IF NOT EXISTS idx_location ON businesses(location);

-- Add constraint to ensure valid numeric values
ALTER TABLE businesses
  DROP CONSTRAINT IF EXISTS positive_price;

ALTER TABLE businesses
  DROP CONSTRAINT IF EXISTS valid_ebitda;

ALTER TABLE businesses
  ADD CONSTRAINT positive_price CHECK (price >= 0),
  ADD CONSTRAINT valid_ebitda CHECK (ebitda IS NULL OR ebitda >= -999999999);

-- Create a materialized view for faster trend analysis
DROP MATERIALIZED VIEW IF EXISTS market_trends_mv;

CREATE MATERIALIZED VIEW market_trends_mv AS
SELECT 
  DATE_TRUNC('day', date_listed) as date,
  industry,
  location,
  AVG(price) as avg_price,
  COUNT(*) as listings_count,
  AVG(CASE WHEN ebitda != 0 AND price != 0 
      THEN (ebitda / price) 
      ELSE NULL END) as avg_multiple
FROM businesses
GROUP BY 1, 2, 3;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_market_trends_mv_date ON market_trends_mv (date);

-- Create refresh function
CREATE OR REPLACE FUNCTION refresh_market_trends_mv()
RETURNS trigger AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY market_trends_mv;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to refresh materialized view
DROP TRIGGER IF EXISTS refresh_market_trends ON businesses;

CREATE TRIGGER refresh_market_trends
  AFTER INSERT OR UPDATE OR DELETE ON businesses
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_market_trends_mv();

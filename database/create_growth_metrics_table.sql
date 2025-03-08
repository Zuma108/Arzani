-- Create business_growth_metrics table if it doesn't exist
CREATE TABLE IF NOT EXISTS business_growth_metrics (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id),
    date TIMESTAMP DEFAULT NOW(),
    industry VARCHAR(255),
    previous_revenue NUMERIC,
    current_revenue NUMERIC,
    growth_rate NUMERIC,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for the growth metrics table
CREATE INDEX IF NOT EXISTS idx_growth_metrics_industry ON business_growth_metrics(industry);
CREATE INDEX IF NOT EXISTS idx_growth_metrics_date ON business_growth_metrics(date);
CREATE INDEX IF NOT EXISTS idx_growth_metrics_business ON business_growth_metrics(business_id);

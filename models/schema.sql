-- Add this SQL to ensure the industry_metrics table has the correct columns

-- Check if the industry_metrics table exists, and create it if not
CREATE TABLE IF NOT EXISTS industry_metrics (
  id SERIAL PRIMARY KEY,
  industry VARCHAR(100) NOT NULL,
  min_revenue_multiplier DECIMAL(5, 2) DEFAULT 0.5,
  max_revenue_multiplier DECIMAL(5, 2) DEFAULT 2.5,
  avg_revenue_multiplier DECIMAL(5, 2) DEFAULT 1.5,
  avg_ebitda_multiplier DECIMAL(5, 2) DEFAULT 3.5,
  avg_profit_margin DECIMAL(5, 2) DEFAULT 15.0,
  business_count INTEGER DEFAULT 0,
  median_price DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_industry_metrics_industry ON industry_metrics(industry);

-- Insert default metrics if not already present
INSERT INTO industry_metrics 
  (industry, min_revenue_multiplier, max_revenue_multiplier, 
   avg_revenue_multiplier, avg_ebitda_multiplier, avg_profit_margin)
VALUES
  ('Agriculture', 0.5, 2.0, 1.2, 3.0, 12.0),
  ('Automotive & Boat', 0.6, 2.5, 1.4, 3.5, 11.0),
  ('Beauty & Personal Care', 0.7, 2.8, 1.5, 3.2, 14.0),
  ('Building & Construction', 0.5, 2.2, 1.3, 3.4, 10.0),
  ('Communication & Media', 0.8, 3.0, 1.6, 4.0, 15.0),
  ('Education & Children', 0.7, 2.5, 1.5, 3.5, 13.0),
  ('Entertainment & Recreation', 0.8, 3.0, 1.7, 3.8, 16.0),
  ('Financial Services', 0.9, 3.5, 2.0, 4.5, 18.0),
  ('Health Care & Fitness', 0.8, 3.2, 1.8, 4.0, 15.0),
  ('Manufacturing', 0.6, 2.4, 1.4, 3.2, 12.0),
  ('Online & Technology', 1.0, 4.0, 2.2, 5.0, 20.0),
  ('Pet Services', 0.7, 2.6, 1.5, 3.2, 14.0),
  ('Restaurants & Food', 0.5, 2.0, 1.2, 2.8, 10.0),
  ('Retail', 0.5, 2.2, 1.3, 3.0, 12.0),
  ('Service Businesses', 0.7, 2.8, 1.6, 3.5, 15.0),
  ('Transportation & Storage', 0.6, 2.4, 1.4, 3.2, 12.0),
  ('Travel', 0.7, 2.6, 1.5, 3.4, 13.0),
  ('Wholesale & Distributors', 0.6, 2.5, 1.4, 3.3, 11.0),
  ('Other', 0.6, 2.4, 1.4, 3.2, 13.0)
ON CONFLICT (industry) DO NOTHING;

-- Ensure the business_valuations table has the correct columns
CREATE TABLE IF NOT EXISTS business_valuations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  business_name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  min_valuation DECIMAL(12, 2),
  max_valuation DECIMAL(12, 2),
  revenue DECIMAL(12, 2),
  ebitda DECIMAL(12, 2),
  cash_flow DECIMAL(12, 2),
  years_in_operation INTEGER,
  email VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_business_valuations_user_id ON business_valuations(user_id);

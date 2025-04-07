-- Create business_valuations table
CREATE TABLE IF NOT EXISTS business_valuations (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  business_data JSONB NOT NULL,
  valuation_results JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_business_valuations_email ON business_valuations(email);
CREATE INDEX IF NOT EXISTS idx_business_valuations_created_at ON business_valuations(created_at);
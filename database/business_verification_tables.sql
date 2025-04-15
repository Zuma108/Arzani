-- Create table for business verifications
-- Created: April 13, 2025
-- Description: Adds columns and tables needed for the business verification system
CREATE TABLE IF NOT EXISTS business_verifications (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id),
  user_id INTEGER NOT NULL,
  verification_data JSONB NOT NULL,
  weighted_score DECIMAL(5,4),
  confidence_level VARCHAR(20) NOT NULL,
  request_id VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Optional metadata for additional tracking
  processing_time INTEGER,  -- in milliseconds
  model_used VARCHAR(50)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_business_verifications_business_id ON business_verifications(business_id);
CREATE INDEX IF NOT EXISTS idx_business_verifications_user_id ON business_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_business_verifications_confidence ON business_verifications(confidence_level);

-- Add verification fields to businesses table
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS ai_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS ai_verification_date TIMESTAMP;

-- Create table for verification feedback
CREATE TABLE IF NOT EXISTS verification_feedback (
  id SERIAL PRIMARY KEY,
  verification_id INTEGER NOT NULL REFERENCES business_verifications(id),
  user_id INTEGER NOT NULL,
  feedback_type VARCHAR(20) NOT NULL, -- 'accurate', 'inaccurate', 'helpful', 'unhelpful'
  comments TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index for verification feedback
CREATE INDEX IF NOT EXISTS idx_verification_feedback_verification_id ON verification_feedback(verification_id);
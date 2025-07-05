-- Trust and Premium Buyer Features Migration
-- Run this SQL script to add the required database columns

-- Add trust and verification fields to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS seller_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS id_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS financials_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_premium_only BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS financial_verification_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS featured_until TIMESTAMP,
ADD COLUMN IF NOT EXISTS escrow_eligible BOOLEAN DEFAULT FALSE;

-- Add buyer-specific fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS buyer_plan VARCHAR(50) DEFAULT 'free',
ADD COLUMN IF NOT EXISTS buyer_plan_start TIMESTAMP,
ADD COLUMN IF NOT EXISTS buyer_plan_end TIMESTAMP,
ADD COLUMN IF NOT EXISTS early_access_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ai_advisor_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS premium_alerts_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS due_diligence_reports_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS meetings_booked INTEGER DEFAULT 0;

-- Create buyer alerts table
CREATE TABLE IF NOT EXISTS buyer_alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    alert_name VARCHAR(255) NOT NULL,
    criteria JSONB NOT NULL, -- Store filter criteria as JSON
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_triggered TIMESTAMP,
    trigger_count INTEGER DEFAULT 0
);

-- Create saved searches table (if not exists)
CREATE TABLE IF NOT EXISTS saved_searches (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    search_name VARCHAR(255) NOT NULL,
    search_criteria JSONB NOT NULL,
    alert_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create meetings table for booking functionality
CREATE TABLE IF NOT EXISTS business_meetings (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
    buyer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    meeting_type VARCHAR(50) NOT NULL, -- 'call', 'video', 'in-person'
    scheduled_at TIMESTAMP NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    meeting_url VARCHAR(500), -- For video calls
    meeting_location TEXT, -- For in-person meetings
    status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled', 'no-show'
    notes TEXT,
    payment_amount DECIMAL(10,2), -- For paid meetings
    payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'refunded'
    stripe_payment_intent_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create due diligence reports table
CREATE TABLE IF NOT EXISTS due_diligence_reports (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
    buyer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL, -- 'basic', 'comprehensive', 'financial'
    report_data JSONB NOT NULL,
    report_url VARCHAR(500), -- URL to download PDF
    price DECIMAL(10,2) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'pending',
    stripe_payment_intent_id VARCHAR(255),
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    downloaded_at TIMESTAMP,
    expires_at TIMESTAMP
);

-- Create buyer activity tracking table
CREATE TABLE IF NOT EXISTS buyer_activity (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- 'view', 'save', 'contact', 'meeting', 'report'
    business_id INTEGER REFERENCES businesses(id) ON DELETE SET NULL,
    metadata JSONB, -- Additional activity data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create premium access log table
CREATE TABLE IF NOT EXISTS premium_access_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
    access_type VARCHAR(50) NOT NULL, -- 'premium_listing', 'early_access', 'exclusive'
    access_granted BOOLEAN DEFAULT FALSE,
    reason VARCHAR(255), -- Why access was granted/denied
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_businesses_premium ON businesses(is_premium_only, is_featured);
CREATE INDEX IF NOT EXISTS idx_businesses_verification ON businesses(seller_verified, financials_verified);
CREATE INDEX IF NOT EXISTS idx_businesses_price_range ON businesses(price) WHERE price IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_buyer_alerts_user ON buyer_alerts(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_business_meetings_buyer ON business_meetings(buyer_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_business_meetings_business ON business_meetings(business_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_buyer_activity_user ON buyer_activity(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_premium_access_user ON premium_access_log(user_id, business_id);

-- Add some sample data for testing (optional)
-- Update some existing businesses to have verification status
UPDATE businesses 
SET seller_verified = TRUE, 
    verification_date = CURRENT_TIMESTAMP 
WHERE id IN (SELECT id FROM businesses ORDER BY date_listed DESC LIMIT 5);

UPDATE businesses 
SET financials_verified = TRUE, 
    financial_verification_date = CURRENT_TIMESTAMP 
WHERE id IN (SELECT id FROM businesses WHERE seller_verified = TRUE LIMIT 3);

UPDATE businesses 
SET is_featured = TRUE, 
    featured_until = CURRENT_TIMESTAMP + INTERVAL '30 days' 
WHERE id IN (SELECT id FROM businesses ORDER BY date_listed DESC LIMIT 2);

UPDATE businesses 
SET is_premium_only = TRUE 
WHERE price >= 50000;

UPDATE businesses 
SET escrow_eligible = TRUE 
WHERE price >= 10000;

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_buyer_alerts_updated_at BEFORE UPDATE ON buyer_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_saved_searches_updated_at BEFORE UPDATE ON saved_searches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_business_meetings_updated_at BEFORE UPDATE ON business_meetings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;

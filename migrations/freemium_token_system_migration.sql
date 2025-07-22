-- Freemium Token System Database Migration
-- Version: 1.0
-- Date: July 2025
-- Description: Complete database schema for token-based freemium system

-- ============================================================================
-- PHASE 1: Create Core Token Tables
-- ============================================================================

-- Create user_tokens table for balance tracking
CREATE TABLE IF NOT EXISTS user_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_balance INTEGER DEFAULT 0 CHECK (token_balance >= 0),
    tokens_purchased INTEGER DEFAULT 0 CHECK (tokens_purchased >= 0),
    tokens_consumed INTEGER DEFAULT 0 CHECK (tokens_consumed >= 0),
    lifetime_purchased INTEGER DEFAULT 0 CHECK (lifetime_purchased >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one record per user
    UNIQUE(user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tokens_balance ON user_tokens(token_balance) WHERE token_balance > 0;
CREATE INDEX IF NOT EXISTS idx_user_tokens_updated ON user_tokens(updated_at DESC);

-- ============================================================================

-- Create token_transactions table for audit trail
CREATE TABLE IF NOT EXISTS token_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('purchase', 'consumption', 'refund', 'bonus', 'admin_adjustment')),
    tokens_amount INTEGER NOT NULL CHECK (tokens_amount > 0),
    action_type VARCHAR(100), -- 'contact_seller', 'boost_listing', 'premium_analytics', etc.
    reference_id INTEGER, -- business_id, inquiry_id, or other reference
    stripe_payment_intent_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    
    -- Additional context fields
    ip_address INET,
    user_agent TEXT,
    
    -- Ensure valid transaction amounts
    CONSTRAINT chk_transaction_amount CHECK (
        (transaction_type IN ('purchase', 'bonus', 'admin_adjustment') AND tokens_amount > 0) OR
        (transaction_type IN ('consumption', 'refund') AND tokens_amount > 0)
    )
);

-- Create high-performance indexes for transaction queries
CREATE INDEX IF NOT EXISTS idx_token_transactions_user_date ON token_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_transactions_type ON token_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_token_transactions_stripe ON token_transactions(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_token_transactions_action ON token_transactions(action_type) WHERE action_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_token_transactions_reference ON token_transactions(reference_id) WHERE reference_id IS NOT NULL;

-- ============================================================================

-- Create contact_limitations table for freemium tracking
CREATE TABLE IF NOT EXISTS contact_limitations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    contact_count INTEGER DEFAULT 0 CHECK (contact_count >= 0),
    first_contact_at TIMESTAMP,
    last_contact_at TIMESTAMP,
    tokens_spent INTEGER DEFAULT 0 CHECK (tokens_spent >= 0),
    is_free_contact BOOLEAN DEFAULT false,
    monthly_free_used INTEGER DEFAULT 0 CHECK (monthly_free_used >= 0),
    last_free_reset TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint for user-business pairs
    UNIQUE(user_id, business_id)
);

-- Create composite indexes for query optimization
CREATE INDEX IF NOT EXISTS idx_contact_limitations_user_business ON contact_limitations(user_id, business_id);
CREATE INDEX IF NOT EXISTS idx_contact_limitations_user_date ON contact_limitations(user_id, last_contact_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_limitations_business ON contact_limitations(business_id);
CREATE INDEX IF NOT EXISTS idx_contact_limitations_free_reset ON contact_limitations(last_free_reset) WHERE is_free_contact = true;

-- ============================================================================

-- Create token_packages table for pricing management
CREATE TABLE IF NOT EXISTS token_packages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    token_amount INTEGER NOT NULL CHECK (token_amount > 0),
    price_gbp INTEGER NOT NULL CHECK (price_gbp > 0), -- in pence for precision
    bonus_tokens INTEGER DEFAULT 0 CHECK (bonus_tokens >= 0),
    stripe_price_id VARCHAR(255) UNIQUE,
    stripe_product_id VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    recommended BOOLEAN DEFAULT false,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for package queries
CREATE INDEX IF NOT EXISTS idx_token_packages_active ON token_packages(is_active, display_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_token_packages_stripe_price ON token_packages(stripe_price_id) WHERE stripe_price_id IS NOT NULL;

-- ============================================================================
-- PHASE 2: Extend Existing Tables
-- ============================================================================

-- Add token-related fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS token_balance INTEGER DEFAULT 0 CHECK (token_balance >= 0),
ADD COLUMN IF NOT EXISTS free_contacts_used INTEGER DEFAULT 0 CHECK (free_contacts_used >= 0),
ADD COLUMN IF NOT EXISTS free_contacts_reset_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS freemium_tier VARCHAR(20) DEFAULT 'basic' CHECK (freemium_tier IN ('basic', 'premium', 'enterprise')),
ADD COLUMN IF NOT EXISTS token_system_enabled BOOLEAN DEFAULT true;

-- Create index for token balance queries
CREATE INDEX IF NOT EXISTS idx_users_token_balance ON users(token_balance) WHERE token_balance > 0;
CREATE INDEX IF NOT EXISTS idx_users_freemium_tier ON users(freemium_tier);

-- ============================================================================

-- Extend businesses table for seller premium features
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS is_boosted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS boosted_until TIMESTAMP,
ADD COLUMN IF NOT EXISTS boost_level INTEGER DEFAULT 0 CHECK (boost_level BETWEEN 0 AND 3),
ADD COLUMN IF NOT EXISTS boost_tokens_spent INTEGER DEFAULT 0 CHECK (boost_tokens_spent >= 0),
ADD COLUMN IF NOT EXISTS featured_tokens_spent INTEGER DEFAULT 0 CHECK (featured_tokens_spent >= 0),
ADD COLUMN IF NOT EXISTS premium_analytics_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS premium_analytics_until TIMESTAMP;

-- Index for boosted listings query optimization
CREATE INDEX IF NOT EXISTS idx_businesses_boosted ON businesses(is_boosted, boosted_until) WHERE is_boosted = true;
CREATE INDEX IF NOT EXISTS idx_businesses_boost_level ON businesses(boost_level) WHERE boost_level > 0;

-- ============================================================================

-- Extend business_inquiries for token tracking
ALTER TABLE business_inquiries 
ADD COLUMN IF NOT EXISTS tokens_spent INTEGER DEFAULT 0 CHECK (tokens_spent >= 0),
ADD COLUMN IF NOT EXISTS inquiry_type VARCHAR(50) DEFAULT 'free' CHECK (inquiry_type IN ('free', 'token', 'premium')),
ADD COLUMN IF NOT EXISTS contact_attempt_number INTEGER DEFAULT 1 CHECK (contact_attempt_number > 0),
ADD COLUMN IF NOT EXISTS token_transaction_id INTEGER REFERENCES token_transactions(id);

-- Index for token-related inquiry queries
CREATE INDEX IF NOT EXISTS idx_business_inquiries_tokens ON business_inquiries(tokens_spent) WHERE tokens_spent > 0;
CREATE INDEX IF NOT EXISTS idx_business_inquiries_type ON business_inquiries(inquiry_type);

-- ============================================================================
-- PHASE 3: Create Materialized Views for Analytics
-- ============================================================================

-- Token economy analytics view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_token_analytics AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    transaction_type,
    action_type,
    COUNT(*) as transaction_count,
    SUM(tokens_amount) as total_tokens,
    COUNT(DISTINCT user_id) as unique_users,
    AVG(tokens_amount) as avg_tokens_per_transaction
FROM token_transactions
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', created_at), transaction_type, action_type
ORDER BY date DESC, transaction_type;

CREATE INDEX IF NOT EXISTS idx_mv_token_analytics_date ON mv_token_analytics(date DESC);
CREATE INDEX IF NOT EXISTS idx_mv_token_analytics_type ON mv_token_analytics(transaction_type);

-- ============================================================================

-- User token summary view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_token_summary AS
SELECT 
    u.id as user_id,
    u.buyer_plan,
    u.freemium_tier,
    COALESCE(ut.token_balance, 0) as current_balance,
    COALESCE(ut.tokens_purchased, 0) as lifetime_purchased,
    COALESCE(ut.tokens_consumed, 0) as lifetime_consumed,
    COUNT(cl.id) as businesses_contacted,
    SUM(cl.tokens_spent) as tokens_spent_on_contacts,
    u.created_at as user_registration_date,
    ut.updated_at as last_token_activity
FROM users u
LEFT JOIN user_tokens ut ON u.id = ut.user_id
LEFT JOIN contact_limitations cl ON u.id = cl.user_id
WHERE u.token_system_enabled = true
GROUP BY u.id, u.buyer_plan, u.freemium_tier, ut.token_balance, ut.tokens_purchased, ut.tokens_consumed, ut.updated_at;

CREATE INDEX IF NOT EXISTS idx_mv_user_token_summary_user ON mv_user_token_summary(user_id);
CREATE INDEX IF NOT EXISTS idx_mv_user_token_summary_balance ON mv_user_token_summary(current_balance DESC);

-- ============================================================================
-- PHASE 4: Create Triggers for Automatic Updates
-- ============================================================================

-- Function to update user_tokens.updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_tokens_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_tokens table
DROP TRIGGER IF EXISTS trigger_update_user_tokens_timestamp ON user_tokens;
CREATE TRIGGER trigger_update_user_tokens_timestamp
    BEFORE UPDATE ON user_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_user_tokens_timestamp();

-- ============================================================================

-- Function to keep users.token_balance in sync with user_tokens.token_balance
CREATE OR REPLACE FUNCTION sync_user_token_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the users table when user_tokens changes
    UPDATE users 
    SET token_balance = NEW.token_balance 
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for token balance synchronization
DROP TRIGGER IF EXISTS trigger_sync_user_token_balance ON user_tokens;
CREATE TRIGGER trigger_sync_user_token_balance
    AFTER INSERT OR UPDATE ON user_tokens
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_token_balance();

-- ============================================================================
-- PHASE 5: Insert Default Token Packages
-- ============================================================================

-- Insert standard token packages (prices in pence)
INSERT INTO token_packages (name, token_amount, price_gbp, bonus_tokens, display_order, recommended, description)
VALUES 
    ('Starter Pack', 10, 1000, 0, 1, false, 'Perfect for trying premium features'),
    ('Professional Pack', 25, 2500, 5, 2, true, 'Most popular choice for active users'),
    ('Enterprise Pack', 50, 5000, 15, 3, false, 'Best value for power users')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PHASE 6: Create Helper Functions
-- ============================================================================

-- Function to get user token balance efficiently
CREATE OR REPLACE FUNCTION get_user_token_balance(p_user_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    balance INTEGER;
BEGIN
    SELECT COALESCE(token_balance, 0) INTO balance
    FROM user_tokens 
    WHERE user_id = p_user_id;
    
    -- If no record exists, return 0
    IF balance IS NULL THEN
        RETURN 0;
    END IF;
    
    RETURN balance;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================

-- Function to check if user can make free contact this month
CREATE OR REPLACE FUNCTION can_make_free_contact(p_user_id INTEGER, p_business_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    user_plan VARCHAR(20);
    contacts_this_month INTEGER;
    last_reset_date TIMESTAMP;
BEGIN
    -- Get user plan
    SELECT buyer_plan INTO user_plan FROM users WHERE id = p_user_id;
    
    -- Premium users always get free contacts
    IF user_plan = 'premium' THEN
        RETURN TRUE;
    END IF;
    
    -- Check if this business was contacted before
    SELECT COUNT(*), MAX(last_free_reset) 
    INTO contacts_this_month, last_reset_date
    FROM contact_limitations 
    WHERE user_id = p_user_id 
    AND business_id = p_business_id
    AND is_free_contact = true
    AND last_free_reset >= DATE_TRUNC('month', CURRENT_DATE);
    
    -- If no free contacts this month, user can make one
    RETURN contacts_this_month = 0;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PHASE 7: Refresh Materialized Views
-- ============================================================================

-- Refresh materialized views to populate with any existing data
REFRESH MATERIALIZED VIEW mv_token_analytics;
REFRESH MATERIALIZED VIEW mv_user_token_summary;

-- ============================================================================
-- PHASE 8: Create Stripe Webhook Tracking Tables
-- ============================================================================

-- Create table for tracking Stripe webhook events
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
    id SERIAL PRIMARY KEY,
    stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processing_status VARCHAR(50) DEFAULT 'success' CHECK (processing_status IN ('success', 'failed', 'retry')),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0 CHECK (retry_count >= 0),
    raw_data JSONB NOT NULL,
    user_id INTEGER REFERENCES users(id),
    tokens_added INTEGER DEFAULT 0,
    
    -- Ensure we don't process the same event twice
    CONSTRAINT unique_stripe_event UNIQUE(stripe_event_id)
);

-- Create indexes for webhook event queries
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_type ON stripe_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_status ON stripe_webhook_events(processing_status);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed ON stripe_webhook_events(processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_user ON stripe_webhook_events(user_id) WHERE user_id IS NOT NULL;

-- ============================================================================

-- Create table for failed token purchases
CREATE TABLE IF NOT EXISTS failed_token_purchases (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    user_id INTEGER REFERENCES users(id),
    stripe_payment_intent_id VARCHAR(255),
    error_message TEXT NOT NULL,
    session_data JSONB,
    tokens_intended INTEGER DEFAULT 0,
    amount_intended INTEGER DEFAULT 0, -- in pence
    retry_count INTEGER DEFAULT 0,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for failed purchase tracking
CREATE INDEX IF NOT EXISTS idx_failed_purchases_user ON failed_token_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_failed_purchases_session ON failed_token_purchases(session_id);
CREATE INDEX IF NOT EXISTS idx_failed_purchases_unresolved ON failed_token_purchases(resolved) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_failed_purchases_created ON failed_token_purchases(created_at DESC);

-- ============================================================================

-- Create table for payment disputes and chargebacks
CREATE TABLE IF NOT EXISTS payment_disputes (
    id SERIAL PRIMARY KEY,
    stripe_charge_id VARCHAR(255) NOT NULL,
    stripe_dispute_id VARCHAR(255),
    user_id INTEGER REFERENCES users(id),
    amount INTEGER NOT NULL, -- in pence
    reason VARCHAR(255),
    status VARCHAR(50) DEFAULT 'open',
    tokens_to_deduct INTEGER DEFAULT 0,
    tokens_deducted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

-- Create indexes for dispute tracking
CREATE INDEX IF NOT EXISTS idx_payment_disputes_charge ON payment_disputes(stripe_charge_id);
CREATE INDEX IF NOT EXISTS idx_payment_disputes_user ON payment_disputes(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_disputes_status ON payment_disputes(status);
CREATE INDEX IF NOT EXISTS idx_payment_disputes_unresolved ON payment_disputes(status) WHERE status = 'open';

-- ============================================================================
-- PHASE 9: Grant Permissions
-- ============================================================================

-- Grant necessary permissions (adjust according to your application user)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO app_user;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log successful migration
DO $$
BEGIN
    RAISE NOTICE 'Freemium Token System Migration Completed Successfully at %', NOW();
    RAISE NOTICE 'Tables Created: user_tokens, token_transactions, contact_limitations, token_packages';
    RAISE NOTICE 'Views Created: mv_token_analytics, mv_user_token_summary';
    RAISE NOTICE 'Functions Created: get_user_token_balance, can_make_free_contact';
    RAISE NOTICE 'Triggers Created: Token balance sync and timestamp updates';
END $$;

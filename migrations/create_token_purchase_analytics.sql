-- Create purchase analytics table
CREATE TABLE IF NOT EXISTS purchase_analytics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    package_id INTEGER,
    amount_paid INTEGER, -- in pence/cents
    tokens_received INTEGER,
    stripe_session_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_purchase_analytics_user_id ON purchase_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_analytics_created_at ON purchase_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_purchase_analytics_stripe_session ON purchase_analytics(stripe_session_id);

-- Create token_transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS token_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, -- positive for additions, negative for deductions
    transaction_type VARCHAR(50) NOT NULL, -- 'purchase', 'usage', 'refund', 'bonus', etc.
    balance_after INTEGER NOT NULL,
    source VARCHAR(100), -- 'stripe_purchase', 'contact_seller', 'admin_credit', etc.
    reference_id VARCHAR(255), -- external reference (stripe session, contact id, etc.)
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for token transactions
CREATE INDEX IF NOT EXISTS idx_token_transactions_user_id ON token_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_token_transactions_created_at ON token_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_token_transactions_type ON token_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_token_transactions_source ON token_transactions(source);

-- Ensure users table has token_balance column
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_balance INTEGER DEFAULT 0;

-- Create index on token_balance for performance
CREATE INDEX IF NOT EXISTS idx_users_token_balance ON users(token_balance);

-- Add some helpful comments
COMMENT ON TABLE purchase_analytics IS 'Analytics data for token package purchases';
COMMENT ON TABLE token_transactions IS 'All token balance changes (purchases, usage, refunds, etc.)';
COMMENT ON COLUMN users.token_balance IS 'Current token balance for the user';

-- Create a view for easy purchase analytics
CREATE OR REPLACE VIEW v_purchase_summary AS
SELECT 
    pa.id,
    pa.user_id,
    u.email,
    u.name,
    pa.package_id,
    pa.amount_paid::decimal / 100 as amount_paid_gbp,
    pa.tokens_received,
    pa.amount_paid::decimal / pa.tokens_received as cost_per_token_pence,
    pa.stripe_session_id,
    pa.created_at,
    pa.metadata
FROM purchase_analytics pa
LEFT JOIN users u ON pa.user_id = u.id
ORDER BY pa.created_at DESC;
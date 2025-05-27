-- Create table to track valuation payments
CREATE TABLE IF NOT EXISTS valuation_payments (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    client_reference VARCHAR(255),
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL,
    amount INTEGER,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_valuation_payments_user_id ON valuation_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_valuation_payments_status ON valuation_payments(status);
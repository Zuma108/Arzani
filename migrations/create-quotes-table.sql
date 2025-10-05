-- Create quotes table
CREATE TABLE IF NOT EXISTS quotes (
    id SERIAL PRIMARY KEY,
    professional_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    
    -- Quote details
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    items JSONB DEFAULT '[]'::jsonb,
    
    -- Terms and conditions
    valid_until DATE,
    payment_terms VARCHAR(50) DEFAULT 'full_upfront',
    notes TEXT,
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'paid', 'expired', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP,
    declined_at TIMESTAMP,
    paid_at TIMESTAMP,
    decline_reason TEXT,
    
    -- Stripe integration
    stripe_payment_intent_id VARCHAR(255),
    
    -- Indexes
    UNIQUE(id),
    INDEX idx_quotes_professional (professional_id),
    INDEX idx_quotes_client (client_id),
    INDEX idx_quotes_conversation (conversation_id),
    INDEX idx_quotes_status (status),
    INDEX idx_quotes_created (created_at DESC)
);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_quotes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_quotes_updated_at
    BEFORE UPDATE ON quotes
    FOR EACH ROW
    EXECUTE FUNCTION update_quotes_updated_at();

-- Add quote_id column to messages table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'quote_id') THEN
        ALTER TABLE messages ADD COLUMN quote_id INTEGER REFERENCES quotes(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_messages_quote ON messages(quote_id);
    END IF;
END $$;

-- Add message_type column to messages table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'message_type') THEN
        ALTER TABLE messages ADD COLUMN message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'quote', 'quote_accepted', 'quote_declined', 'quote_paid', 'system'));
        CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type);
    END IF;
END $$;

-- Add Stripe Connect account ID to users table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'stripe_connect_account_id') THEN
        ALTER TABLE users ADD COLUMN stripe_connect_account_id VARCHAR(255);
        CREATE INDEX IF NOT EXISTS idx_users_stripe_connect ON users(stripe_connect_account_id);
    END IF;
END $$;

-- Add professional verification fields if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_verified_professional') THEN
        ALTER TABLE users ADD COLUMN is_verified_professional BOOLEAN DEFAULT FALSE;
        CREATE INDEX IF NOT EXISTS idx_users_verified_professional ON users(is_verified_professional);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'professional_verification_date') THEN
        ALTER TABLE users ADD COLUMN professional_verification_date TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'professional_type') THEN
        ALTER TABLE users ADD COLUMN professional_type VARCHAR(100);
    END IF;
END $$;
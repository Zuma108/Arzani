-- Migration to create newsletter_subscribers table
-- Created: April 7, 2025

-- Table to store newsletter subscriber information
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    source VARCHAR(100) DEFAULT 'website',
    subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unsubscribed_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    last_email_sent TIMESTAMP,
    preferences JSONB DEFAULT '{}'::jsonb,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT unique_email UNIQUE (email)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_active ON newsletter_subscribers(is_active);

-- Add an unsubscribe token for secure opt-out
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS unsubscribe_token VARCHAR(64);

-- Add a function to generate a random token
CREATE OR REPLACE FUNCTION generate_unsubscribe_token() RETURNS TRIGGER AS $$
BEGIN
    NEW.unsubscribe_token := encode(gen_random_bytes(32), 'hex');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically set the unsubscribe token for new subscribers
CREATE TRIGGER set_unsubscribe_token
BEFORE INSERT ON newsletter_subscribers
FOR EACH ROW
EXECUTE FUNCTION generate_unsubscribe_token();

-- Comment for the migration
COMMENT ON TABLE newsletter_subscribers IS 'Stores contacts who have subscribed to the Arzani newsletter';
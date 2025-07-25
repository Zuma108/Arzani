-- Fix for newsletter_subscribers table - Remove dependency on gen_random_bytes
-- Run this to fix the trigger function

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS set_unsubscribe_token ON newsletter_subscribers;
DROP FUNCTION IF EXISTS generate_unsubscribe_token();

-- Create a simpler function using available PostgreSQL functions
CREATE OR REPLACE FUNCTION generate_unsubscribe_token() RETURNS TRIGGER AS $$
BEGIN
    -- Use md5 with random() and current timestamp for token generation
    NEW.unsubscribe_token := md5(random()::text || clock_timestamp()::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER set_unsubscribe_token
BEFORE INSERT ON newsletter_subscribers
FOR EACH ROW
EXECUTE FUNCTION generate_unsubscribe_token();

-- Update existing rows that might not have tokens
UPDATE newsletter_subscribers 
SET unsubscribe_token = md5(random()::text || clock_timestamp()::text)
WHERE unsubscribe_token IS NULL;

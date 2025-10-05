-- Add token_balance column to users table
-- Migration: add_token_balance_column.sql
-- Date: 2025-09-29

-- Add token_balance column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_balance INTEGER DEFAULT 0;

-- Update existing users to have a default balance of 0
UPDATE users SET token_balance = 0 WHERE token_balance IS NULL;

-- Add index for performance on token balance queries
CREATE INDEX IF NOT EXISTS idx_users_token_balance ON users(token_balance);

-- Comment for the column
COMMENT ON COLUMN users.token_balance IS 'Current token balance for the user';
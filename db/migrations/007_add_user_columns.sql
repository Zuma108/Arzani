-- Add missing columns to users table

-- Add last_login column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'last_login'
    ) THEN
        ALTER TABLE users ADD COLUMN last_login TIMESTAMP;
    END IF;
END $$;

-- Add role column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'role'
    ) THEN
        ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user';
    END IF;
END $$;

-- Create an index on last_login for better query performance
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);

-- Update existing users to have the default role
UPDATE users SET role = 'user' WHERE role IS NULL;

-- Ensure admin role exists for at least one user (user ID 1 is usually the first created account)
UPDATE users SET role = 'admin' WHERE id = 1 AND EXISTS (SELECT 1 FROM users WHERE id = 1);

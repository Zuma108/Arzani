-- Add last_active column to users table for tracking user activity

-- Add last_active column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'last_active'
    ) THEN
        ALTER TABLE users ADD COLUMN last_active TIMESTAMP;
        
        -- Initialize with created_at value for existing users
        UPDATE users SET last_active = created_at WHERE last_active IS NULL;
    END IF;
END $$;

-- Create an index on last_active for better query performance
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active);

-- Create or replace function to update last_active
CREATE OR REPLACE FUNCTION update_user_last_active()
RETURNS TRIGGER AS $$
BEGIN
    -- Determine which table triggered this function and use appropriate column
    IF TG_TABLE_NAME = 'conversation_participants' THEN
        UPDATE users SET last_active = NOW() WHERE id = NEW.user_id;
    ELSIF TG_TABLE_NAME = 'messages' THEN
        UPDATE users SET last_active = NOW() WHERE id = NEW.sender_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger on conversation_participants to update last_active when user reads messages
DROP TRIGGER IF EXISTS trg_update_user_last_active_on_read ON conversation_participants;
CREATE TRIGGER trg_update_user_last_active_on_read
AFTER UPDATE OF last_read_at ON conversation_participants
FOR EACH ROW
WHEN (NEW.last_read_at IS DISTINCT FROM OLD.last_read_at)
EXECUTE FUNCTION update_user_last_active();

-- Create a trigger on messages to update last_active when user sends a message
DROP TRIGGER IF EXISTS trg_update_user_last_active_on_message ON messages;
CREATE TRIGGER trg_update_user_last_active_on_message
AFTER INSERT ON messages
FOR EACH ROW
WHEN (NEW.sender_id IS NOT NULL)
EXECUTE FUNCTION update_user_last_active();

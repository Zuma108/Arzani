-- Fix database schema issues for conversation persistence
-- This script addresses the missing columns and constraints causing 500 errors

-- 1. Add missing is_ai_generated column to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE;

-- Update existing messages to set appropriate values
UPDATE messages 
SET is_ai_generated = CASE 
    WHEN message_type = 'assistant' OR sender_type = 'assistant' THEN TRUE
    WHEN message_type = 'user' OR sender_type = 'user' THEN FALSE
    ELSE FALSE
END
WHERE is_ai_generated IS NULL;

-- 2. Add missing columns to messages table if they don't exist
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) DEFAULT 'user';

ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS agent_type VARCHAR(50) DEFAULT 'orchestrator';

ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS sender_type VARCHAR(20) DEFAULT 'user';

-- Update existing records to have proper message_type values
UPDATE messages 
SET message_type = CASE 
    WHEN is_ai_generated = TRUE THEN 'assistant'
    ELSE 'user'
END
WHERE message_type IS NULL OR message_type = '';

-- 3. Fix a2a_agent_interactions table constraint issue
-- Make interaction_id nullable or provide a default value
ALTER TABLE a2a_agent_interactions 
ALTER COLUMN interaction_id DROP NOT NULL;

-- Alternatively, if we want to keep it NOT NULL, we can add a default
-- ALTER TABLE a2a_agent_interactions 
-- ALTER COLUMN interaction_id SET DEFAULT gen_random_uuid();

-- 4. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_type ON messages(sender_type);
CREATE INDEX IF NOT EXISTS idx_messages_message_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at);

-- 5. Add any missing columns to conversations table for AI chat support
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS is_ai_chat BOOLEAN DEFAULT FALSE;

-- Update existing AI conversations
UPDATE conversations 
SET is_ai_chat = TRUE 
WHERE group_name LIKE '%Arzani%' OR group_name LIKE '%Chat%' OR group_name LIKE '%AI%';

-- 6. Ensure proper permissions and constraints
-- Add constraint to ensure message_type has valid values
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'messages_message_type_check'
    ) THEN
        ALTER TABLE messages 
        ADD CONSTRAINT messages_message_type_check 
        CHECK (message_type IN ('user', 'assistant', 'system'));
    END IF;
END $$;

-- Add constraint to ensure sender_type has valid values
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'messages_sender_type_check'
    ) THEN
        ALTER TABLE messages 
        ADD CONSTRAINT messages_sender_type_check 
        CHECK (sender_type IN ('user', 'assistant', 'system'));
    END IF;
END $$;

-- 7. Create or update the trigger for updating conversation timestamp
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET updated_at = NEW.created_at 
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the trigger to ensure it works properly
DROP TRIGGER IF EXISTS update_conversation_on_message ON messages;
CREATE TRIGGER update_conversation_on_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_timestamp();

-- 8. Add any missing columns to conversation_participants table
ALTER TABLE conversation_participants 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

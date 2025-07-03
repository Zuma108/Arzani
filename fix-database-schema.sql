-- Fix missing columns for message persistence
-- Date: June 13, 2025

-- Add missing is_ai_generated column to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT false;

-- Update existing assistant/system messages to be marked as AI generated
UPDATE messages 
SET is_ai_generated = true 
WHERE message_type IN ('assistant', 'system') OR sender_id IS NULL;

-- Add missing agent_type column to messages table if it doesn't exist
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS agent_type VARCHAR(50) DEFAULT 'orchestrator';

-- Make task_id nullable in a2a_agent_interactions to fix constraint issues
ALTER TABLE a2a_agent_interactions 
ALTER COLUMN task_id DROP NOT NULL;

-- Make interaction_id nullable in a2a_agent_interactions to fix constraint issues  
ALTER TABLE a2a_agent_interactions 
ALTER COLUMN interaction_id DROP NOT NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_is_ai_generated ON messages(is_ai_generated);
CREATE INDEX IF NOT EXISTS idx_messages_agent_type ON messages(agent_type);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at);

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND column_name IN ('is_ai_generated', 'agent_type')
ORDER BY column_name;

SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'a2a_agent_interactions' 
AND column_name IN ('task_id', 'interaction_id')
ORDER BY column_name;

-- Simple database fix for conversation sidebar issues
-- This script can be easily imported through pgAdmin

-- Add missing columns to conversations table
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS title VARCHAR(255),
ADD COLUMN IF NOT EXISTS last_message TEXT,
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP WITHOUT TIME ZONE,
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS agent_type VARCHAR(100) DEFAULT 'orchestrator';

-- Add unread_count to conversation_participants
ALTER TABLE conversation_participants 
ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0;

-- Update existing data
UPDATE conversations 
SET title = COALESCE(group_name, 'Untitled Chat')
WHERE title IS NULL OR title = '';

-- Update last_message info from messages table
UPDATE conversations 
SET 
  last_message = subq.content,
  last_message_at = subq.created_at
FROM (
  SELECT DISTINCT ON (conversation_id) 
    conversation_id, 
    content, 
    created_at
  FROM messages 
  ORDER BY conversation_id, created_at DESC
) subq
WHERE conversations.id = subq.conversation_id
AND (conversations.last_message IS NULL OR conversations.last_message_at IS NULL);

-- Set agent_type for AI conversations
UPDATE conversations 
SET agent_type = 'orchestrator'
WHERE is_ai_chat = TRUE AND (agent_type IS NULL OR agent_type = '');

-- Update conversation updated_at when messages are inserted
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations 
  SET 
    last_message = NEW.content,
    last_message_at = NEW.created_at,
    updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  
  UPDATE conversation_participants 
  SET unread_count = unread_count + 1
  WHERE conversation_id = NEW.conversation_id 
  AND user_id != NEW.sender_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to maintain last_message info
DROP TRIGGER IF EXISTS update_conversation_on_message_trigger ON messages;
CREATE TRIGGER update_conversation_on_message_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at 
ON conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_user_agent 
ON conversations(agent_type, is_ai_chat);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_unread 
ON conversation_participants(user_id, unread_count);

-- Ensure all conversations have at least one participant
INSERT INTO conversation_participants (conversation_id, user_id, joined_at, is_admin)
SELECT DISTINCT 
  c.id,
  COALESCE(c.user_id, 1) as user_id,
  c.created_at,
  TRUE
FROM conversations c
WHERE c.id NOT IN (
  SELECT DISTINCT conversation_id 
  FROM conversation_participants
)
ON CONFLICT (conversation_id, user_id) DO NOTHING;

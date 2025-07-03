-- Fix A2A Chat Messages Schema - Add message_id for client tracking
-- This fixes the concurrent issue where client-generated message IDs aren't stored

-- Add message_id column to store client-generated message IDs
ALTER TABLE a2a_chat_messages 
ADD COLUMN IF NOT EXISTS message_id VARCHAR(255);

-- Add index for fast lookups by message_id
CREATE INDEX IF NOT EXISTS idx_a2a_chat_messages_message_id 
ON a2a_chat_messages(message_id);

-- Add composite index for user + message_id lookups (for editing)
CREATE INDEX IF NOT EXISTS idx_a2a_chat_messages_session_message_id 
ON a2a_chat_messages(session_id, message_id);

-- Update existing messages to have message IDs if they don't have them
UPDATE a2a_chat_messages 
SET message_id = 'msg-' || EXTRACT(EPOCH FROM created_at)::bigint || '-' || id
WHERE message_id IS NULL;

-- Add constraint to ensure message_id is unique within a session
ALTER TABLE a2a_chat_messages 
ADD CONSTRAINT unique_message_id_per_session 
UNIQUE (session_id, message_id);

-- Add comment to document the purpose
COMMENT ON COLUMN a2a_chat_messages.message_id IS 'Client-generated message ID for frontend DOM tracking and editing functionality';

-- A2A Chat Messages Data Migration Script
-- Fix inconsistency between 'content' and 'message_content' columns
-- Migrate all messages to use 'message_content' as the primary column

-- First, let's check the current state
SELECT 
    COUNT(*) as total_messages,
    COUNT(CASE WHEN message_content IS NOT NULL THEN 1 END) as has_message_content,
    COUNT(CASE WHEN content IS NOT NULL THEN 1 END) as has_content,
    COUNT(CASE WHEN message_content IS NOT NULL AND content IS NOT NULL THEN 1 END) as has_both,
    COUNT(CASE WHEN message_content IS NULL AND content IS NULL THEN 1 END) as has_neither
FROM a2a_chat_messages;

-- Show messages that need migration (have content but no message_content)
SELECT id, session_id, sender_type, agent_type, 
       LENGTH(content) as content_length,
       created_at
FROM a2a_chat_messages 
WHERE content IS NOT NULL AND message_content IS NULL
ORDER BY created_at;

-- Begin transaction for safe migration
BEGIN;

-- Step 1: Migrate content to message_content for messages that only have content
UPDATE a2a_chat_messages 
SET message_content = content,
    updated_at = CURRENT_TIMESTAMP
WHERE content IS NOT NULL 
  AND message_content IS NULL;

-- Step 2: For any messages that have both (shouldn't happen but safety check)
-- Keep message_content as primary, but backup content to metadata if different
UPDATE a2a_chat_messages 
SET metadata = jsonb_set(
    COALESCE(metadata, '{}'),
    '{legacy_content}',
    to_jsonb(content)
),
updated_at = CURRENT_TIMESTAMP
WHERE content IS NOT NULL 
  AND message_content IS NOT NULL 
  AND content != message_content;

-- Step 3: Clear the legacy content column (optional - can be done later)
-- UPDATE a2a_chat_messages SET content = NULL WHERE message_content IS NOT NULL;

-- Verify the migration
SELECT 
    COUNT(*) as total_messages,
    COUNT(CASE WHEN message_content IS NOT NULL THEN 1 END) as has_message_content,
    COUNT(CASE WHEN content IS NOT NULL THEN 1 END) as has_content,
    COUNT(CASE WHEN message_content IS NULL AND content IS NULL THEN 1 END) as has_neither
FROM a2a_chat_messages;

-- Show any remaining messages without message_content
SELECT id, session_id, sender_type, agent_type, created_at
FROM a2a_chat_messages 
WHERE message_content IS NULL
ORDER BY created_at;

-- COMMIT the transaction if everything looks good
-- COMMIT;
-- ROLLBACK; -- Use this instead if something went wrong

-- Fix Sidebar Conversations Database Issues
-- This script addresses conversation title, preview, and data storage issues

-- =============================================================================
-- ADD MISSING COLUMNS TO CONVERSATIONS TABLE
-- =============================================================================

-- Add title column if missing (separate from group_name for better semantics)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversations' AND column_name = 'title'
    ) THEN
        ALTER TABLE conversations ADD COLUMN title VARCHAR(255);
        RAISE NOTICE 'Added title column to conversations';
        
        -- Update existing conversations to have titles based on group_name
        UPDATE conversations 
        SET title = COALESCE(group_name, 'Untitled Chat')
        WHERE title IS NULL;
    END IF;
END $$;

-- Add last_message column for quick access (denormalized for performance)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversations' AND column_name = 'last_message'
    ) THEN
        ALTER TABLE conversations ADD COLUMN last_message TEXT;
        RAISE NOTICE 'Added last_message column to conversations';
    END IF;
END $$;

-- Add last_message_at column for quick sorting
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversations' AND column_name = 'last_message_at'
    ) THEN
        ALTER TABLE conversations ADD COLUMN last_message_at TIMESTAMP WITHOUT TIME ZONE;
        RAISE NOTICE 'Added last_message_at column to conversations';
    END IF;
END $$;

-- Add is_pinned column for pinning functionality
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversations' AND column_name = 'is_pinned'
    ) THEN
        ALTER TABLE conversations ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_pinned column to conversations';
    END IF;
END $$;

-- Add unread_count column to conversation_participants
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversation_participants' AND column_name = 'unread_count'
    ) THEN
        ALTER TABLE conversation_participants ADD COLUMN unread_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added unread_count column to conversation_participants';
    END IF;
END $$;

-- Add agent_type column to conversations for AI chat identification
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversations' AND column_name = 'agent_type'
    ) THEN
        ALTER TABLE conversations ADD COLUMN agent_type VARCHAR(100) DEFAULT 'orchestrator';
        RAISE NOTICE 'Added agent_type column to conversations';
    END IF;
END $$;

-- =============================================================================
-- UPDATE EXISTING DATA
-- =============================================================================

-- Update conversations with missing titles
UPDATE conversations 
SET title = COALESCE(group_name, 'Untitled Chat')
WHERE title IS NULL OR title = '';

-- Update conversations with last message info from messages table
UPDATE conversations 
SET 
    last_message = (
        SELECT content 
        FROM messages 
        WHERE messages.conversation_id = conversations.id 
        ORDER BY created_at DESC 
        LIMIT 1
    ),
    last_message_at = (
        SELECT created_at 
        FROM messages 
        WHERE messages.conversation_id = conversations.id 
        ORDER BY created_at DESC 
        LIMIT 1
    )
WHERE last_message IS NULL;

-- Set default agent_type for AI chats
UPDATE conversations 
SET agent_type = 'orchestrator'
WHERE is_ai_chat = TRUE AND agent_type IS NULL;

-- =============================================================================
-- CREATE INDEXES FOR BETTER PERFORMANCE
-- =============================================================================

-- Index for conversation listing and search
CREATE INDEX IF NOT EXISTS idx_conversations_user_last_message 
ON conversations(last_message_at DESC) 
WHERE is_archived IS NOT TRUE;

-- Index for pinned conversations
CREATE INDEX IF NOT EXISTS idx_conversations_pinned 
ON conversations(is_pinned, last_message_at DESC) 
WHERE is_pinned = TRUE;

-- Index for AI chat conversations
CREATE INDEX IF NOT EXISTS idx_conversations_ai_chat 
ON conversations(is_ai_chat, agent_type, last_message_at DESC) 
WHERE is_ai_chat = TRUE;

-- Index for conversation participants with unread counts
CREATE INDEX IF NOT EXISTS idx_conversation_participants_unread 
ON conversation_participants(user_id, unread_count) 
WHERE unread_count > 0;

-- Index for conversation participants access
CREATE INDEX IF NOT EXISTS idx_conversation_participants_access 
ON conversation_participants(conversation_id, user_id);

-- =============================================================================
-- CREATE TRIGGERS TO MAINTAIN DATA CONSISTENCY
-- =============================================================================

-- Function to update conversation last_message info when messages are inserted
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the conversation's last message info
    UPDATE conversations 
    SET 
        last_message = NEW.content,
        last_message_at = NEW.created_at,
        updated_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    
    -- Increment unread count for all participants except the sender
    UPDATE conversation_participants 
    SET unread_count = unread_count + 1
    WHERE conversation_id = NEW.conversation_id 
    AND user_id != NEW.sender_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for message insertions
DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON messages;
CREATE TRIGGER trigger_update_conversation_last_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_last_message();

-- Function to reset unread count when participant reads conversation
CREATE OR REPLACE FUNCTION reset_unread_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Reset unread count when last_read_at is updated
    IF OLD.last_read_at IS DISTINCT FROM NEW.last_read_at THEN
        NEW.unread_count = 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for conversation participants updates
DROP TRIGGER IF EXISTS trigger_reset_unread_count ON conversation_participants;
CREATE TRIGGER trigger_reset_unread_count
    BEFORE UPDATE ON conversation_participants
    FOR EACH ROW
    EXECUTE FUNCTION reset_unread_count();

-- =============================================================================
-- CREATE HELPER VIEWS FOR SIDEBAR DATA
-- =============================================================================

-- View for easy conversation listing with all sidebar info
CREATE OR REPLACE VIEW v_conversation_sidebar AS
SELECT 
    c.id,
    c.title,
    c.group_name,
    c.is_ai_chat,
    c.agent_type,
    c.business_id,
    c.created_at,
    c.updated_at,
    c.last_message,
    c.last_message_at,
    c.is_pinned,
    
    -- Time bucketing for sidebar organization
    CASE 
        WHEN c.last_message_at IS NULL THEN 'older'
        WHEN c.last_message_at::date = CURRENT_DATE THEN 'today'
        WHEN c.last_message_at::date = CURRENT_DATE - INTERVAL '1 day' THEN 'yesterday'
        WHEN c.last_message_at >= CURRENT_DATE - INTERVAL '7 days' THEN 'last7Days'
        ELSE 'older'
    END AS time_bucket,
    
    -- Business info if available
    b.business_name,
    
    -- Participant info (for user-specific data)
    cp.user_id,
    cp.unread_count,
    cp.last_read_at,
    cp.is_admin
    
FROM conversations c
LEFT JOIN businesses b ON c.business_id = b.id
LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id
WHERE c.is_archived IS NOT TRUE;

-- =============================================================================
-- FIX EXISTING CONVERSATION PARTICIPANTS DATA
-- =============================================================================

-- Ensure all conversations have at least one participant
INSERT INTO conversation_participants (conversation_id, user_id, joined_at, is_admin)
SELECT DISTINCT 
    c.id as conversation_id,
    COALESCE(c.user_id, m.sender_id, 1) as user_id,  -- Use conversation owner, first message sender, or default user
    c.created_at as joined_at,
    TRUE as is_admin
FROM conversations c
LEFT JOIN messages m ON c.id = m.conversation_id
WHERE c.id NOT IN (
    SELECT DISTINCT conversation_id 
    FROM conversation_participants
)
AND COALESCE(c.user_id, m.sender_id, 1) IS NOT NULL
ON CONFLICT (conversation_id, user_id) DO NOTHING;

-- Update unread counts based on existing messages
UPDATE conversation_participants 
SET unread_count = (
    SELECT COUNT(*)
    FROM messages m
    WHERE m.conversation_id = conversation_participants.conversation_id
    AND m.sender_id != conversation_participants.user_id
    AND (
        conversation_participants.last_read_at IS NULL 
        OR m.created_at > conversation_participants.last_read_at
    )
)
WHERE unread_count = 0;

-- =============================================================================
-- IMPROVE A2A INTEGRATION
-- =============================================================================

-- Update A2A chat sessions to have better titles
UPDATE a2a_chat_sessions 
SET title = CASE 
    WHEN title IS NULL OR title = '' THEN 
        COALESCE(session_name, agent_type || ' Chat ' || created_at::date)
    ELSE title
END
WHERE title IS NULL OR title = '' OR title = 'New Chat';

-- Add last_active_at to A2A sessions if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a2a_chat_sessions' AND column_name = 'last_active_at'
    ) THEN
        ALTER TABLE a2a_chat_sessions ADD COLUMN last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added last_active_at column to a2a_chat_sessions';
        
        -- Update with last message time or creation time
        UPDATE a2a_chat_sessions 
        SET last_active_at = COALESCE(
            (SELECT MAX(created_at) FROM a2a_chat_messages WHERE session_id = a2a_chat_sessions.id),
            created_at
        );
    END IF;
END $$;

-- =============================================================================
-- CREATE SUMMARY REPORT
-- =============================================================================

DO $$
DECLARE
    total_conversations INTEGER;
    conversations_with_participants INTEGER;
    conversations_with_messages INTEGER;
    ai_conversations INTEGER;
    a2a_sessions INTEGER;
BEGIN
    -- Get counts
    SELECT COUNT(*) INTO total_conversations FROM conversations;
    SELECT COUNT(DISTINCT conversation_id) INTO conversations_with_participants FROM conversation_participants;
    SELECT COUNT(DISTINCT conversation_id) INTO conversations_with_messages FROM messages;
    SELECT COUNT(*) INTO ai_conversations FROM conversations WHERE is_ai_chat = TRUE;
    SELECT COUNT(*) INTO a2a_sessions FROM a2a_chat_sessions;
    
    -- Display summary
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'SIDEBAR CONVERSATIONS FIX COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'Database Schema Updates:';
    RAISE NOTICE '  ✅ Added missing columns (title, last_message, last_message_at, is_pinned)';
    RAISE NOTICE '  ✅ Updated existing data with proper titles and message info';
    RAISE NOTICE '  ✅ Created performance indexes';
    RAISE NOTICE '  ✅ Set up triggers for data consistency';
    RAISE NOTICE '  ✅ Created v_conversation_sidebar view';
    RAISE NOTICE '';
    RAISE NOTICE 'Data Summary:';
    RAISE NOTICE '  📊 Total conversations: %', total_conversations;
    RAISE NOTICE '  👥 Conversations with participants: %', conversations_with_participants;
    RAISE NOTICE '  💬 Conversations with messages: %', conversations_with_messages;
    RAISE NOTICE '  🤖 AI conversations: %', ai_conversations;
    RAISE NOTICE '  🔄 A2A chat sessions: %', a2a_sessions;
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Test the sidebar conversation loading';
    RAISE NOTICE '  2. Verify conversation titles and previews display correctly';
    RAISE NOTICE '  3. Check that new conversations are properly created';
    RAISE NOTICE '  4. Test conversation switching and message loading';
    RAISE NOTICE '=============================================================================';
END $$;

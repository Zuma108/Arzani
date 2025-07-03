-- Database Schema Fix Script
-- Fixes for Arzani-X persistence integration

-- Fix 1: Add missing is_ai_generated column to messages table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'is_ai_generated'
    ) THEN
        ALTER TABLE messages ADD COLUMN is_ai_generated BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_ai_generated column to messages table';
    ELSE
        RAISE NOTICE 'is_ai_generated column already exists in messages table';
    END IF;
END $$;

-- Fix 2: Add missing columns to messages table if they don't exist
DO $$
BEGIN
    -- Add message_type column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'message_type'
    ) THEN
        ALTER TABLE messages ADD COLUMN message_type VARCHAR(20) DEFAULT 'user';
        RAISE NOTICE 'Added message_type column to messages table';
    ELSE
        RAISE NOTICE 'message_type column already exists in messages table';
    END IF;

    -- Add agent_type column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'agent_type'
    ) THEN
        ALTER TABLE messages ADD COLUMN agent_type VARCHAR(50) DEFAULT 'orchestrator';
        RAISE NOTICE 'Added agent_type column to messages table';
    ELSE
        RAISE NOTICE 'agent_type column already exists in messages table';
    END IF;

    -- Add sender_type column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'sender_type'
    ) THEN
        ALTER TABLE messages ADD COLUMN sender_type VARCHAR(20) DEFAULT 'user';
        RAISE NOTICE 'Added sender_type column to messages table';
    ELSE
        RAISE NOTICE 'sender_type column already exists in messages table';
    END IF;
END $$;

-- Fix 3: Make task_id nullable in a2a_agent_interactions to fix constraint violation
DO $$
BEGIN
    -- Check if task_id is currently NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a2a_agent_interactions' 
        AND column_name = 'task_id'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE a2a_agent_interactions ALTER COLUMN task_id DROP NOT NULL;
        RAISE NOTICE 'Made task_id column nullable in a2a_agent_interactions';
    ELSE
        RAISE NOTICE 'task_id column is already nullable or does not exist';
    END IF;
END $$;

-- Fix 4: Update existing messages to have proper values
UPDATE messages 
SET is_ai_generated = CASE 
    WHEN message_type = 'assistant' OR sender_type = 'assistant' THEN TRUE
    WHEN content LIKE 'AI:%' OR content LIKE 'Assistant:%' THEN TRUE
    ELSE FALSE
END
WHERE is_ai_generated IS NULL;

-- Fix 5: Create helpful indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_is_ai_generated ON messages(is_ai_generated);
CREATE INDEX IF NOT EXISTS idx_messages_message_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_sender_type ON messages(sender_type);
CREATE INDEX IF NOT EXISTS idx_messages_agent_type ON messages(agent_type);
CREATE INDEX IF NOT EXISTS idx_a2a_agent_interactions_task_id ON a2a_agent_interactions(task_id) WHERE task_id IS NOT NULL;

-- Final verification
SELECT 'Database schema fixes completed successfully' as status;

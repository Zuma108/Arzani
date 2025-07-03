-- Arzani-X Database Schema Alignment Fix
-- This script ensures proper database schema for A2A chat integration

-- 1. Fix session context table to ensure user_id is always stored
-- First, check if any rows are missing user_id in context_data
DO $$
DECLARE 
    missing_user_id_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO missing_user_id_count
    FROM a2a_session_context sc
    WHERE NOT context_data ? 'user_id'
    AND EXISTS (SELECT 1 FROM a2a_chat_sessions WHERE id = sc.session_id);
    
    RAISE NOTICE 'Found % session contexts missing user_id', missing_user_id_count;
    
    -- Update session contexts that are missing user_id
    IF missing_user_id_count > 0 THEN
        UPDATE a2a_session_context sc
        SET context_data = jsonb_set(
            COALESCE(context_data, '{}'::jsonb),
            '{user_id}',
            (SELECT to_jsonb(user_id) FROM a2a_chat_sessions WHERE id = sc.session_id),
            true
        )
        WHERE NOT context_data ? 'user_id'
        AND EXISTS (SELECT 1 FROM a2a_chat_sessions WHERE id = sc.session_id);
        
        RAISE NOTICE 'Updated % rows with user_id', missing_user_id_count;
    END IF;
END $$;

-- 2. Add created_at timestamps if missing
DO $$
BEGIN
    -- Check if created_at column exists in a2a_session_context
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a2a_session_context' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE a2a_session_context 
        ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        RAISE NOTICE 'Added created_at column to a2a_session_context';
    END IF;
    
    -- Check if created_at column exists in a2a_agent_interactions
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a2a_agent_interactions' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE a2a_agent_interactions 
        ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        RAISE NOTICE 'Added created_at column to a2a_agent_interactions';
    END IF;
    
    -- Check if created_at column exists in a2a_agent_transitions
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a2a_agent_transitions' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE a2a_agent_transitions 
        ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        RAISE NOTICE 'Added created_at column to a2a_agent_transitions';
    END IF;
END $$;

-- 3. Ensure NOT NULL constraints aren't too strict
DO $$
BEGIN
    -- Make sure agent_type in a2a_chat_sessions allows nulls (for flexibility)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a2a_chat_sessions' 
        AND column_name = 'agent_type' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE a2a_chat_sessions 
        ALTER COLUMN agent_type DROP NOT NULL;
        
        RAISE NOTICE 'Modified agent_type in a2a_chat_sessions to allow NULL values';
    END IF;
    
    -- Make sure sender_type in a2a_chat_messages allows nulls (for system messages)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a2a_chat_messages' 
        AND column_name = 'sender_type' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE a2a_chat_messages 
        ALTER COLUMN sender_type DROP NOT NULL;
        
        RAISE NOTICE 'Modified sender_type in a2a_chat_messages to allow NULL values';
    END IF;
END $$;

-- 4. Add indexes for performance if they don't exist
DO $$
BEGIN
    -- Add index on session_id in a2a_chat_messages
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'a2a_chat_messages' 
        AND indexname = 'idx_a2a_chat_messages_session_id'
    ) THEN
        CREATE INDEX idx_a2a_chat_messages_session_id ON a2a_chat_messages(session_id);
        RAISE NOTICE 'Created index on session_id in a2a_chat_messages';
    END IF;
    
    -- Add index on user_id in a2a_chat_sessions
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'a2a_chat_sessions' 
        AND indexname = 'idx_a2a_chat_sessions_user_id'
    ) THEN
        CREATE INDEX idx_a2a_chat_sessions_user_id ON a2a_chat_sessions(user_id);
        RAISE NOTICE 'Created index on user_id in a2a_chat_sessions';
    END IF;
    
    -- Add index on session_id in a2a_session_context
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'a2a_session_context' 
        AND indexname = 'idx_a2a_session_context_session_id'
    ) THEN
        CREATE INDEX idx_a2a_session_context_session_id ON a2a_session_context(session_id);
        RAISE NOTICE 'Created index on session_id in a2a_session_context';
    END IF;
END $$;

-- 5. Ensure metadata column exists for extra fields from frontend
DO $$
BEGIN
    -- Check if metadata column exists in a2a_chat_messages
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a2a_chat_messages' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE a2a_chat_messages 
        ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
        
        RAISE NOTICE 'Added metadata column to a2a_chat_messages';
    END IF;
    
    -- Check if metadata column exists in a2a_chat_sessions
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a2a_chat_sessions' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE a2a_chat_sessions 
        ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
        
        RAISE NOTICE 'Added metadata column to a2a_chat_sessions';
    END IF;
END $$;

-- 6. Vacuum and analyze tables for better performance
VACUUM ANALYZE a2a_chat_sessions;
VACUUM ANALYZE a2a_chat_messages;
VACUUM ANALYZE a2a_session_context;
VACUUM ANALYZE a2a_agent_interactions;
VACUUM ANALYZE a2a_agent_transitions;

-- Final status report
DO $$
BEGIN
    RAISE NOTICE 'Arzani-X Database Schema Alignment completed successfully';
END $$;

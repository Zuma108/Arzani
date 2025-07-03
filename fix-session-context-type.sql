-- Fix type mismatch between a2a_chat_sessions.id and a2a_session_context.session_id

-- First, check the data types of both columns
DO $$
DECLARE
    sessions_id_type TEXT;
    context_session_id_type TEXT;
BEGIN
    -- Get the data type of a2a_chat_sessions.id
    SELECT data_type INTO sessions_id_type
    FROM information_schema.columns
    WHERE table_name = 'a2a_chat_sessions' AND column_name = 'id';
    
    -- Get the data type of a2a_session_context.session_id
    SELECT data_type INTO context_session_id_type
    FROM information_schema.columns
    WHERE table_name = 'a2a_session_context' AND column_name = 'session_id';
    
    RAISE NOTICE 'a2a_chat_sessions.id type: %, a2a_session_context.session_id type: %', 
                  sessions_id_type, context_session_id_type;
                  
    -- If there's a mismatch, modify the session_id column in a2a_session_context
    IF sessions_id_type <> context_session_id_type THEN
        RAISE NOTICE 'Type mismatch detected, fixing...';
        
        -- Handle potential foreign key constraints
        EXECUTE 'ALTER TABLE a2a_session_context DROP CONSTRAINT IF EXISTS a2a_session_context_session_id_fkey';
        
        -- Handle conversion based on the target type
        IF sessions_id_type = 'integer' OR sessions_id_type = 'bigint' THEN
            -- Convert from string to integer
            EXECUTE 'ALTER TABLE a2a_session_context ALTER COLUMN session_id TYPE ' || sessions_id_type || ' USING session_id::' || sessions_id_type;
        ELSIF sessions_id_type = 'character varying' OR sessions_id_type = 'text' THEN
            -- Convert from integer to string
            EXECUTE 'ALTER TABLE a2a_session_context ALTER COLUMN session_id TYPE ' || sessions_id_type;
        ELSE
            RAISE EXCEPTION 'Unsupported data type conversion from % to %', context_session_id_type, sessions_id_type;
        END IF;
        
        -- Recreate the foreign key constraint
        EXECUTE 'ALTER TABLE a2a_session_context ADD CONSTRAINT a2a_session_context_session_id_fkey 
                 FOREIGN KEY (session_id) REFERENCES a2a_chat_sessions(id) ON DELETE CASCADE';
                 
        RAISE NOTICE 'Successfully fixed the type mismatch';
    ELSE
        RAISE NOTICE 'No type mismatch detected, no changes needed';
    END IF;
END $$;

-- Check if there are any orphaned session contexts
DO $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphaned_count
    FROM a2a_session_context sc
    WHERE NOT EXISTS (SELECT 1 FROM a2a_chat_sessions WHERE id = sc.session_id::INTEGER);
    
    RAISE NOTICE 'Found % orphaned session contexts', orphaned_count;
    
    IF orphaned_count > 0 THEN
        -- Optionally remove orphaned records
        -- DELETE FROM a2a_session_context
        -- WHERE NOT EXISTS (SELECT 1 FROM a2a_chat_sessions WHERE id = session_id::INTEGER);
        
        RAISE NOTICE 'Consider removing orphaned session contexts';
    END IF;
END $$;

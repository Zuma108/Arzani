-- Fix A2A Database Schema Issues
-- This script addresses foreign key constraints and missing columns

BEGIN;

-- 1. Add missing 'last_accessed' column to a2a_session_context
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a2a_session_context' AND column_name = 'last_accessed'
    ) THEN
        ALTER TABLE a2a_session_context 
        ADD COLUMN last_accessed TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        
        -- Update existing records to have a last_accessed value
        UPDATE a2a_session_context 
        SET last_accessed = COALESCE(last_activity, updated_at, created_at, NOW());
        
        RAISE NOTICE 'Added last_accessed column to a2a_session_context';
    ELSE
        RAISE NOTICE 'last_accessed column already exists in a2a_session_context';
    END IF;
END $$;

-- 2. Add missing 'initial_query' column to a2a_tasks if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a2a_tasks' AND column_name = 'initial_query'
    ) THEN
        ALTER TABLE a2a_tasks 
        ADD COLUMN initial_query TEXT DEFAULT 'Legacy task - query not recorded';
        
        RAISE NOTICE 'Added initial_query column to a2a_tasks';
    ELSE
        RAISE NOTICE 'initial_query column already exists in a2a_tasks';
    END IF;
END $$;

-- 3. Add missing 'primary_agent' column to a2a_tasks if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'a2a_tasks' AND column_name = 'primary_agent'
    ) THEN
        ALTER TABLE a2a_tasks 
        ADD COLUMN primary_agent VARCHAR(100) DEFAULT 'orchestrator';
        
        -- Update existing records to have a primary_agent value based on current_agent
        UPDATE a2a_tasks 
        SET primary_agent = COALESCE(current_agent, 'orchestrator')
        WHERE primary_agent IS NULL;
        
        -- Make it NOT NULL after updating existing records
        ALTER TABLE a2a_tasks 
        ALTER COLUMN primary_agent SET NOT NULL;
        
        RAISE NOTICE 'Added primary_agent column to a2a_tasks';
    ELSE
        RAISE NOTICE 'primary_agent column already exists in a2a_tasks';
    END IF;
END $$;

-- 4. Create a function to handle thread preferences with proper conflict resolution
CREATE OR REPLACE FUNCTION upsert_thread_preferences(
    p_user_id INTEGER,
    p_preferences JSONB
) RETURNS VOID AS $$
BEGIN
    -- Try to insert first
    INSERT INTO thread_preferences (user_id, preferences, created_at, updated_at)
    VALUES (p_user_id, p_preferences, NOW(), NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        preferences = EXCLUDED.preferences,
        updated_at = NOW();
    
EXCEPTION WHEN others THEN
    -- If there's any error, try to update first, then insert if no rows affected
    UPDATE thread_preferences 
    SET preferences = p_preferences, updated_at = NOW()
    WHERE user_id = p_user_id;
    
    IF NOT FOUND THEN
        INSERT INTO thread_preferences (user_id, preferences, created_at, updated_at)
        VALUES (p_user_id, p_preferences, NOW(), NOW());
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. Ensure thread_preferences table has proper unique constraint
DO $$
BEGIN
    -- Check if unique constraint exists on user_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'thread_preferences' 
        AND constraint_type = 'UNIQUE'
        AND constraint_name LIKE '%user_id%'
    ) THEN
        -- Remove any duplicate entries first
        DELETE FROM thread_preferences a USING thread_preferences b 
        WHERE a.id > b.id AND a.user_id = b.user_id;
        
        -- Add unique constraint
        ALTER TABLE thread_preferences 
        ADD CONSTRAINT thread_preferences_user_id_unique UNIQUE (user_id);
        
        RAISE NOTICE 'Added unique constraint to thread_preferences.user_id';
    ELSE
        RAISE NOTICE 'Unique constraint already exists on thread_preferences.user_id';
    END IF;
END $$;

-- 6. Clean up any orphaned a2a_agent_interactions records
DELETE FROM a2a_agent_interactions 
WHERE task_id NOT IN (SELECT task_id FROM a2a_tasks);

-- Get count of cleaned up records
SELECT COUNT(*) as orphaned_interactions_cleaned
FROM a2a_agent_interactions 
WHERE task_id NOT IN (SELECT task_id FROM a2a_tasks);

-- 7. Update trigger for a2a_session_context to handle last_accessed
CREATE OR REPLACE FUNCTION update_a2a_session_last_accessed()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_accessed = NOW();
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_a2a_session_last_accessed ON a2a_session_context;
CREATE TRIGGER trigger_update_a2a_session_last_accessed
    BEFORE UPDATE ON a2a_session_context
    FOR EACH ROW
    EXECUTE FUNCTION update_a2a_session_last_accessed();

COMMIT;

-- Verification queries
SELECT 'a2a_session_context columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'a2a_session_context' 
ORDER BY ordinal_position;

SELECT 'a2a_tasks columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'a2a_tasks' 
ORDER BY ordinal_position;

SELECT 'thread_preferences constraints:' as info;
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'thread_preferences';

RAISE NOTICE '✅ A2A Foreign Key Issues Fix Complete';

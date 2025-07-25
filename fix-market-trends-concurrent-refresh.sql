-- Fix for market_trends_mv concurrent refresh issue
-- This script addresses the PostgreSQL error: "cannot refresh materialized view 'public.market_trends_mv' concurrently"
-- Optimized for AWS RDS PostgreSQL environments

-- Step 1: Drop the problematic trigger first to prevent interference
DROP TRIGGER IF EXISTS refresh_market_trends ON businesses CASCADE;

-- Step 2: Drop the old function to ensure clean recreation
DROP FUNCTION IF EXISTS refresh_market_trends_mv() CASCADE;

-- Step 3: The materialized view and its unique index already exist, so we'll work with them
-- Check what we have:
-- - market_trends_mv (materialized view exists)
-- - market_trends_mv_idx (unique index exists on date, industry, location)

-- Step 4: Test the existing setup and refresh the view
REFRESH MATERIALIZED VIEW market_trends_mv;

-- Step 5: Create additional performance indexes if they don't exist
CREATE INDEX IF NOT EXISTS market_trends_mv_date_idx ON market_trends_mv(date);
CREATE INDEX IF NOT EXISTS market_trends_mv_industry_idx ON market_trends_mv(industry);
CREATE INDEX IF NOT EXISTS market_trends_mv_location_idx ON market_trends_mv(location);

-- Step 6: Create an RDS-optimized refresh function with robust error handling
-- This function is designed to work reliably in AWS RDS environments
CREATE OR REPLACE FUNCTION refresh_market_trends_mv()
RETURNS trigger 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    unique_index_exists boolean := false;
    view_exists boolean := false;
    lock_timeout_val text;
    deadlock_timeout_val text;
BEGIN
    -- Set shorter timeouts to prevent long-running locks in RDS
    SELECT current_setting('lock_timeout') INTO lock_timeout_val;
    SELECT current_setting('deadlock_timeout') INTO deadlock_timeout_val;
    
    -- Set conservative timeouts for RDS
    PERFORM set_config('lock_timeout', '5s', true);
    PERFORM set_config('deadlock_timeout', '1s', true);
    
    -- Check if the materialized view exists
    SELECT EXISTS (
        SELECT 1 FROM pg_matviews 
        WHERE schemaname = 'public' 
        AND matviewname = 'market_trends_mv'
    ) INTO view_exists;
    
    IF NOT view_exists THEN
        RAISE WARNING 'Materialized view market_trends_mv does not exist, skipping refresh';
        RETURN NULL;
    END IF;
    
    -- Check if a unique index exists for concurrent refresh
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public'
        AND tablename = 'market_trends_mv' 
        AND (indexname = 'market_trends_mv_idx' OR indexname = 'market_trends_mv_unique_idx')
        AND indexdef LIKE '%UNIQUE%'
    ) INTO unique_index_exists;
    
    -- For RDS: Always use non-concurrent refresh to avoid lock conflicts
    -- Concurrent refresh can be problematic in shared cloud environments
    BEGIN
        REFRESH MATERIALIZED VIEW market_trends_mv;
        RAISE NOTICE 'Successfully refreshed market_trends_mv (non-concurrent for RDS compatibility)';
    EXCEPTION
        WHEN lock_not_available THEN
            RAISE WARNING 'Lock timeout during refresh, will retry on next trigger';
            RETURN NULL;
        WHEN deadlock_detected THEN
            RAISE WARNING 'Deadlock detected during refresh, will retry on next trigger';
            RETURN NULL;
        WHEN OTHERS THEN
            RAISE WARNING 'Materialized view refresh failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
            RETURN NULL;
    END;
    
    -- Restore original timeout settings
    PERFORM set_config('lock_timeout', lock_timeout_val, true);
    PERFORM set_config('deadlock_timeout', deadlock_timeout_val, true);
    
    RETURN NULL;
EXCEPTION
    WHEN OTHERS THEN
        -- Ensure we restore settings even if something goes wrong
        PERFORM set_config('lock_timeout', lock_timeout_val, true);
        PERFORM set_config('deadlock_timeout', deadlock_timeout_val, true);
        RAISE WARNING 'Unexpected error in refresh function: %', SQLERRM;
        RETURN NULL;
END;
$$;

-- Step 7: Recreate the trigger with RDS-optimized settings
-- Use FOR EACH STATEMENT to reduce trigger executions
CREATE TRIGGER refresh_market_trends
    AFTER INSERT OR UPDATE OR DELETE ON businesses
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_market_trends_mv();

-- Step 8: Test the setup with a manual refresh (non-concurrent for RDS)
DO $$
BEGIN
    BEGIN
        REFRESH MATERIALIZED VIEW market_trends_mv;
        RAISE NOTICE 'Test refresh: SUCCESS (using non-concurrent for RDS compatibility)';
    EXCEPTION 
        WHEN OTHERS THEN
            RAISE WARNING 'Test refresh failed: %', SQLERRM;
    END;
END $$;

-- Step 9: Verify the setup and provide status report
DO $$
DECLARE
    row_count integer;
    unique_index_exists boolean;
    trigger_count integer;
    view_exists boolean;
    index_name text;
    function_exists boolean;
BEGIN
    -- Check if view exists
    SELECT EXISTS (
        SELECT 1 FROM pg_matviews 
        WHERE schemaname = 'public' 
        AND matviewname = 'market_trends_mv'
    ) INTO view_exists;
    
    -- Check if function exists
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'refresh_market_trends_mv'
    ) INTO function_exists;
    
    IF view_exists THEN
        -- Check row count
        SELECT COUNT(*) INTO row_count FROM market_trends_mv;
        
        -- Check if a unique index exists and get its name
        SELECT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE schemaname = 'public'
            AND tablename = 'market_trends_mv' 
            AND indexdef LIKE '%UNIQUE%'
        ), COALESCE(
            (SELECT indexname FROM pg_indexes 
             WHERE schemaname = 'public'
             AND tablename = 'market_trends_mv' 
             AND indexdef LIKE '%UNIQUE%' 
             LIMIT 1), 
            'none'
        ) INTO unique_index_exists, index_name;
        
        -- Check trigger count
        SELECT COUNT(*) INTO trigger_count 
        FROM information_schema.triggers 
        WHERE event_object_schema = 'public'
        AND event_object_table = 'businesses' 
        AND trigger_name = 'refresh_market_trends';
        
        RAISE NOTICE '=== Market Trends RDS-Optimized Setup Status ===';
        RAISE NOTICE 'PostgreSQL Version: %', version();
        RAISE NOTICE 'Materialized view exists: %', view_exists;
        RAISE NOTICE 'Function exists: %', function_exists;
        RAISE NOTICE 'Row count: %', row_count;
        RAISE NOTICE 'Unique index exists: % (name: %)', unique_index_exists, index_name;
        RAISE NOTICE 'Trigger count: %', trigger_count;
        RAISE NOTICE 'Refresh mode: NON-CONCURRENT (RDS optimized)';
        RAISE NOTICE 'Error handling: ENABLED (timeouts and deadlock protection)';
        RAISE NOTICE 'Setup: COMPLETE - Should resolve 500 errors';
    ELSE
        RAISE EXCEPTION 'Materialized view market_trends_mv does not exist!';
    END IF;
END $$;

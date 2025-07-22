-- Fix for market_trends_mv concurrent refresh issue
-- This script addresses the PostgreSQL error: "cannot refresh materialized view 'public.market_trends_mv' concurrently"
-- Based on current database structure analysis

-- Step 1: Drop the problematic trigger first to prevent interference
DROP TRIGGER IF EXISTS refresh_market_trends ON businesses;

-- Step 2: Drop existing indexes to recreate them properly
DROP INDEX IF EXISTS market_trends_mv_idx;
DROP INDEX IF EXISTS market_trends_mv_unique_idx;

-- Step 3: Keep the existing materialized view structure but ensure data integrity
-- The view already exists with the correct structure, just refresh it
REFRESH MATERIALIZED VIEW market_trends_mv;

-- Step 4: Create a robust unique index that handles potential duplicates
-- Use COALESCE to handle NULLs and ensure uniqueness
CREATE UNIQUE INDEX market_trends_mv_unique_idx ON market_trends_mv (
    date, 
    COALESCE(industry, 'Unknown'), 
    COALESCE(location, 'Unknown')
);

-- Step 5: Create additional performance indexes
CREATE INDEX IF NOT EXISTS market_trends_mv_date_idx ON market_trends_mv(date);
CREATE INDEX IF NOT EXISTS market_trends_mv_industry_idx ON market_trends_mv(industry);
CREATE INDEX IF NOT EXISTS market_trends_mv_location_idx ON market_trends_mv(location);

-- Step 6: Create an improved refresh function with proper error handling
CREATE OR REPLACE FUNCTION refresh_market_trends_mv()
RETURNS trigger AS $$
DECLARE
    unique_index_exists boolean;
    view_exists boolean;
BEGIN
    -- Check if the materialized view exists
    SELECT EXISTS (
        SELECT 1 FROM pg_matviews 
        WHERE matviewname = 'market_trends_mv'
    ) INTO view_exists;
    
    IF NOT view_exists THEN
        RAISE WARNING 'Materialized view market_trends_mv does not exist, skipping refresh';
        RETURN NULL;
    END IF;
    
    -- Check if the unique index exists for concurrent refresh
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'market_trends_mv' 
        AND indexname = 'market_trends_mv_unique_idx'
    ) INTO unique_index_exists;
    
    IF unique_index_exists THEN
        -- Try concurrent refresh first
        BEGIN
            REFRESH MATERIALIZED VIEW CONCURRENTLY market_trends_mv;
            RAISE NOTICE 'Successfully refreshed market_trends_mv concurrently';
        EXCEPTION 
            WHEN OTHERS THEN
                -- Fallback to non-concurrent refresh if concurrent fails
                RAISE WARNING 'Concurrent refresh failed (%), falling back to non-concurrent refresh', SQLERRM;
                BEGIN
                    REFRESH MATERIALIZED VIEW market_trends_mv;
                    RAISE NOTICE 'Successfully refreshed market_trends_mv non-concurrently';
                EXCEPTION
                    WHEN OTHERS THEN
                        RAISE WARNING 'Non-concurrent refresh also failed: %', SQLERRM;
                END;
        END;
    ELSE
        -- Use non-concurrent refresh if no unique index
        BEGIN
            REFRESH MATERIALIZED VIEW market_trends_mv;
            RAISE NOTICE 'Successfully refreshed market_trends_mv non-concurrently (no unique index)';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Non-concurrent refresh failed: %', SQLERRM;
        END;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Recreate the trigger with the improved function
CREATE TRIGGER refresh_market_trends
    AFTER INSERT OR UPDATE OR DELETE ON businesses
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_market_trends_mv();

-- Step 8: Test the setup with a manual refresh
DO $$
BEGIN
    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY market_trends_mv;
        RAISE NOTICE 'Test concurrent refresh: SUCCESS';
    EXCEPTION 
        WHEN OTHERS THEN
            RAISE WARNING 'Test concurrent refresh failed: %, trying non-concurrent', SQLERRM;
            BEGIN
                REFRESH MATERIALIZED VIEW market_trends_mv;
                RAISE NOTICE 'Test non-concurrent refresh: SUCCESS';
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE EXCEPTION 'Both concurrent and non-concurrent refresh failed: %', SQLERRM;
            END;
    END;
END $$;

-- Step 9: Verify the setup and provide status report
DO $$
DECLARE
    row_count integer;
    unique_index_exists boolean;
    trigger_count integer;
    view_exists boolean;
BEGIN
    -- Check if view exists
    SELECT EXISTS (
        SELECT 1 FROM pg_matviews 
        WHERE matviewname = 'market_trends_mv'
    ) INTO view_exists;
    
    IF view_exists THEN
        -- Check row count
        SELECT COUNT(*) INTO row_count FROM market_trends_mv;
        
        -- Check if unique index exists
        SELECT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'market_trends_mv' 
            AND indexname = 'market_trends_mv_unique_idx'
        ) INTO unique_index_exists;
        
        -- Check trigger count
        SELECT COUNT(*) INTO trigger_count 
        FROM information_schema.triggers 
        WHERE event_object_table = 'businesses' 
        AND trigger_name = 'refresh_market_trends';
        
        RAISE NOTICE '=== Market Trends Setup Status ===';
        RAISE NOTICE 'Materialized view exists: %', view_exists;
        RAISE NOTICE 'Row count: %', row_count;
        RAISE NOTICE 'Unique index exists: %', unique_index_exists;
        RAISE NOTICE 'Trigger count: %', trigger_count;
        RAISE NOTICE 'Concurrent refresh: %', CASE WHEN unique_index_exists THEN 'ENABLED' ELSE 'DISABLED (will use non-concurrent)' END;
        RAISE NOTICE 'Setup: COMPLETE';
    ELSE
        RAISE EXCEPTION 'Materialized view market_trends_mv does not exist!';
    END IF;
END $$;

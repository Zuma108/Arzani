-- Database Permission Fix Script
-- Run this as postgres superuser to grant permissions to marketplace_user

-- Connect to your database first
-- \c your_database_name

-- Grant all permissions on existing tables to marketplace_user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO marketplace_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO marketplace_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO marketplace_user;

-- Grant permissions for future tables, sequences, and functions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO marketplace_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO marketplace_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO marketplace_user;

-- Alternatively, transfer ownership of all tables to marketplace_user
-- (Choose this option if you want marketplace_user to own all tables)

-- Get the database name first
SELECT current_database();

-- Transfer ownership of all tables in public schema to marketplace_user
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' OWNER TO marketplace_user;';
        RAISE NOTICE 'Changed ownership of table % to marketplace_user', r.tablename;
    END LOOP;
END $$;

-- Transfer ownership of all sequences to marketplace_user
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'
    LOOP
        EXECUTE 'ALTER SEQUENCE public.' || quote_ident(r.sequence_name) || ' OWNER TO marketplace_user;';
        RAISE NOTICE 'Changed ownership of sequence % to marketplace_user', r.sequence_name;
    END LOOP;
END $$;

-- Transfer ownership of all views to marketplace_user
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT table_name FROM information_schema.views WHERE table_schema = 'public'
    LOOP
        EXECUTE 'ALTER VIEW public.' || quote_ident(r.table_name) || ' OWNER TO marketplace_user;';
        RAISE NOTICE 'Changed ownership of view % to marketplace_user', r.table_name;
    END LOOP;
END $$;

-- Grant marketplace_user the ability to create tables (needed for migrations)
ALTER USER marketplace_user CREATEDB;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO marketplace_user;
GRANT CREATE ON SCHEMA public TO marketplace_user;

-- Verify the changes
SELECT 
    'Tables owned by marketplace_user:' as info,
    count(*) as count
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tableowner = 'marketplace_user';

SELECT 
    'Tables still owned by postgres:' as info,
    count(*) as count
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tableowner = 'postgres';

-- Show current permissions for marketplace_user
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE grantee = 'marketplace_user'
    AND table_schema = 'public'
LIMIT 10;

COMMENT ON SCRIPT IS 'This script grants full permissions to marketplace_user for all database objects in the public schema';
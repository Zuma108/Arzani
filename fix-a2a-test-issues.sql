-- Fix A2A Test Issues
-- This script creates a test user and checks the actual database schema

-- Create test user for A2A integration tests
INSERT INTO users (id, email, password_hash, username, first_name, last_name, created_at, updated_at) 
VALUES (999, 'test@a2a.local', '$2b$10$dummy.hash.for.testing.purposes', 'a2a_test_user', 'A2A', 'Tester', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  username = EXCLUDED.username,
  updated_at = NOW();

-- Check actual schema of A2A tables to understand structure
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name IN (
  'a2a_agent_interactions',
  'a2a_agent_transitions', 
  'a2a_file_uploads',
  'a2a_messages',
  'a2a_thread_cache',
  'a2a_thread_analytics',
  'a2a_tasks',
  'a2a_chat_sessions',
  'a2a_chat_messages'
)
ORDER BY table_name, ordinal_position;

-- Check current foreign key constraints on A2A tables
SELECT 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM 
  information_schema.table_constraints AS tc 
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE constraint_type = 'FOREIGN KEY' 
  AND tc.table_name LIKE 'a2a_%'
ORDER BY tc.table_name;

-- Test cleanup queries (for later use)
-- DELETE FROM a2a_agent_interactions WHERE user_id = 999;
-- DELETE FROM a2a_agent_transitions WHERE user_id = 999;  
-- DELETE FROM a2a_file_uploads WHERE user_id = 999;
-- DELETE FROM a2a_messages WHERE user_id = 999;
-- DELETE FROM a2a_thread_cache WHERE user_id = 999;
-- DELETE FROM a2a_thread_analytics WHERE user_id = 999;
-- DELETE FROM a2a_tasks WHERE user_id = 999;
-- DELETE FROM a2a_chat_sessions WHERE user_id = 999;

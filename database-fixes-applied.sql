-- Database Schema Fixes Applied on June 13, 2025
-- These fixes resolve the authentication and messaging errors

-- Fix 1: Add missing is_ai_generated column to messages table
-- This column was referenced in the code but didn't exist in the database
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT false;

-- Fix 2: Make task_id nullable in a2a_agent_interactions table
-- The code was trying to insert NULL values but column had NOT NULL constraint
ALTER TABLE a2a_agent_interactions ALTER COLUMN task_id DROP NOT NULL;

-- Fix 3: Make interaction_id nullable in a2a_agent_interactions table
-- Allow NULL values for this field to prevent constraint violations
ALTER TABLE a2a_agent_interactions ALTER COLUMN interaction_id DROP NOT NULL;

-- Fix 4: Make interaction_type nullable in a2a_agent_interactions table
-- Allow NULL values for this field to prevent constraint violations
ALTER TABLE a2a_agent_interactions ALTER COLUMN interaction_type DROP NOT NULL;

-- Fix 5: Make from_agent nullable in a2a_agent_interactions table
-- Allow NULL values for this field to prevent constraint violations
ALTER TABLE a2a_agent_interactions ALTER COLUMN from_agent DROP NOT NULL;

-- Verification queries:
-- SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'is_ai_generated';
-- SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'a2a_agent_interactions' AND column_name IN ('task_id', 'interaction_id', 'interaction_type', 'from_agent');

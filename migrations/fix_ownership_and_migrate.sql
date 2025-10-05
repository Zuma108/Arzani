-- Fix ownership and run professional migration
-- Run this in pgAdmin Query Tool

-- First, check current user and table owner
SELECT current_user, schemaname, tablename, tableowner 
FROM pg_tables 
WHERE tablename = 'conversations';

-- Change ownership to current user (replace 'your_username' with your actual username)
-- You can find your username from the query above
ALTER TABLE conversations OWNER TO postgres;

-- Now run the migration
-- Add professional_id column to conversations table
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS professional_id INTEGER REFERENCES professional_profiles(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_conversations_professional_id ON conversations(professional_id);

-- Add check constraint to ensure either business_id or professional_id is set (not both)
ALTER TABLE conversations 
DROP CONSTRAINT IF EXISTS chk_conversation_context;

ALTER TABLE conversations 
ADD CONSTRAINT chk_conversation_context 
CHECK (
  (business_id IS NOT NULL AND professional_id IS NULL) OR
  (business_id IS NULL AND professional_id IS NOT NULL) OR
  (business_id IS NULL AND professional_id IS NULL)
);

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'conversations' 
ORDER BY ordinal_position;
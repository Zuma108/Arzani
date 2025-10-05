-- Migration: Add professional_id to conversations table
-- Created: 2025-09-27
-- Purpose: Enable professional conversations in the chat system

-- Add professional_id column to conversations table
ALTER TABLE conversations 
ADD COLUMN professional_id INTEGER REFERENCES professional_profiles(id);

-- Create index for better query performance
CREATE INDEX idx_conversations_professional_id ON conversations(professional_id);

-- Add check constraint to ensure either business_id or professional_id is set (not both)
ALTER TABLE conversations 
ADD CONSTRAINT chk_conversation_context 
CHECK (
  (business_id IS NOT NULL AND professional_id IS NULL) OR
  (business_id IS NULL AND professional_id IS NOT NULL) OR
  (business_id IS NULL AND professional_id IS NULL)
);

-- Update conversation_type enum to include professional conversations
-- (Note: This assumes conversation_type is used to categorize conversation types)
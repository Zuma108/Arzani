-- Add fields to users table to track questionnaire relationships
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_questionnaire BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS questionnaire_id INTEGER REFERENCES questionnaire_submissions(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS questionnaire_linked_at TIMESTAMP WITH TIME ZONE;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_users_questionnaire_id ON users(questionnaire_id);

-- Create questionnaire_submissions table
CREATE TABLE IF NOT EXISTS questionnaire_submissions (
  id SERIAL PRIMARY KEY,
  submission_id VARCHAR(255) NOT NULL UNIQUE,
  user_id INTEGER REFERENCES users(id) NULL,
  email VARCHAR(255) NOT NULL,
  data JSONB NOT NULL,
  valuation_data JSONB NULL,
  status VARCHAR(50) DEFAULT 'pending',
  is_linked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_questionnaire_submissions_email ON questionnaire_submissions(email);
CREATE INDEX IF NOT EXISTS idx_questionnaire_submissions_user_id ON questionnaire_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_submissions_status ON questionnaire_submissions(status);
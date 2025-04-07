-- Create a lookup table to track anonymous submissions with temporary identifiers
CREATE TABLE IF NOT EXISTS questionnaire_lookup (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  submission_id VARCHAR(255) NOT NULL REFERENCES questionnaire_submissions(submission_id),
  anonymous_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending',
  linked_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(anonymous_id)
);

CREATE INDEX IF NOT EXISTS idx_questionnaire_lookup_email ON questionnaire_lookup(email);
CREATE INDEX IF NOT EXISTS idx_questionnaire_lookup_anon_id ON questionnaire_lookup(anonymous_id);

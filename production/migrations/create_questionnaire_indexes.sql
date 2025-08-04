-- Create index for efficient email lookups when linking questionnaire data
CREATE INDEX IF NOT EXISTS idx_questionnaire_email ON questionnaire_submissions(email);

-- Create index for user ID lookups for better performance when fetching user data
CREATE INDEX IF NOT EXISTS idx_questionnaire_user_id ON questionnaire_submissions(user_id);

-- Create index for submission ID lookups
CREATE INDEX IF NOT EXISTS idx_questionnaire_submission_id ON questionnaire_submissions(submission_id);

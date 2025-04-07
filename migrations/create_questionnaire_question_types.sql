-- Store question definitions for future reference and reporting
CREATE TABLE IF NOT EXISTS questionnaire_question_types (
  id SERIAL PRIMARY KEY,
  question_key VARCHAR(100) NOT NULL UNIQUE,
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) NOT NULL, -- text, number, boolean, etc.
  required BOOLEAN DEFAULT FALSE,
  display_order INTEGER,
  section VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Example question types for your seller questionnaire
INSERT INTO questionnaire_question_types 
  (question_key, question_text, question_type, required, display_order, section)
VALUES
  ('businessName', 'What is your business name?', 'text', TRUE, 1, 'basics'),
  ('industry', 'What industry is your business in?', 'select', TRUE, 2, 'basics'),
  ('yearEstablished', 'When was your business established?', 'number', TRUE, 3, 'basics'),
  ('location', 'Where is your business located?', 'text', TRUE, 4, 'location'),
  ('revenue', 'What is your annual revenue?', 'number', TRUE, 5, 'revenue'),
  ('ebitda', 'What is your EBITDA?', 'number', TRUE, 6, 'ebitda'),
  ('cashOnCash', 'What is your Cash on Cash return?', 'percentage', FALSE, 7, 'financial'),
  ('ffeValue', 'What is your FFE value?', 'number', FALSE, 8, 'assets'),
  ('growthRate', 'What is your projected growth rate?', 'percentage', FALSE, 9, 'growth'),
  ('totalDebtAmount', 'What is your total debt amount?', 'number', FALSE, 10, 'debts');

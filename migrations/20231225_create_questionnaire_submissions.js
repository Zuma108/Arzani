import { pool } from '../db.js';

async function createQuestionnaireSubmissionsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS questionnaire_submissions (
        id SERIAL PRIMARY KEY,
        submission_id VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255),
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        valuation_data JSONB,
        status VARCHAR(50) DEFAULT 'pending',
        is_linked BOOLEAN DEFAULT FALSE
      );
      
      CREATE INDEX IF NOT EXISTS idx_questionnaire_email ON questionnaire_submissions(email);
      CREATE INDEX IF NOT EXISTS idx_questionnaire_user_id ON questionnaire_submissions(user_id);
    `);
    
    console.log('Questionnaire submissions table created successfully');
  } catch (err) {
    console.error('Error creating questionnaire submissions table:', err);
    throw err;
  }
}

// Export the function to be run in the migrations system
export default createQuestionnaireSubmissionsTable;

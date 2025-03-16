import pool from '../db.js';

/**
 * Ensures all required AI assistant tables exist
 */
export async function ensureAITables() {
  try {
    console.log('Checking for AI assistant tables...');

    // Check if ai_credits table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'ai_credits'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('Creating ai_credits table...');
      
      // Create the table
      await pool.query(`
        CREATE TABLE ai_credits (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          credits_used INTEGER DEFAULT 0,
          credits_limit INTEGER DEFAULT 30,
          last_reset TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          next_reset TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
          subscription_tier VARCHAR(50) DEFAULT 'free',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create index
      await pool.query(`
        CREATE INDEX idx_ai_credits_user_id ON ai_credits(user_id)
      `);

      console.log('ai_credits table created successfully');
    } else {
      console.log('ai_credits table already exists');
    }
  } catch (error) {
    console.error('Error ensuring AI tables:', error);
    // Don't throw, just log the error
  }
}

import { fileURLToPath } from 'url';
import pool from '../db.js';

/**
 * This migration creates tables to track AI assistant interactions
 * and manage credit usage for users
 */
async function createAssistantTables() {
  console.log('Creating or verifying assistant interaction tables...');

  try {
    // Check if assistant_interactions table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'assistant_interactions'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('Creating assistant_interactions table...');
      
      // Create the table for tracking interactions
      await pool.query(`
        CREATE TABLE assistant_interactions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          message TEXT NOT NULL,
          response TEXT NOT NULL,
          tokens_used INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          context JSONB,
          session_id VARCHAR(255),
          CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      
      // Create index for faster queries
      await pool.query(`
        CREATE INDEX idx_assistant_interactions_user_id 
        ON assistant_interactions(user_id)
      `);
      
      console.log('assistant_interactions table created successfully');
    } else {
      console.log('assistant_interactions table already exists');
    }
    
    // Check if ai_credits table exists
    const creditsTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'ai_credits'
      )
    `);
    
    if (!creditsTableCheck.rows[0].exists) {
      console.log('Creating ai_credits table...');
      
      // Create the table for tracking credits
      await pool.query(`
        CREATE TABLE ai_credits (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          credits_used INTEGER DEFAULT 0,
          credits_limit INTEGER DEFAULT 30,
          subscription_tier VARCHAR(50) DEFAULT 'free',
          last_reset TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          next_reset TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
    
    // Optional: Check if assistant_prompts table exists
    const promptsTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'assistant_prompts'
      )
    `);
    
    if (!promptsTableCheck.rows[0].exists) {
      console.log('Creating assistant_prompts table...');
      
      // Create the table for storing predefined prompts
      await pool.query(`
        CREATE TABLE assistant_prompts (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          prompt_text TEXT NOT NULL,
          category VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      console.log('assistant_prompts table created successfully');
      
      // Insert some example prompts
      await pool.query(`
        INSERT INTO assistant_prompts (title, prompt_text, category)
        VALUES 
          ('Find Business', 'Show me businesses in {location}', 'search'),
          ('Valuation', 'What is a fair price for a {industry} business?', 'valuation'),
          ('Selling Tips', 'How can I increase the value of my business?', 'selling')
      `);
      
      console.log('Added example prompts');
    } else {
      console.log('assistant_prompts table already exists');
    }
    
    console.log('All AI assistant tables verified.');
  } catch (error) {
    console.error('Error creating assistant tables:', error);
    throw error; // Re-throw the error to be handled by the caller
  }
}

// Export the migration function
export { createAssistantTables };

// Run if this is called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createAssistantTables()
    .then(() => {
      console.log('Assistant tables migration completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('Assistant tables migration failed:', err);
      process.exit(1);
    });
}

import pool from '../config/database.js';

/**
 * Ensures that the AI assistant tables exist in the database
 * @returns {Promise<boolean>} True if tables were created or already exist
 */
export async function ensureAITables() {
  let client;

  try {
    // Get a database client from the pool
    client = await pool.connect();
    
    // Check if ai_assistant_interactions table exists
    const tableCheckQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'ai_assistant_interactions'
      );
    `;
    
    const tableExists = await client.query(tableCheckQuery);
    
    // If table doesn't exist, create it
    if (!tableExists.rows[0].exists) {
      console.log('Creating AI assistant tables...');
      
      // Create the interactions table
      const createTableQuery = `
        CREATE TABLE ai_assistant_interactions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER,
          session_id TEXT,
          query TEXT NOT NULL,
          response TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          metadata JSONB
        );
      `;
      
      await client.query(createTableQuery);
      
      // Create index on user_id for better performance
      await client.query(`
        CREATE INDEX ai_assistant_interactions_user_id_idx 
        ON ai_assistant_interactions(user_id);
      `);
      
      console.log('AI assistant tables created successfully');
    } else {
      console.log('AI assistant tables already exist');
    }
    
    return true;
  } catch (error) {
    console.error('Error ensuring AI tables exist:', error.message);
    return false;
  } finally {
    if (client) {
      client.release();
    }
  }
}

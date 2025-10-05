import pool from './db.js';

async function createSavedProfessionalsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS saved_professionals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        professional_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_user_professional UNIQUE(user_id, professional_id)
      )
    `);
    
    console.log('saved_professionals table created successfully');
    
    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_saved_professionals_user_id ON saved_professionals(user_id)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_saved_professionals_professional_id ON saved_professionals(professional_id)
    `);
    
    console.log('Indexes created successfully');
  } catch (error) {
    console.error('Error creating table:', error);
  } finally {
    await pool.end();
  }
}

createSavedProfessionalsTable();
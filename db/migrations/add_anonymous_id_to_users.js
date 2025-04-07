/**
 * Migration script to add anonymous_id field to users table
 * This enables linking questionnaire data to user accounts
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function updateUsersTable() {
  const client = await pool.connect();
  
  try {
    console.log('Starting users table update migration...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Check if anonymous_id column already exists
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'anonymous_id'
    `);
    
    const columnExists = columnCheck.rows.length > 0;
    
    if (!columnExists) {
      console.log('Adding anonymous_id column to users table...');
      
      // Add anonymous_id column
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN anonymous_id VARCHAR(255),
        ADD COLUMN questionnaire_data JSONB,
        ADD COLUMN questionnaire_submission_id INTEGER,
        ADD COLUMN data_collected_at TIMESTAMP
      `);
      
      // Create index on anonymous_id for faster lookups
      await client.query(`
        CREATE INDEX users_anonymous_id_idx ON users(anonymous_id)
      `);
      
      console.log('Added anonymous_id column and related fields to users table');
    } else {
      console.log('anonymous_id column already exists in users table');
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('Migration completed successfully');
  } catch (error) {
    // Rollback in case of error
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
updateUsersTable()
  .then(() => {
    console.log('Migration script execution completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });

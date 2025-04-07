/**
 * Migration script to create the business_questionnaires table
 * This table stores all the data collected from seller questionnaires
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pg;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function createBusinessQuestionnairesTable() {
  const client = await pool.connect();
  
  try {
    console.log('Starting business_questionnaires table migration...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'business_questionnaires'
      )
    `);
    
    const tableExists = tableCheck.rows[0].exists;
    
    if (!tableExists) {
      console.log('Creating business_questionnaires table...');
      
      // Create the table
      await client.query(`
        CREATE TABLE business_questionnaires (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) NOT NULL,
          business_name VARCHAR(255),
          industry VARCHAR(100),
          description TEXT,
          anonymous_id VARCHAR(255),
          valuation_data JSONB,
          other_data JSONB,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          user_id UUID,
          status VARCHAR(50) DEFAULT 'pending',
          conversion_status VARCHAR(50) DEFAULT 'prospect'
        )
      `);
      
      // Create indexes
      await client.query(`
        CREATE INDEX business_questionnaires_email_idx ON business_questionnaires(email);
        CREATE INDEX business_questionnaires_anonymous_id_idx ON business_questionnaires(anonymous_id);
        CREATE INDEX business_questionnaires_status_idx ON business_questionnaires(status);
      `);
      
      console.log('business_questionnaires table created successfully');
    } else {
      console.log('business_questionnaires table already exists');
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
createBusinessQuestionnairesTable()
  .then(() => {
    console.log('Migration script execution completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });

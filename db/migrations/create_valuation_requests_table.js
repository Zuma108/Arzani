/**
 * Migration script to create the valuation_requests table
 * This table stores all valuation requests for tracking and analysis
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

async function createValuationRequestsTable() {
  const client = await pool.connect();
  
  try {
    console.log('Starting valuation_requests table migration...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'valuation_requests'
      )
    `);
    
    const tableExists = tableCheck.rows[0].exists;
    
    if (!tableExists) {
      console.log('Creating valuation_requests table...');
      
      // Create the table
      await client.query(`
        CREATE TABLE valuation_requests (
          id SERIAL PRIMARY KEY,
          anonymous_id VARCHAR(255),
          email VARCHAR(255),
          request_data JSONB NOT NULL,
          response_data JSONB,
          status VARCHAR(50) DEFAULT 'pending',
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          completed_at TIMESTAMP,
          error_message TEXT
        )
      `);
      
      // Create indexes
      await client.query(`
        CREATE INDEX valuation_requests_email_idx ON valuation_requests(email);
        CREATE INDEX valuation_requests_anonymous_id_idx ON valuation_requests(anonymous_id);
        CREATE INDEX valuation_requests_status_idx ON valuation_requests(status);
        CREATE INDEX valuation_requests_created_at_idx ON valuation_requests(created_at);
      `);
      
      console.log('valuation_requests table created successfully');
    } else {
      console.log('valuation_requests table already exists');
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
createValuationRequestsTable()
  .then(() => {
    console.log('Migration script execution completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });

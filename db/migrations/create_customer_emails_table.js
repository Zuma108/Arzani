/**
 * Migration script to create the customer_emails table
 * This will store emails collected from various customer touchpoints
 * for marketing and outreach purposes
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

async function createCustomerEmailsTable() {
  const client = await pool.connect();
  
  try {
    console.log('Starting customer_emails table migration...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'customer_emails'
      )
    `);
    
    const tableExists = tableCheck.rows[0].exists;
    
    if (!tableExists) {
      console.log('Creating customer_emails table...');
      
      // Create the table
      await client.query(`
        CREATE TABLE customer_emails (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) NOT NULL UNIQUE,
          source VARCHAR(100),
          anonymous_id VARCHAR(255),
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          last_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
          user_id UUID,
          opt_in BOOLEAN DEFAULT TRUE,
          interaction_count INTEGER DEFAULT 1,
          notes TEXT
        )
      `);
      
      // Create indexes
      await client.query(`
        CREATE INDEX customer_emails_email_idx ON customer_emails(email);
        CREATE INDEX customer_emails_source_idx ON customer_emails(source);
        CREATE INDEX customer_emails_anonymous_id_idx ON customer_emails(anonymous_id);
      `);
      
      console.log('customer_emails table created successfully');
    } else {
      console.log('customer_emails table already exists');
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
createCustomerEmailsTable()
  .then(() => {
    console.log('Migration script execution completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });

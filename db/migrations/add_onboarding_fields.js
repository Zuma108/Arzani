/**
 * Migration script to add onboarding fields to users table
 * Adds onboarding tracking and discovery source for marketing attribution
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function addOnboardingFields() {
  const client = await pool.connect();
  
  try {
    console.log('Starting onboarding fields migration...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Check if onboarding_completed column already exists
    const onboardingCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'onboarding_completed'
    `);
    
    if (onboardingCheck.rows.length === 0) {
      console.log('Adding onboarding fields to users table...');
      
      // Add onboarding tracking fields
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE,
        ADD COLUMN discovery_source VARCHAR(100),
        ADD COLUMN onboarding_completed_at TIMESTAMP,
        ADD COLUMN onboarding_data JSONB
      `);
      
      // Create index for faster onboarding status queries
      await client.query(`
        CREATE INDEX idx_users_onboarding_completed ON users(onboarding_completed);
        CREATE INDEX idx_users_discovery_source ON users(discovery_source);
      `);
      
      console.log('Added onboarding fields to users table');
    } else {
      console.log('Onboarding fields already exist in users table');
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
addOnboardingFields()
  .then(() => {
    console.log('Onboarding fields migration script execution completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });

/**
 * User Role Management Migration Runner
 * Executes the SQL migrations for implementing the new user role management system
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Create database connection
const pool = new pg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
});

/**
 * Runs the user role management migration
 */
async function runUserRoleMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Starting user role management migration...');
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, '../migrations/user_role_management.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Execute the SQL script
    await client.query(sqlContent);
    
    // Update existing users to have default roles
    // We'll default regular users with businesses to 'seller' and others to 'buyer'
    const setDefaultRolesQuery = `
      -- Set users with businesses as primary sellers
      UPDATE users u
      SET primary_role = 'seller'
      WHERE primary_role IS NULL
      AND EXISTS (
        SELECT 1 FROM businesses b WHERE b.user_id = u.id
      );
      
      -- Set remaining users as buyers
      UPDATE users u
      SET primary_role = 'buyer'
      WHERE primary_role IS NULL;
    `;
    
    await client.query(setDefaultRolesQuery);
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('✅ User role management migration completed successfully');
    console.log('✅ Default roles assigned to existing users');
    
    // Print updated stats
    const stats = await client.query(`
      SELECT 
        primary_role, 
        COUNT(*) as count 
      FROM users 
      GROUP BY primary_role 
      ORDER BY count DESC
    `);
    
    console.log('\nUser role distribution:');
    stats.rows.forEach(row => {
      console.log(`- ${row.primary_role || 'unassigned'}: ${row.count} users`);
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
runUserRoleMigration()
  .then(() => {
    console.log('Migration script execution completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
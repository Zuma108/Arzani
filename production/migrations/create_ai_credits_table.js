import fs from 'fs';
import path from 'path';
import pool from '../db.js';

/**
 * Run the migration to create the AI credits usage table
 */
async function runMigration() {
  console.log('Running migration: create_ai_credits_table');
  
  try {
    // Read the SQL file
    const sqlPath = path.join(process.cwd(), 'migrations', 'create_ai_credits_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    await pool.query(sql);
    
    console.log('Migration successful: AI credits table created');
  } catch (error) {
    console.error('Migration failed:', error.message);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default runMigration;

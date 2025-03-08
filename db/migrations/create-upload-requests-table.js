import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import pool from '../../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function createUploadRequestsTable() {
  try {
    console.log('Creating upload_requests table...');
    
    // Create the table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS upload_requests (
        id SERIAL PRIMARY KEY,
        request_id TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        processed BOOLEAN NOT NULL DEFAULT TRUE
      );
      
      -- Add index for faster lookups
      CREATE INDEX IF NOT EXISTS idx_upload_requests_request_id ON upload_requests(request_id);
      CREATE INDEX IF NOT EXISTS idx_upload_requests_user_id ON upload_requests(user_id);
    `);
    
    console.log('✅ upload_requests table created successfully');
  } catch (error) {
    console.error('❌ Error creating upload_requests table:', error);
    throw error;
  }
}

// Run the migration
createUploadRequestsTable()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });

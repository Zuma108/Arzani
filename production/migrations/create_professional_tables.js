import { fileURLToPath } from 'url';
import pool from '../db.js';

// Create tables for professional verification system
export async function createProfessionalTables() {
  try {
    console.log('Creating professional verification tables...');

    // Create table for professional verification requests if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS professional_verification_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        professional_type VARCHAR(50) NOT NULL,
        license_number VARCHAR(100),
        description TEXT,
        documents JSONB NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        review_notes TEXT,
        reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better query performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_pvr_user_id ON professional_verification_requests(user_id);
      CREATE INDEX IF NOT EXISTS idx_pvr_status ON professional_verification_requests(status);
      CREATE INDEX IF NOT EXISTS idx_pvr_professional_type ON professional_verification_requests(professional_type);
    `);

    console.log('Professional verification tables created successfully');
    return { success: true };
  } catch (error) {
    console.error('Error creating professional verification tables:', error);
    return { success: false, error: error.message };
  }
}

// Execute if run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createProfessionalTables()
    .then(result => {
      if (result.success) {
        console.log('Professional verification tables migration completed successfully');
        process.exit(0);
      } else {
        console.error('Migration failed:', result.error);
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('Unhandled error during migration:', err);
      process.exit(1);
    });
}

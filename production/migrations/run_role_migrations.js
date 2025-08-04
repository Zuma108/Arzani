import { fileURLToPath } from 'url';
import pool from '../db.js';

async function runRoleMigrations() {
  try {
    console.log('Running role system migrations...');

    // Role management columns for users table
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS primary_role VARCHAR(20) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS roles JSONB DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS is_verified_professional BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS professional_type VARCHAR(50) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS professional_verification_date TIMESTAMP DEFAULT NULL
    `);
    console.log('✅ Updated users table with role columns');

    // Create role activity tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_role_activities (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          role VARCHAR(20) NOT NULL,
          activity_type VARCHAR(50) NOT NULL,
          business_id INTEGER REFERENCES businesses(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created user_role_activities table');

    // Update professional_verification_requests table if needed
    await pool.query(`
      DO $$ 
      BEGIN
          -- Add reviewed_by column if it doesn't exist
          IF NOT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_name = 'professional_verification_requests' AND column_name = 'reviewed_by'
          ) THEN
              ALTER TABLE professional_verification_requests 
              ADD COLUMN reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
          END IF;
          
          -- Add review_notes column if it doesn't exist
          IF NOT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_name = 'professional_verification_requests' AND column_name = 'review_notes'
          ) THEN
              ALTER TABLE professional_verification_requests 
              ADD COLUMN review_notes TEXT;
          END IF;
          
          -- Add reviewed_at column if it doesn't exist
          IF NOT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_name = 'professional_verification_requests' AND column_name = 'reviewed_at'
          ) THEN
              ALTER TABLE professional_verification_requests 
              ADD COLUMN reviewed_at TIMESTAMP;
          END IF;
      END $$
    `);
    console.log('✅ Updated professional_verification_requests table');

    // Create user questionnaires table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_questionnaires (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          responses JSONB NOT NULL,
          recommended_role VARCHAR(20),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created user_questionnaires table');

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_primary_role ON users(primary_role);
      CREATE INDEX IF NOT EXISTS idx_users_is_verified_professional ON users(is_verified_professional);
      CREATE INDEX IF NOT EXISTS idx_user_role_activities_user_id ON user_role_activities(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_role_activities_role ON user_role_activities(role);
      CREATE INDEX IF NOT EXISTS idx_pvr_user_id ON professional_verification_requests(user_id);
      CREATE INDEX IF NOT EXISTS idx_pvr_status ON professional_verification_requests(status);
      CREATE INDEX IF NOT EXISTS idx_pvr_professional_type ON professional_verification_requests(professional_type)
    `);
    console.log('✅ Created indexes for optimized queries');

    console.log('Role system migrations completed successfully');
    return { success: true };
  } catch (error) {
    console.error('Error running role migrations:', error);
    return { success: false, error: error.message };
  }
}

// Execute if run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runRoleMigrations()
    .then(result => {
      if (result.success) {
        console.log('Migration completed successfully');
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

export { runRoleMigrations };

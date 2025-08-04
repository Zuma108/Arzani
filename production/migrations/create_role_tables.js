import pool from '../db.js';

// Function to create all the tables needed for role management system
export async function createRoleTables() {
  try {
    console.log('Creating role management tables...');

    // Add role columns to users table
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS primary_role VARCHAR(20) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS roles JSONB DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS is_verified_professional BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS professional_type VARCHAR(50) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS professional_verification_date TIMESTAMP DEFAULT NULL
    `);

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

    // Create table for professional verification requests
    await pool.query(`
      CREATE TABLE IF NOT EXISTS professional_verification_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        professional_type VARCHAR(50) NOT NULL,
        verification_notes TEXT,
        document_urls JSONB,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        admin_notes TEXT,
        reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

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

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_primary_role ON users(primary_role);
      CREATE INDEX IF NOT EXISTS idx_users_is_verified_professional ON users(is_verified_professional);
      CREATE INDEX IF NOT EXISTS idx_user_role_activities_user_id ON user_role_activities(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_role_activities_role ON user_role_activities(role);
      CREATE INDEX IF NOT EXISTS idx_professional_verification_requests_user_id ON professional_verification_requests(user_id);
      CREATE INDEX IF NOT EXISTS idx_professional_verification_requests_status ON professional_verification_requests(status);
    `);

    console.log('Role management tables created successfully');
    return { success: true };
  } catch (error) {
    console.error('Error creating role management tables:', error);
    return { success: false, error: error.message };
  }
}

// Execute if run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await createRoleTables();
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

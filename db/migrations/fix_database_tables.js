import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env with explicit path
dotenv.config({ path: path.join(__dirname, '../../.env') });

const { Pool } = pg;

// Create connection configuration
const connectionConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432
};

// Add SSL if in production
if (process.env.DB_SSL === 'true') {
  connectionConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(connectionConfig);

/**
 * Adds a column to a table if it doesn't exist
 */
async function addColumnIfNotExists(client, table, column, dataType, defaultValue = '') {
  try {
    // Check if column exists
    const result = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = $1 AND column_name = $2
    `, [table, column]);
    
    if (result.rows.length === 0) {
      // Column doesn't exist, add it
      let query = `ALTER TABLE ${table} ADD COLUMN ${column} ${dataType}`;
      if (defaultValue) {
        query += ` ${defaultValue}`;
      }
      await client.query(query);
      console.log(`Added column ${column} to ${table}`);
      return true; // Column was added
    }
    return false; // Column already existed
  } catch (err) {
    console.error(`Error checking/adding column ${column} to ${table}:`, err);
    throw err;
  }
}

/**
 * Fixes questionnaire_submissions table
 */
async function fixQuestionnaireSubmissionsTable() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Fixing questionnaire_submissions table...');
    
    // Add missing columns identified in verification
    await addColumnIfNotExists(client, 'questionnaire_submissions', 'submission_id', 'VARCHAR(255)');
    await addColumnIfNotExists(client, 'questionnaire_submissions', 'data', 'JSONB');
    await addColumnIfNotExists(client, 'questionnaire_submissions', 'updated_at', 'TIMESTAMP', 'DEFAULT CURRENT_TIMESTAMP');
    
    // If submission_id doesn't have a unique constraint, add it
    const constraintCheck = await client.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'questionnaire_submissions' 
      AND constraint_type = 'UNIQUE'
      AND constraint_name LIKE '%submission_id%'
    `);
    
    if (constraintCheck.rows.length === 0) {
      // First populate submission_id for any rows that don't have it
      await client.query(`
        UPDATE questionnaire_submissions 
        SET submission_id = 'sub_' || id || '_' || floor(random() * 1000000)::text
        WHERE submission_id IS NULL OR submission_id = ''
      `);
      
      // Now add the constraint
      await client.query(`
        ALTER TABLE questionnaire_submissions 
        ADD CONSTRAINT questionnaire_submissions_submission_id_key UNIQUE (submission_id)
      `);
      console.log('Added unique constraint to submission_id column');
    }
    
    // Set up the update trigger if it doesn't exist
    const triggerCheck = await client.query(`
      SELECT tgname FROM pg_trigger 
      WHERE tgrelid = 'questionnaire_submissions'::regclass 
      AND tgname = 'update_timestamp'
    `);
    
    if (triggerCheck.rows.length === 0) {
      // Create function if it doesn't exist
      await client.query(`
        CREATE OR REPLACE FUNCTION update_timestamp()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);
      
      // Create trigger
      await client.query(`
        CREATE TRIGGER update_timestamp
        BEFORE UPDATE ON questionnaire_submissions
        FOR EACH ROW
        EXECUTE FUNCTION update_timestamp();
      `);
      console.log('Added update_timestamp trigger to questionnaire_submissions');
    }
    
    await client.query('COMMIT');
    console.log('Questionnaire submissions table fixed successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error fixing questionnaire_submissions table:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Fixes business_valuations table
 */
async function fixBusinessValuationsTable() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Fixing business_valuations table...');
    
    // Add missing columns identified in verification
    await addColumnIfNotExists(client, 'business_valuations', 'email', 'VARCHAR(255)');
    await addColumnIfNotExists(client, 'business_valuations', 'valuation_data', 'JSONB');
    await addColumnIfNotExists(client, 'business_valuations', 'updated_at', 'TIMESTAMP', 'DEFAULT CURRENT_TIMESTAMP');
    await addColumnIfNotExists(client, 'business_valuations', 'submission_id', 'VARCHAR(255)');
    
    // Create indexes if they don't exist
    const emailIndexCheck = await client.query(`
      SELECT indexname FROM pg_indexes 
      WHERE tablename = 'business_valuations' AND indexname = 'idx_business_valuations_email'
    `);
    
    if (emailIndexCheck.rows.length === 0) {
      await client.query(`
        CREATE INDEX idx_business_valuations_email ON business_valuations(email)
      `);
      console.log('Created index on email column in business_valuations');
    }
    
    const submissionIdIndexCheck = await client.query(`
      SELECT indexname FROM pg_indexes 
      WHERE tablename = 'business_valuations' AND indexname = 'idx_business_valuations_submission_id'
    `);
    
    if (submissionIdIndexCheck.rows.length === 0) {
      await client.query(`
        CREATE INDEX idx_business_valuations_submission_id ON business_valuations(submission_id)
      `);
      console.log('Created index on submission_id column in business_valuations');
    }
    
    // Set up the update trigger if it doesn't exist
    const triggerCheck = await client.query(`
      SELECT tgname FROM pg_trigger 
      WHERE tgrelid = 'business_valuations'::regclass 
      AND tgname = 'update_timestamp'
    `);
    
    if (triggerCheck.rows.length === 0) {
      // Create trigger
      await client.query(`
        CREATE TRIGGER update_timestamp
        BEFORE UPDATE ON business_valuations
        FOR EACH ROW
        EXECUTE FUNCTION update_timestamp();
      `);
      console.log('Added update_timestamp trigger to business_valuations');
    }
    
    await client.query('COMMIT');
    console.log('Business valuations table fixed successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error fixing business_valuations table:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Try to link existing questionnaire_submissions to business_valuations based on email
 */
async function linkExistingRecords() {
  const client = await pool.connect();
  
  try {
    console.log('Linking existing questionnaire submissions with business valuations...');
    
    // Update business_valuations with email from questionnaire_submissions where possible
    await client.query(`
      UPDATE business_valuations bv
      SET email = qs.email
      FROM questionnaire_submissions qs
      WHERE bv.business_id = qs.business_id AND bv.email IS NULL AND qs.email IS NOT NULL
    `);
    
    // Update business_valuations with submission_id from questionnaire_submissions where possible
    await client.query(`
      UPDATE business_valuations bv
      SET submission_id = qs.submission_id
      FROM questionnaire_submissions qs
      WHERE bv.business_id = qs.business_id AND bv.submission_id IS NULL AND qs.submission_id IS NOT NULL
    `);
    
    // Count the records we updated
    const result = await client.query(`
      SELECT 
        COUNT(*) FILTER (WHERE email IS NOT NULL) as emails_present,
        COUNT(*) FILTER (WHERE submission_id IS NOT NULL) as submission_ids_present
      FROM business_valuations
    `);
    
    console.log(`Successfully processed business_valuations:
      - Records with email: ${result.rows[0].emails_present}
      - Records with submission_id: ${result.rows[0].submission_ids_present}
    `);
    
  } catch (error) {
    console.error('Error linking existing records:', error);
  } finally {
    client.release();
  }
}

/**
 * Main function to run all fixes
 */
async function fixDatabaseTables() {
  try {
    // Fix both tables
    await fixQuestionnaireSubmissionsTable();
    await fixBusinessValuationsTable();
    
    // Try to link existing records
    await linkExistingRecords();
    
    console.log('Database tables fixed successfully!');
  } catch (error) {
    console.error('Failed to fix database tables:', error);
    throw error;
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run script directly
if (import.meta.url === new URL(import.meta.url).href) {
  fixDatabaseTables()
    .then(() => {
      console.log('Database fixes completed successfully');
      process.exit(0);
    })
    .catch(err => {
      console.error('Database fixes failed:', err);
      process.exit(1);
    });
}

export default fixDatabaseTables;

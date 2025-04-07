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

// Check explicit SSL setting
if (process.env.DB_SSL && process.env.DB_SSL.toLowerCase() === 'true') {
  connectionConfig.ssl = { rejectUnauthorized: false };
}

// Create the pool with the appropriate config
const pool = new Pool(connectionConfig);

async function updateQuestionnaireSubmissionsTable() {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    console.log('Checking and updating questionnaire_submissions table...');
    
    // First check if the table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'questionnaire_submissions'
      );
    `);
    
    // If table doesn't exist, create it
    if (!tableCheck.rows[0].exists) {
      console.log('Table questionnaire_submissions does not exist. Creating...');
      
      await client.query(`
        CREATE TABLE questionnaire_submissions (
          id SERIAL PRIMARY KEY,
          submission_id VARCHAR(255) UNIQUE NOT NULL,
          user_id INTEGER,
          email VARCHAR(255) NOT NULL,
          business_name VARCHAR(255),
          industry VARCHAR(255),
          location VARCHAR(255),
          description TEXT,
          revenue NUMERIC,
          ebitda NUMERIC,
          years_in_operation INTEGER,
          cash_on_cash NUMERIC,
          ffe_value NUMERIC,
          growth_rate NUMERIC,
          total_debt NUMERIC,
          debt_transferable VARCHAR(50),
          contact_name VARCHAR(255),
          contact_phone VARCHAR(50),
          valuation_min NUMERIC,
          valuation_max NUMERIC,
          adjusted_valuation NUMERIC,
          full_data JSONB,
          valuation_data JSONB,
          status VARCHAR(50) DEFAULT 'pending',
          is_linked BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX idx_questionnaire_submissions_email ON questionnaire_submissions(email);
        CREATE INDEX idx_questionnaire_submissions_user_id ON questionnaire_submissions(user_id);
      `);
      
      console.log('Table questionnaire_submissions created successfully.');
      await client.query('COMMIT');
      return;
    }
    
    // Table exists, check for missing columns and add them
    console.log('Table questionnaire_submissions exists. Checking for missing columns...');
    
    // Get existing columns
    const columnsCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'questionnaire_submissions';
    `);
    
    const existingColumns = new Set(columnsCheck.rows.map(row => row.column_name));
    
    // Define columns that should be in the table
    const requiredColumns = [
      { name: 'submission_id', type: 'VARCHAR(255)', constraint: 'UNIQUE NOT NULL' },
      { name: 'user_id', type: 'INTEGER' },
      { name: 'email', type: 'VARCHAR(255)', constraint: 'NOT NULL' },
      { name: 'business_name', type: 'VARCHAR(255)' },
      { name: 'industry', type: 'VARCHAR(255)' },
      { name: 'location', type: 'VARCHAR(255)' },
      { name: 'description', type: 'TEXT' },
      { name: 'revenue', type: 'NUMERIC' },
      { name: 'ebitda', type: 'NUMERIC' },
      { name: 'years_in_operation', type: 'INTEGER' },
      { name: 'cash_on_cash', type: 'NUMERIC' },
      { name: 'ffe_value', type: 'NUMERIC' },
      { name: 'growth_rate', type: 'NUMERIC' },
      { name: 'total_debt', type: 'NUMERIC' },
      { name: 'debt_transferable', type: 'VARCHAR(50)' },
      { name: 'contact_name', type: 'VARCHAR(255)' },
      { name: 'contact_phone', type: 'VARCHAR(50)' },
      { name: 'valuation_min', type: 'NUMERIC' },
      { name: 'valuation_max', type: 'NUMERIC' },
      { name: 'adjusted_valuation', type: 'NUMERIC' },
      { name: 'full_data', type: 'JSONB' },
      { name: 'valuation_data', type: 'JSONB' },
      { name: 'status', type: 'VARCHAR(50)', default: "DEFAULT 'pending'" },
      { name: 'is_linked', type: 'BOOLEAN', default: 'DEFAULT FALSE' },
      { name: 'created_at', type: 'TIMESTAMP', default: 'DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'TIMESTAMP', default: 'DEFAULT CURRENT_TIMESTAMP' }
    ];
    
    // Add missing columns
    let columnsAdded = 0;
    for (const column of requiredColumns) {
      if (!existingColumns.has(column.name)) {
        console.log(`Adding missing column: ${column.name}`);
        
        let alterQuery = `ALTER TABLE questionnaire_submissions ADD COLUMN ${column.name} ${column.type}`;
        if (column.constraint) alterQuery += ` ${column.constraint}`;
        if (column.default) alterQuery += ` ${column.default}`;
        alterQuery += ';';
        
        await client.query(alterQuery);
        columnsAdded++;
      }
    }
    
    // Check and add indexes if needed
    const indexCheck = await client.query(`
      SELECT indexname FROM pg_indexes 
      WHERE tablename = 'questionnaire_submissions';
    `);
    
    const existingIndexes = new Set(indexCheck.rows.map(row => row.indexname));
    
    if (!existingIndexes.has('idx_questionnaire_submissions_email')) {
      console.log('Adding missing index on email column');
      await client.query(`
        CREATE INDEX idx_questionnaire_submissions_email ON questionnaire_submissions(email);
      `);
    }
    
    if (!existingIndexes.has('idx_questionnaire_submissions_user_id')) {
      console.log('Adding missing index on user_id column');
      await client.query(`
        CREATE INDEX idx_questionnaire_submissions_user_id ON questionnaire_submissions(user_id);
      `);
    }
    
    if (!existingIndexes.has('idx_questionnaire_submissions_created_at')) {
      console.log('Adding missing index on created_at column');
      await client.query(`
        CREATE INDEX idx_questionnaire_submissions_created_at ON questionnaire_submissions(created_at);
      `);
    }
    
    // Add updated_at trigger if it doesn't exist
    const triggerCheck = await client.query(`
      SELECT tgname FROM pg_trigger 
      WHERE tgrelid = 'questionnaire_submissions'::regclass 
      AND tgname = 'set_updated_at';
    `);
    
    if (triggerCheck.rows.length === 0) {
      console.log('Adding updated_at trigger');
      
      // First create the trigger function if it doesn't exist
      await client.query(`
        CREATE OR REPLACE FUNCTION trigger_set_timestamp()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);
      
      // Then create the trigger
      await client.query(`
        CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON questionnaire_submissions
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_timestamp();
      `);
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    if (columnsAdded > 0) {
      console.log(`Added ${columnsAdded} missing columns to questionnaire_submissions table.`);
    } else {
      console.log('No missing columns found in questionnaire_submissions table.');
    }
    
    console.log('questionnaire_submissions table update completed successfully.');
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('Error updating questionnaire_submissions table:', error);
    throw error;
  } finally {
    // Release client
    client.release();
  }
}

// Run the migration if executed directly
if (import.meta.url === new URL(import.meta.url).href) {
  updateQuestionnaireSubmissionsTable()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

export default updateQuestionnaireSubmissionsTable;

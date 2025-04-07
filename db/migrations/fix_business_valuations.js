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
 * Adds a column to a table if it doesn't exist or modifies its constraints
 */
async function fixColumn(client, table, column, dataType, nullable = true, defaultValue = null) {
  try {
    // Check if column exists
    const result = await client.query(`
      SELECT column_name, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = $1 AND column_name = $2
    `, [table, column]);
    
    if (result.rows.length === 0) {
      // Column doesn't exist, add it
      let query = `ALTER TABLE ${table} ADD COLUMN ${column} ${dataType}`;
      if (!nullable) {
        query += ' NOT NULL';
      }
      if (defaultValue !== null) {
        query += ` DEFAULT ${defaultValue}`;
      }
      await client.query(query);
      console.log(`Added column ${column} to ${table}`);
      return true;
    } else {
      // Column exists, check if we need to alter NOT NULL constraint
      const isNullable = result.rows[0].is_nullable === 'YES';
      
      if (!isNullable && nullable) {
        // Drop the NOT NULL constraint
        await client.query(`
          ALTER TABLE ${table} 
          ALTER COLUMN ${column} DROP NOT NULL
        `);
        console.log(`Made column ${column} nullable in ${table}`);
        return true;
      } else if (isNullable && !nullable) {
        // Add NOT NULL constraint
        await client.query(`
          ALTER TABLE ${table} 
          ALTER COLUMN ${column} SET NOT NULL
        `);
        console.log(`Made column ${column} NOT NULL in ${table}`);
        return true;
      }
    }
    return false; // No changes needed
  } catch (err) {
    console.error(`Error fixing column ${column} in ${table}:`, err);
    throw err;
  }
}

/**
 * Fix the business_valuations table by making business_id and confidence nullable
 */
async function fixBusinessValuationsTable() {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    console.log('Checking business_valuations table structure...');
    
    // Get all column constraints
    const columnsCheck = await client.query(`
      SELECT column_name, is_nullable, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'business_valuations'
      ORDER BY ordinal_position
    `);
    
    // Print current columns and their constraints
    console.log('Current columns in business_valuations:');
    columnsCheck.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type}, ${col.is_nullable === 'YES' ? 'nullable' : 'NOT NULL'}, default: ${col.column_default || 'none'}`);
    });
    
    // Fix the business_id column
    await fixColumn(client, 'business_valuations', 'business_id', 'INTEGER', true);
    
    // Fix the confidence column that's causing the error
    await fixColumn(client, 'business_valuations', 'confidence', 'INTEGER', true);
    
    // Also check for other columns that might need to be nullable
    const columnsToFix = [
      { name: 'submission_id', type: 'VARCHAR(255)' },
      { name: 'email', type: 'VARCHAR(255)' },
      { name: 'valuation_data', type: 'JSONB' },
      { name: 'multiple', type: 'NUMERIC' },
      { name: 'multiple_type', type: 'VARCHAR(50)' },
      { name: 'summary', type: 'TEXT' }
    ];
    
    for (const column of columnsToFix) {
      await fixColumn(client, 'business_valuations', column.name, column.type, true);
    }
    
    // Create any missing required columns
    const requiredColumns = ['submission_id', 'email', 'valuation_data', 'updated_at'];
    
    for (const column of requiredColumns) {
      let dataType;
      let defaultValue = null;
      
      if (column === 'valuation_data') {
        dataType = 'JSONB';
      } else if (column === 'updated_at') {
        dataType = 'TIMESTAMP';
        defaultValue = 'CURRENT_TIMESTAMP';
      } else {
        dataType = 'VARCHAR(255)';
      }
      
      // Check if column exists
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'business_valuations' AND column_name = $1
      `, [column]);
      
      if (columnCheck.rows.length === 0) {
        console.log(`Required column '${column}' is missing, adding it...`);
        
        let query = `ALTER TABLE business_valuations ADD COLUMN ${column} ${dataType}`;
        if (defaultValue) {
          query += ` DEFAULT ${defaultValue}`;
        }
        await client.query(query);
        
        console.log(`Added ${column} column`);
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('Successfully fixed business_valuations table structure');
    
    // Verify the changes
    const verifyCheck = await client.query(`
      SELECT column_name, is_nullable, data_type
      FROM information_schema.columns 
      WHERE table_name = 'business_valuations' AND column_name IN ('business_id', 'confidence')
    `);
    
    console.log('\nVerification of fixed columns:');
    verifyCheck.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type}, ${col.is_nullable === 'YES' ? 'nullable ✅' : 'NOT NULL ❌'}`);
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error fixing business_valuations table:', error);
    throw error;
  } finally {
    client.release();
  }
}

// If executed directly
if (import.meta.url === new URL(import.meta.url).href) {
  fixBusinessValuationsTable()
    .then(() => {
      console.log('Database migration completed successfully');
      pool.end();
      process.exit(0);
    })
    .catch(err => {
      console.error('Migration failed:', err);
      pool.end();
      process.exit(1);
    });
}

export default fixBusinessValuationsTable;

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Initialize the connection pool using environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? 
    { rejectUnauthorized: false } : 
    false
});

async function run() {
  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    console.log('Checking businesses table schema...');
    
    // Check if the images column is of the correct type
    const columnCheckResult = await client.query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'businesses' 
      AND column_name = 'images'
    `);
    
    if (columnCheckResult.rows.length === 0) {
      console.log('Images column not found, adding it...');
      
      // Add the images column as text[]
      await client.query(`
        ALTER TABLE businesses 
        ADD COLUMN images text[] DEFAULT NULL
      `);
      
      console.log('Images column added as text[]');
    } else {
      const dataType = columnCheckResult.rows[0].data_type;
      console.log(`Found images column with type: ${dataType}`);
      
      // If the column is not text[], modify it
      if (dataType !== 'ARRAY') {
        console.log('Converting images column to text[]...');
        
        // First, create a backup of the current data
        await client.query(`
          ALTER TABLE businesses 
          ADD COLUMN images_backup ${dataType}
        `);
        
        await client.query(`
          UPDATE businesses 
          SET images_backup = images
        `);
        
        // Then drop and recreate the column
        await client.query(`
          ALTER TABLE businesses 
          DROP COLUMN images
        `);
        
        await client.query(`
          ALTER TABLE businesses 
          ADD COLUMN images text[] DEFAULT NULL
        `);
        
        console.log('Images column converted to text[]');
      }
    }
    
    // Check for any numeric columns that should accept NULL
    const numericColumns = [
      'price', 'cash_flow', 'gross_revenue', 'ebitda', 'inventory',
      'sales_multiple', 'profit_margin', 'debt_service', 'cash_on_cash',
      'down_payment', 'ffe', 'employees', 'years_in_operation'
    ];
    
    for (const column of numericColumns) {
      // Check if column exists and is not nullable
      const nullableResult = await client.query(`
        SELECT is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'businesses' 
        AND column_name = '${column}'
      `);
      
      if (nullableResult.rows.length > 0 && nullableResult.rows[0].is_nullable === 'NO') {
        console.log(`Making ${column} column nullable...`);
        
        await client.query(`
          ALTER TABLE businesses 
          ALTER COLUMN ${column} DROP NOT NULL
        `);
        
        console.log(`${column} column is now nullable`);
      }
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log('Database migration completed successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    client.release();
    pool.end();
  }
}

// Run the migration
run().catch(console.error);

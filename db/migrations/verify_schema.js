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

async function verifySchema() {
  const client = await pool.connect();
  
  try {
    console.log('Verifying database schema...');
    
    // Check tables
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    const tablesResult = await client.query(tablesQuery);
    console.log(`\nDatabase has ${tablesResult.rows.length} tables:`);
    tablesResult.rows.forEach(row => console.log(`- ${row.table_name}`));
    
    // Check key tables
    const requiredTables = [
      'questionnaire_submissions',
      'business_valuations'
    ];
    
    for (const table of requiredTables) {
      const exists = tablesResult.rows.some(row => row.table_name === table);
      if (!exists) {
        console.error(`⚠️ Required table '${table}' is missing!`);
      } else {
        // Table exists, check columns
        const columnsQuery = `
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = $1
          ORDER BY ordinal_position;
        `;
        
        const columnsResult = await client.query(columnsQuery, [table]);
        console.log(`\nTable '${table}' has ${columnsResult.rows.length} columns:`);
        columnsResult.rows.forEach(column => {
          console.log(`- ${column.column_name} (${column.data_type})`);
        });
        
        // Check if required columns exist
        const requiredColumns = {
          'questionnaire_submissions': ['id', 'email', 'submission_id', 'data', 'created_at', 'updated_at'],
          'business_valuations': ['id', 'email', 'valuation_data', 'created_at', 'updated_at']
        };
        
        if (requiredColumns[table]) {
          const missingColumns = requiredColumns[table].filter(col => 
            !columnsResult.rows.some(row => row.column_name === col)
          );
          
          if (missingColumns.length > 0) {
            console.error(`⚠️ Table '${table}' is missing required columns: ${missingColumns.join(', ')}`);
          }
        }
        
        // Check if indexes exist
        const indexesQuery = `
          SELECT indexname, indexdef
          FROM pg_indexes
          WHERE tablename = $1;
        `;
        
        const indexesResult = await client.query(indexesQuery, [table]);
        console.log(`\nTable '${table}' has ${indexesResult.rows.length} indexes:`);
        indexesResult.rows.forEach(index => {
          console.log(`- ${index.indexname}: ${index.indexdef}`);
        });
      }
    }
    
    console.log('\nSchema verification complete.');
  } catch (error) {
    console.error('Error verifying schema:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the verification if executed directly
if (import.meta.url === new URL(import.meta.url).href) {
  verifySchema()
    .then(() => {
      console.log('Verification completed successfully');
      process.exit(0);
    })
    .catch(err => {
      console.error('Verification failed:', err);
      process.exit(1);
    });
}

export default verifySchema;

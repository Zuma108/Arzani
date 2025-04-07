import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env with explicit path
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Function to test database connection with various parameters
async function testConnection(config) {
  const pool = new pg.Pool(config);
  
  try {
    console.log(`Testing connection with config:`, {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      ssl: config.ssl ? 'enabled' : 'disabled'
    });
    
    // Test basic connection
    const client = await pool.connect();
    console.log('✅ Successfully connected to database');
    
    // Try to execute a simple query
    const result = await client.query('SELECT current_database() as db, current_user as user, version() as version');
    console.log('✅ Successfully executed query');
    console.log('Database info:', result.rows[0]);
    
    // Try to get a list of tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log(`\nFound ${tablesResult.rows.length} tables in database:`);
    console.table(tablesResult.rows.map(row => ({ table: row.table_name })));
    
    // Check permissions
    const permissionsQuery = `
      SELECT table_name, privilege_type 
      FROM information_schema.table_privileges 
      WHERE grantee = current_user 
      AND table_schema = 'public'
      AND table_name IN (
        SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
      )
      ORDER BY table_name, privilege_type
    `;
    
    const permissionsResult = await client.query(permissionsQuery);
    
    console.log(`\nYour user has the following permissions:`);
    
    // Group permissions by table
    const permissionsByTable = {};
    permissionsResult.rows.forEach(row => {
      if (!permissionsByTable[row.table_name]) {
        permissionsByTable[row.table_name] = [];
      }
      permissionsByTable[row.table_name].push(row.privilege_type);
    });
    
    // Display permissions
    Object.entries(permissionsByTable).forEach(([table, privileges]) => {
      console.log(`- ${table}: ${privileges.join(', ')}`);
    });
    
    client.release();
    console.log('\n✅ Connection test successful');
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error details:', error);
    return false;
  } finally {
    await pool.end();
  }
}

// Create connection configuration based on environment variables
const baseConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432
};

// Run connection tests with different configurations
async function runConnectionTests() {
  console.log('Starting database connection tests...\n');
  
  let success = false;
  
  // Test 1: Base configuration
  console.log('Test 1: Using base configuration');
  success = await testConnection(baseConfig);
  
  // If base config fails, try with SSL
  if (!success && process.env.DB_SSL !== 'true') {
    console.log('\nTest 2: Adding SSL configuration');
    success = await testConnection({
      ...baseConfig,
      ssl: { rejectUnauthorized: false }
    });
  }
  
  // If still failing, check for common issues
  if (!success) {
    console.log('\n❌ All connection attempts failed. Checking for common issues:');
    
    // Check if .env file exists and has required variables
    const envPath = path.join(__dirname, '../../.env');
    if (!fs.existsSync(envPath)) {
      console.error('- .env file not found at', envPath);
    } else {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const missingVars = ['DB_USER', 'DB_HOST', 'DB_NAME', 'DB_PASSWORD'].filter(
        v => !envContent.includes(`${v}=`)
      );
      
      if (missingVars.length > 0) {
        console.error(`- Missing environment variables: ${missingVars.join(', ')}`);
      }
    }
    
    console.log('\nTroubleshooting steps:');
    console.log('1. Verify your database credentials in the .env file');
    console.log('2. Check if the database server is running and accessible');
    console.log('3. Ensure your IP address has access to the database server');
    console.log('4. Check if the database and required tables exist');
    console.log('5. Verify that your database user has appropriate permissions');
  }
  
  return success;
}

// Run the tests if executed directly
if (import.meta.url === new URL(import.meta.url).href) {
  runConnectionTests()
    .then(success => {
      console.log('\nDatabase connection test complete.');
      process.exit(success ? 0 : 1);
    })
    .catch(err => {
      console.error('Unhandled error:', err);
      process.exit(1);
    });
}

export default runConnectionTests;

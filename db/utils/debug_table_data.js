import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

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

console.log('Connection config:', {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
  ssl: process.env.DB_SSL === 'true' ? 'enabled' : 'disabled'
});

const pool = new Pool(connectionConfig);

async function debugTableData() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to database successfully');
    
    // 1. Check if tables exist
    const tableCheckQuery = `
      SELECT table_name, 
             (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      AND table_name IN ('questionnaire_submissions', 'business_valuations');
    `;
    
    const tableResult = await client.query(tableCheckQuery);
    console.log('\nTable existence check:');
    if (tableResult.rows.length === 0) {
      console.error('❌ Neither of the tables exist!');
    } else {
      tableResult.rows.forEach(table => {
        console.log(`✅ Table ${table.table_name} exists with ${table.column_count} columns`);
      });
    }
    
    // 2. Check if tables have data
    const tables = ['questionnaire_submissions', 'business_valuations'];
    for (const table of tables) {
      try {
        const countQuery = `SELECT COUNT(*) FROM ${table}`;
        const countResult = await client.query(countQuery);
        const count = parseInt(countResult.rows[0].count);
        
        console.log(`\nTable ${table} has ${count} rows`);
        
        if (count === 0) {
          console.log(`⚠️ Table ${table} is empty`);
        } else {
          // Get a sample row
          const sampleQuery = `SELECT * FROM ${table} LIMIT 1`;
          const sampleResult = await client.query(sampleQuery);
          console.log(`Sample row from ${table}:`, sampleResult.rows[0]);
        }
      } catch (error) {
        console.error(`Error checking table ${table}:`, error.message);
      }
    }
    
    // 3. Test inserting sample data
    console.log('\nTesting data insertion...');
    
    // Generate unique IDs for test data
    const testSubmissionId = `test_${Date.now()}_${uuidv4().substring(0, 8)}`;
    const testEmail = `test_${Date.now()}@example.com`;
    
    // Try inserting into questionnaire_submissions
    try {
      const insertSubmissionQuery = `
        INSERT INTO questionnaire_submissions (
          submission_id, 
          email, 
          business_name, 
          industry,
          data,
          status,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING id, submission_id
      `;
      
      const submissionValues = [
        testSubmissionId,
        testEmail,
        'Test Business',
        'Test Industry',
        JSON.stringify({ test: true, timestamp: Date.now() }),
        'test'
      ];
      
      const submissionResult = await client.query(insertSubmissionQuery, submissionValues);
      console.log('✅ Successfully inserted test data into questionnaire_submissions:', {
        id: submissionResult.rows[0].id,
        submission_id: submissionResult.rows[0].submission_id
      });
      
      // Try inserting into business_valuations - check column existence first
      const columnCheck = await client.query(`
        SELECT column_name, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'business_valuations' AND column_name = 'business_id'
      `);
      
      const businessIdRequired = columnCheck.rows.length > 0 && columnCheck.rows[0].is_nullable === 'NO';
      
      // Build the query dynamically based on required fields
      let valuationColumns = [
        'submission_id',
        'email',
        'valuation_min',
        'valuation_max',
        'estimated_value',
        'valuation_data',
        'created_at',
        'updated_at'
      ];
      
      let valuationValues = [
        testSubmissionId,
        testEmail,
        100000,
        200000,
        150000,
        JSON.stringify({ test: true, timestamp: Date.now() }),
        'NOW()',
        'NOW()'
      ];
      
      // Add business_id only if it's required
      if (businessIdRequired) {
        valuationColumns.push('business_id');
        valuationValues.push(null); // This will cause an error, but that's expected and will be caught
      }
      
      // Generate placeholders ($1, $2, etc.)
      const placeholders = valuationValues.map((_, i) => 
        valuationValues[i] === 'NOW()' ? 'NOW()' : `$${i + 1}`
      );
      
      // Remove NOW() from values since they're handled directly in the query
      valuationValues = valuationValues.filter(v => v !== 'NOW()');
      
      const insertValuationQuery = `
        INSERT INTO business_valuations (
          ${valuationColumns.join(', ')}
        ) VALUES (
          ${placeholders.join(', ')}
        )
        RETURNING id
      `;
      
      try {
        const valuationResult = await client.query(insertValuationQuery, valuationValues);
        console.log('✅ Successfully inserted test data into business_valuations:', {
          id: valuationResult.rows[0].id
        });
        
        // Verify data was inserted
        const verifySubmissionQuery = `SELECT * FROM questionnaire_submissions WHERE submission_id = $1`;
        const verifySubmissionResult = await client.query(verifySubmissionQuery, [testSubmissionId]);
        
        const verifyValuationQuery = `SELECT * FROM business_valuations WHERE submission_id = $1`;
        const verifyValuationResult = await client.query(verifyValuationQuery, [testSubmissionId]);
        
        if (verifySubmissionResult.rows.length > 0 && verifyValuationResult.rows.length > 0) {
          console.log('✅ Verified test data in both tables');
        } else {
          console.log('⚠️ Verification failed - data may not be persisting correctly');
        }
      } catch (valError) {
        console.error('❌ Error inserting into business_valuations:', valError.message);
        console.log('⚠️ This is likely due to a NOT NULL constraint on business_id column');
        console.log('💡 Run "node db/migrations/fix_business_valuations.js" to fix this issue');
      }
      
      // Clean up test data
      console.log('\nCleaning up test data...');
      await client.query('DELETE FROM business_valuations WHERE submission_id = $1', [testSubmissionId]);
      await client.query('DELETE FROM questionnaire_submissions WHERE submission_id = $1', [testSubmissionId]);
      console.log('✅ Test data deleted');
      
    } catch (error) {
      console.error('❌ Error during test data insertion:', error.message);
      console.error('Error details:', error);
    }
    
    // 4. Check database permissions
    console.log('\nChecking database permissions...');
    try {
      const permissionsQuery = `
        SELECT grantee, table_name, privilege_type
        FROM information_schema.table_privileges
        WHERE table_name IN ('questionnaire_submissions', 'business_valuations')
        ORDER BY table_name, grantee;
      `;
      
      const permissionsResult = await client.query(permissionsQuery);
      
      if (permissionsResult.rows.length === 0) {
        console.log('⚠️ No explicit permissions found for these tables');
      } else {
        console.log('Permissions for relevant tables:');
        permissionsResult.rows.forEach(row => {
          console.log(`- ${row.table_name}: ${row.privilege_type} granted to ${row.grantee}`);
        });
      }
    } catch (error) {
      console.error('Error checking permissions:', error.message);
    }
    
  } catch (error) {
    console.error('Database connection or query error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the debug function
debugTableData().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}).then(() => {
  console.log('Debugging complete');
  process.exit(0);
});

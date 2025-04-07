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

async function viewData() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to database successfully');
    
    // Get count of rows in each table
    const countQS = await client.query('SELECT COUNT(*) FROM questionnaire_submissions');
    const countBV = await client.query('SELECT COUNT(*) FROM business_valuations');
    
    console.log(`\nTable questionnaire_submissions has ${countQS.rows[0].count} total rows`);
    console.log(`Table business_valuations has ${countBV.rows[0].count} total rows`);
    
    // View the most recent submissions
    console.log('\n=== RECENT QUESTIONNAIRE SUBMISSIONS ===');
    const recentQS = await client.query(`
      SELECT id, submission_id, email, business_name, industry, created_at
      FROM questionnaire_submissions
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    if (recentQS.rows.length === 0) {
      console.log('No questionnaire submissions found');
    } else {
      console.table(recentQS.rows);
    }
    
    // View the most recent valuations
    console.log('\n=== RECENT BUSINESS VALUATIONS ===');
    const recentBV = await client.query(`
      SELECT id, submission_id, email, valuation_min, valuation_max, estimated_value, created_at
      FROM business_valuations
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    if (recentBV.rows.length === 0) {
      console.log('No business valuations found');
    } else {
      console.table(recentBV.rows);
    }
    
    // View specific submission if ID is provided as argument
    const submissionId = process.argv[2];
    if (submissionId) {
      console.log(`\n=== DETAILS FOR SUBMISSION ${submissionId} ===`);
      
      // Get questionnaire data
      const qsData = await client.query(`
        SELECT * FROM questionnaire_submissions WHERE submission_id = $1
      `, [submissionId]);
      
      if (qsData.rows.length === 0) {
        console.log(`No questionnaire submission found with ID: ${submissionId}`);
      } else {
        console.log('QUESTIONNAIRE DATA:');
        const data = qsData.rows[0];
        
        // Format the output to be more readable
        const formattedData = {
          id: data.id,
          submission_id: data.submission_id,
          email: data.email,
          business_name: data.business_name,
          industry: data.industry,
          revenue: data.revenue,
          ebitda: data.ebitda,
          created_at: data.created_at,
          status: data.status,
          is_linked: data.is_linked
        };
        
        console.table(formattedData);
        
        // Get associated valuation
        const valData = await client.query(`
          SELECT * FROM business_valuations WHERE submission_id = $1
        `, [submissionId]);
        
        if (valData.rows.length === 0) {
          console.log('No valuation data found for this submission');
        } else {
          console.log('\nVALUATION DATA:');
          const val = valData.rows[0];
          
          const formattedVal = {
            id: val.id,
            valuation_min: val.valuation_min,
            valuation_max: val.valuation_max,
            estimated_value: val.estimated_value,
            confidence: val.confidence,
            multiple: val.multiple,
            multiple_type: val.multiple_type,
            created_at: val.created_at
          };
          
          console.table(formattedVal);
        }
      }
    }
    
  } catch (error) {
    console.error('Error viewing data:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the debug function
viewData().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}).then(() => {
  console.log('View data complete');
  process.exit(0);
});

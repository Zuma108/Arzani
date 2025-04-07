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

const pool = new Pool(connectionConfig);

// Generate sample business data
function generateBusinessData(index) {
  const industries = [
    'Retail', 
    'Online & Technology', 
    'Service Businesses', 
    'Manufacturing', 
    'Financial Services'
  ];
  
  const industry = industries[index % industries.length];
  const baseRevenue = 250000 + (index * 50000);
  const baseEbitda = baseRevenue * (0.15 + (index % 5) * 0.03);
  
  return {
    businessName: `Sample Business ${index}`,
    industry,
    location: `City ${index % 10}`,
    description: `This is a sample ${industry.toLowerCase()} business for testing purposes.`,
    yearsInOperation: 3 + (index % 15),
    revenue: baseRevenue,
    ebitda: baseEbitda,
    growthRate: 5 + (index % 20),
    cashOnCash: 15 + (index % 25),
    ffeValue: baseRevenue * 0.1,
    totalDebtAmount: baseRevenue * 0.25
  };
}

// Generate sample valuation data
function generateValuationData(businessData) {
  const multiplier = 
    businessData.industry === 'Online & Technology' ? 3.5 :
    businessData.industry === 'Financial Services' ? 2.8 :
    businessData.industry === 'Retail' ? 2.0 :
    2.5;
  
  const baseValue = businessData.ebitda > 0 ? businessData.ebitda : businessData.revenue * 0.2;
  const estimatedValue = Math.round(baseValue * multiplier);
  
  return {
    estimatedValue,
    valuationRange: {
      min: Math.round(estimatedValue * 0.8),
      max: Math.round(estimatedValue * 1.2)
    },
    confidence: 75 + (businessData.yearsInOperation > 5 ? 10 : 0),
    multiple: multiplier,
    multipleType: businessData.ebitda > 0 ? 'ebitda' : 'revenue',
    summary: `Based on ${businessData.industry} industry standards with a ${multiplier}x multiple.`,
    factors: {
      growth: {
        impact: businessData.growthRate > 10 ? 10 : businessData.growthRate / 2,
        analysis: `Growth rate of ${businessData.growthRate}% impacts valuation positively.`
      },
      industry: {
        impact: businessData.industry === 'Online & Technology' ? 15 : 5,
        analysis: `${businessData.industry} businesses typically command ${businessData.industry === 'Online & Technology' ? 'higher' : 'standard'} multiples.`
      }
    }
  };
}

async function insertTestData(count = 5) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log(`Inserting ${count} test records...`);
    const insertedRecords = [];
    
    // First, check if business_id column and confidence column are required in business_valuations
    const columnCheck = await client.query(`
      SELECT column_name, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'business_valuations' 
      AND column_name IN ('business_id', 'confidence')
    `);
    
    // Create a map of column constraints
    const columnConstraints = {};
    columnCheck.rows.forEach(row => {
      columnConstraints[row.column_name] = row.is_nullable === 'YES';
    });
    
    const businessIdRequired = columnConstraints['business_id'] === false;
    const confidenceRequired = columnConstraints['confidence'] === false;
    
    if (businessIdRequired || confidenceRequired) {
      console.warn('Warning: Some columns in business_valuations have NOT NULL constraints:');
      if (businessIdRequired) console.warn('- business_id requires a value');
      if (confidenceRequired) console.warn('- confidence requires a value');
      console.warn('Consider running: node db/migrations/fix_business_valuations.js');
    }
    
    for (let i = 1; i <= count; i++) {
      // Generate a unique submission ID and email
      const submissionId = `sample_${Date.now()}_${i}_${uuidv4().substring(0, 6)}`;
      const email = `sample_user_${i}@example.com`;
      
      // Generate business and valuation data
      const businessData = generateBusinessData(i);
      const valuationData = generateValuationData(businessData);
      
      // Insert into questionnaire_submissions
      const submissionQuery = `
        INSERT INTO questionnaire_submissions (
          submission_id,
          email,
          business_name,
          industry,
          location,
          description,
          years_in_operation,
          revenue,
          ebitda,
          cash_on_cash,
          ffe_value,
          growth_rate,
          total_debt_amount,
          valuation_min,
          valuation_max,
          adjusted_valuation,
          data,
          valuation_data,
          status,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
          NOW() - INTERVAL '${i} days',  -- Stagger creation dates
          NOW() - INTERVAL '${i} days'
        )
        RETURNING id, submission_id
      `;
      
      const submissionValues = [
        submissionId,
        email,
        businessData.businessName,
        businessData.industry,
        businessData.location,
        businessData.description,
        businessData.yearsInOperation,
        businessData.revenue,
        businessData.ebitda,
        businessData.cashOnCash,
        businessData.ffeValue,
        businessData.growthRate,
        businessData.totalDebtAmount,
        valuationData.valuationRange.min,
        valuationData.valuationRange.max,
        valuationData.estimatedValue,
        JSON.stringify(businessData),
        JSON.stringify(valuationData),
        'sample'
      ];
      
      try {
        const submissionResult = await client.query(submissionQuery, submissionValues);
        
        // Skip business_valuations insert if business_id is required since we don't have business IDs
        if (!businessIdRequired) {
          // Insert into business_valuations
          const valuationQuery = `
            INSERT INTO business_valuations (
              submission_id,
              email,
              valuation_min,
              valuation_max,
              estimated_value,
              ${confidenceRequired ? 'confidence,' : ''}
              ${businessIdRequired ? 'business_id,' : ''}
              multiple,
              multiple_type,
              summary,
              valuation_data,
              created_at,
              updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, 
              ${confidenceRequired ? '$6,' : ''}
              ${businessIdRequired ? `${confidenceRequired ? '$7' : '$6'},` : ''}
              ${businessIdRequired || confidenceRequired ? `$${businessIdRequired && confidenceRequired ? '8' : '7'},` : '$6,'}
              ${businessIdRequired || confidenceRequired ? `$${businessIdRequired && confidenceRequired ? '9' : '8'},` : '$7,'}
              ${businessIdRequired || confidenceRequired ? `$${businessIdRequired && confidenceRequired ? '10' : '9'},` : '$8,'}
              ${businessIdRequired || confidenceRequired ? `$${businessIdRequired && confidenceRequired ? '11' : '10'},` : '$9,'}
              NOW() - INTERVAL '${i} days',
              NOW() - INTERVAL '${i} days'
            )
            RETURNING id
          `;
          
          // Building values array based on column requirements
          const baseValues = [
            submissionId,
            email,
            valuationData.valuationRange.min,
            valuationData.valuationRange.max,
            valuationData.estimatedValue
          ];
          
          // Add optional values based on constraints
          if (confidenceRequired) {
            baseValues.push(valuationData.confidence || 80); // Default confidence 80%
          }
          
          if (businessIdRequired) {
            baseValues.push(null); // This will fail, but we need to try
          }
          
          // Add remaining values
          baseValues.push(
            valuationData.multiple,
            valuationData.multipleType,
            valuationData.summary,
            JSON.stringify(valuationData)
          );
          
          const valuationResult = await client.query(valuationQuery, baseValues);
          
          insertedRecords.push({
            submission_id: submissionResult.rows[0].submission_id,
            questionnaire_id: submissionResult.rows[0].id,
            valuation_id: valuationResult.rows[0].id,
            email
          });
          
          console.log(`✅ Inserted record ${i}/${count}: ${submissionId}`);
        } else {
          insertedRecords.push({
            submission_id: submissionResult.rows[0].submission_id,
            questionnaire_id: submissionResult.rows[0].id,
            valuation_id: null, // Couldn't insert
            email
          });
          
          console.log(`✅ Inserted questionnaire ${i}/${count}: ${submissionId} (valuation skipped)`);
        }
      } catch (error) {
        console.error(`Error inserting record ${i}:`, error.message);
      }
    }
    
    await client.query('COMMIT');
    
    console.log('\nSuccessfully inserted test data:');
    console.table(insertedRecords);
    
    // Verify counts
    const questCount = await client.query('SELECT COUNT(*) FROM questionnaire_submissions WHERE status = $1', ['sample']);
    const valCount = await client.query('SELECT COUNT(*) FROM business_valuations WHERE submission_id LIKE $1', ['sample_%']);
    
    console.log(`\nVerification counts:
- questionnaire_submissions (sample): ${questCount.rows[0].count}
- business_valuations (sample): ${valCount.rows[0].count}
`);
    
    return insertedRecords;
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error inserting test data:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Execute if run directly
if (import.meta.url === new URL(import.meta.url).href) {
  // Get count from command line arg, default to 5
  const count = parseInt(process.argv[2]) || 5;
  
  insertTestData(count)
    .then(() => {
      console.log('Test data insertion complete');
      process.exit(0);
    })
    .catch(err => {
      console.error('Test data insertion failed:', err);
      process.exit(1);
    });
}

export default insertTestData;

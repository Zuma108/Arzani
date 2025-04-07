import express from 'express';
import pool from '../../db.js';

const router = express.Router();

// Endpoint to check database connection and table status
router.get('/db-status', async (req, res) => {
  const client = await pool.connect();
  
  try {
    // Get table stats
    const tableQuery = `
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count,
        CASE 
          WHEN table_name = 'questionnaire_submissions' THEN (SELECT COUNT(*) FROM questionnaire_submissions)
          WHEN table_name = 'business_valuations' THEN (SELECT COUNT(*) FROM business_valuations)
          ELSE 0
        END as row_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      AND table_name IN ('questionnaire_submissions', 'business_valuations')
    `;
    
    const tableStats = await client.query(tableQuery);
    
    // Check latest records
    const latestSubmissions = await client.query(`
      SELECT id, submission_id, email, created_at 
      FROM questionnaire_submissions 
      ORDER BY created_at DESC LIMIT 5
    `);
    
    const latestValuations = await client.query(`
      SELECT id, submission_id, email, created_at 
      FROM business_valuations 
      ORDER BY created_at DESC LIMIT 5
    `);
    
    // Check database version and connection info
    const dbInfo = await client.query(`
      SELECT current_database() as db_name, 
             current_user as username,
             version() as version
    `);
    
    res.json({
      success: true,
      connection: {
        database: dbInfo.rows[0].db_name,
        user: dbInfo.rows[0].username,
        version: dbInfo.rows[0].version,
        timestamp: new Date().toISOString()
      },
      tables: tableStats.rows,
      recent_submissions: latestSubmissions.rows,
      recent_valuations: latestValuations.rows
    });
  } catch (error) {
    console.error('Error in db-status endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  } finally {
    client.release();
  }
});

// Endpoint to trigger a test submission with random data
router.post('/test-submission', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Generate test data
    const submissionId = `test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const email = req.body.email || `test_${Date.now()}@example.com`;
    const industry = req.body.industry || 'Test Industry';
    const revenue = req.body.revenue || 100000 + Math.floor(Math.random() * 900000);
    const ebitda = req.body.ebitda || revenue * 0.2;
    
    // Insert questionnaire submission
    const submissionQuery = `
      INSERT INTO questionnaire_submissions (
        submission_id, email, business_name, industry, revenue, ebitda,
        data, status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, 
        $7, 'test', NOW(), NOW()
      ) RETURNING id, submission_id, created_at
    `;
    
    const submissionValues = [
      submissionId,
      email,
      `Test Business ${Date.now()}`,
      industry,
      revenue,
      ebitda,
      JSON.stringify({
        source: 'debug-api',
        timestamp: Date.now(),
        userAgent: req.headers['user-agent'],
        ip: req.ip
      })
    ];
    
    const submissionResult = await client.query(submissionQuery, submissionValues);
    
    // Insert valuation
    const valuationQuery = `
      INSERT INTO business_valuations (
        submission_id, email, valuation_min, valuation_max, estimated_value,
        valuation_data, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, NOW(), NOW()
      ) RETURNING id, created_at
    `;
    
    const estimatedValue = Math.round(ebitda * 3.5);
    
    const valuationValues = [
      submissionId,
      email,
      Math.round(estimatedValue * 0.8),
      Math.round(estimatedValue * 1.2),
      estimatedValue,
      JSON.stringify({
        source: 'debug-api',
        timestamp: Date.now(),
        estimatedValue,
        multiple: 3.5
      })
    ];
    
    const valuationResult = await client.query(valuationQuery, valuationValues);
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Test data inserted successfully',
      submission: submissionResult.rows[0],
      valuation: valuationResult.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in test-submission endpoint:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  } finally {
    client.release();
  }
});

export default router;

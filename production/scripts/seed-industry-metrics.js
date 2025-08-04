import pool from '../db.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Script to ensure industry_metrics table exists and contains baseline data
 */
async function ensureIndustryMetricsTable() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'industry_metrics'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('Creating industry_metrics table...');
      
      await client.query(`
        CREATE TABLE industry_metrics (
          id SERIAL PRIMARY KEY,
          industry VARCHAR(255) UNIQUE NOT NULL,
          avg_sales_multiple DECIMAL(10,2),
          avg_ebitda_multiple DECIMAL(10,2),
          avg_cash_flow DECIMAL(14,2),
          avg_profit_margin DECIMAL(10,2),
          business_count INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }
    
    // Seed baseline industry data
    console.log('Seeding industry metrics data...');
    
    // Define baseline industry metrics
    const baselineMetrics = [
      {
        industry: 'Retail',
        avg_sales_multiple: 0.6,
        avg_ebitda_multiple: 4.0,
        avg_profit_margin: 15.0,
        business_count: 120
      },
      {
        industry: 'Food & Beverage',
        avg_sales_multiple: 0.7,
        avg_ebitda_multiple: 3.5,
        avg_profit_margin: 12.0,
        business_count: 85
      },
      {
        industry: 'Manufacturing',
        avg_sales_multiple: 0.8,
        avg_ebitda_multiple: 4.2,
        avg_profit_margin: 18.0,
        business_count: 65
      },
      {
        industry: 'Technology',
        avg_sales_multiple: 2.5,
        avg_ebitda_multiple: 6.0,
        avg_profit_margin: 25.0,
        business_count: 95
      },
      {
        industry: 'Transportation & Storage',
        avg_sales_multiple: 0.9,
        avg_ebitda_multiple: 3.8,
        avg_profit_margin: 14.0,
        business_count: 40
      },
      {
        industry: 'Professional Services',
        avg_sales_multiple: 1.2,
        avg_ebitda_multiple: 4.5,
        avg_profit_margin: 22.0,
        business_count: 110
      },
      {
        industry: 'Healthcare',
        avg_sales_multiple: 1.3,
        avg_ebitda_multiple: 5.0,
        avg_profit_margin: 20.0,
        business_count: 75
      },
      {
        industry: 'Construction',
        avg_sales_multiple: 0.7,
        avg_ebitda_multiple: 3.2,
        avg_profit_margin: 12.0,
        business_count: 55
      },
      {
        industry: 'Real Estate',
        avg_sales_multiple: 2.0,
        avg_ebitda_multiple: 7.0,
        avg_profit_margin: 30.0,
        business_count: 45
      },
      {
        industry: 'Other',
        avg_sales_multiple: 0.8,
        avg_ebitda_multiple: 3.5,
        avg_profit_margin: 15.0,
        business_count: 150
      }
    ];
    
    // Insert data with ON CONFLICT DO UPDATE
    for (const metric of baselineMetrics) {
      await client.query(`
        INSERT INTO industry_metrics 
        (industry, avg_sales_multiple, avg_ebitda_multiple, avg_profit_margin, business_count)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (industry) 
        DO NOTHING
      `, [
        metric.industry,
        metric.avg_sales_multiple,
        metric.avg_ebitda_multiple,
        metric.avg_profit_margin,
        metric.business_count
      ]);
    }
    
    await client.query('COMMIT');
    console.log('Industry metrics table and data setup complete');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error setting up industry metrics:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the function if this script is executed directly
if (process.argv[1].includes('seed-industry-metrics.js')) {
  ensureIndustryMetricsTable()
    .then(() => {
      console.log('Industry metrics seeding completed successfully');
      process.exit(0);
    })
    .catch(err => {
      console.error('Error in industry metrics seeding:', err);
      process.exit(1);
    });
}

export default ensureIndustryMetricsTable;

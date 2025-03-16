import { diagnoseAndFixMarketTrends, checkBusinessesTable, inspectView } from './utils/fixMarketTrends.js';
import pool from './db.js';

console.log('Running advanced market trends fix utility...');

(async () => {
  try {
    // First check database connection
    console.log('Verifying database connection...');
    const dbTest = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('Database connection verified');
    console.log('PostgreSQL version:', dbTest.rows[0].pg_version);
    
    // Check businesses table content - add this test
    console.log('Testing calculation on businesses table directly...');
    try {
      const calcTest = await pool.query(`
        SELECT 
          AVG(price::numeric) as test_avg_price,
          AVG(CASE WHEN gross_revenue <> 0 THEN ebitda::numeric / gross_revenue::numeric ELSE NULL END) as test_avg_multiple
        FROM businesses 
        WHERE price IS NOT NULL
        LIMIT 10
      `);
      console.log('Direct calculation test result:', calcTest.rows[0]);
    } catch (calcError) {
      console.error('Error performing direct calculation test:', calcError);
    }
    
    console.log('Checking businesses table structure...');
    const businessesCheck = await checkBusinessesTable();
    console.log(businessesCheck);
    
    if (!businessesCheck.success) {
      console.error('Cannot proceed: Businesses table issues must be fixed first');
      process.exit(1);
    }
    
    // Alternative - explicitly recreate view
    console.log('ATTEMPTING EXPLICIT VIEW RECREATION WITH DIRECT SQL...');
    try {
      await pool.query(`DROP MATERIALIZED VIEW IF EXISTS market_trends_mv;`);
      
      // Use much simpler SQL to just get it working first
      await pool.query(`
        CREATE MATERIALIZED VIEW market_trends_mv AS 
        SELECT 
          date_listed,
          industry,
          location,
          AVG(price::numeric) as avg_price,
          COUNT(*) as listings_count
        FROM businesses
        WHERE price IS NOT NULL
        GROUP BY date_listed, industry, location
        ORDER BY date_listed DESC;
      `);
      
      // Check if it worked
      const colCheck = await pool.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'market_trends_mv';
      `);
      
      console.log('Manual creation result - columns:', colCheck.rows);
    } catch (manualError) {
      console.error('Manual creation error:', manualError);
    }
    
    // Run the full diagnostic and repair process
    console.log('Running market trends diagnostics and fixes...');
    const result = await diagnoseAndFixMarketTrends();
    console.log('Diagnostics complete');
    console.log(result);
    
    process.exit(0);
  } catch (error) {
    console.error('Error fixing market trends:', error);
    process.exit(1);
  }
})();

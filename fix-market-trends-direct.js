import pool from './db.js';

console.log('Running direct fix for market trends view...');

(async () => {
  try {
    console.log('Checking database connection...');
    await pool.query('SELECT NOW()');
    console.log('Database connected');
    
    // First check if the businesses table has records
    const businessCheck = await pool.query(`SELECT COUNT(*) FROM businesses WHERE price IS NOT NULL`);
    console.log(`Found ${businessCheck.rows[0].count} businesses with non-NULL price`);
    
    if (parseInt(businessCheck.rows[0].count) === 0) {
      throw new Error('No valid business data available for market trends');
    }
    
    console.log('Dropping existing view if it exists...');
    await pool.query('DROP MATERIALIZED VIEW IF EXISTS market_trends_mv');
    
    // Create the materialized view directly from the businesses table
    // Don't use temporary tables since PostgreSQL doesn't allow creating materialized views from them
    console.log('Creating materialized view directly from businesses table...');
    await pool.query(`
      CREATE MATERIALIZED VIEW market_trends_mv AS
      SELECT 
        date_listed,
        industry,
        location,
        AVG(price::numeric) as avg_price,
        AVG(CASE WHEN gross_revenue <> 0 THEN ebitda::numeric / gross_revenue::numeric ELSE NULL END) as avg_multiple,
        AVG(gross_revenue::numeric) as avg_gross_revenue,
        AVG(ebitda::numeric) as avg_ebitda,
        COUNT(*)::integer as listings_count
      FROM businesses
      WHERE price IS NOT NULL
      GROUP BY date_listed, industry, location
      ORDER BY date_listed DESC;
    `);
    
    // Verify the view was created with direct query
    console.log('Verifying view with direct query...');
    try {
      const dataCheck = await pool.query(`SELECT * FROM market_trends_mv LIMIT 5`);
      console.log(`Direct query successful, found ${dataCheck.rows.length} rows`);
      if (dataCheck.rows.length > 0) {
        console.log('Sample data:', dataCheck.rows[0]);
      }
    } catch (error) {
      console.error('Error querying the view:', error.message);
    }
    
    // Check column structure using pg_catalog tables
    console.log('Checking view structure with pg_catalog...');
    const catalogCheck = await pool.query(`
      SELECT attname, format_type(atttypid, atttypmod) AS data_type
      FROM pg_catalog.pg_attribute
      WHERE attrelid = 'market_trends_mv'::regclass
      AND attnum > 0 
      AND NOT attisdropped
      ORDER BY attnum;
    `);
    
    console.log(`Found ${catalogCheck.rows.length} columns in the view:`, catalogCheck.rows);
    
    // Create indices for better performance
    console.log('Creating indices on the view...');
    await pool.query(`CREATE INDEX IF NOT EXISTS market_trends_mv_date_idx ON market_trends_mv(date_listed)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS market_trends_mv_industry_idx ON market_trends_mv(industry)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS market_trends_mv_location_idx ON market_trends_mv(location)`);
    
    // Final check - attempt to query with filters
    try {
      const testQuery = await pool.query(`
        SELECT * FROM market_trends_mv 
        WHERE date_listed >= NOW() - INTERVAL '30 days'
        LIMIT 5
      `);
      console.log(`Test query successful, found ${testQuery.rows.length} rows`);
    } catch (error) {
      console.error('Test query error:', error.message);
    }
    
    console.log('Fix completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error applying fix:', error);
    process.exit(1);
  }
})();

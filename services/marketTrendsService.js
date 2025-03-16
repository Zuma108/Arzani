import pool from '../db.js';

export async function refreshMarketTrends() {
  try {
    // Check if the unique index exists before attempting concurrent refresh
    const indexCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM pg_indexes WHERE indexname = 'market_trends_mv_unique_idx'
      );
    `);
    
    // First, check if the materialized view exists and has the proper structure
    await ensureMarketTrendsViewStructure();
    
    if (indexCheck.rows[0].exists) {
      // Use concurrent refresh since unique index exists
      await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY market_trends_mv');
    } else {
      // Fallback to non-concurrent refresh
      await pool.query('REFRESH MATERIALIZED VIEW market_trends_mv');
      console.warn('Warning: Using non-concurrent refresh for market_trends_mv. Performance may be affected.');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error refreshing market trends:', error);
    throw new Error('Failed to refresh market trends data');
  }
}

/**
 * Ensures the market_trends_mv materialized view exists with the proper structure
 * including a date column for filtering
 */
export async function ensureMarketTrendsViewStructure() {
  try {
    // First check if the materialized view exists
    const viewCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM pg_matviews WHERE matviewname = 'market_trends_mv'
      );
    `);
    
    if (!viewCheck.rows[0].exists) {
      console.log('Creating market_trends_mv materialized view with required structure');
      
      // Create the materialized view directly from businesses table
      // Don't use temporary tables - they don't work with materialized views
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
      
      // Add indices after creating the view
      await pool.query(`
        CREATE INDEX market_trends_mv_date_idx ON market_trends_mv(date_listed);
        CREATE INDEX market_trends_mv_industry_idx ON market_trends_mv(industry);
        CREATE INDEX market_trends_mv_location_idx ON market_trends_mv(location);
      `);
      
      console.log('Successfully created market_trends_mv with indices');
      return true;
    }
    
    // Verify the view has columns by querying it directly
    try {
      await pool.query('SELECT * FROM market_trends_mv LIMIT 1');
    } catch (error) {
      console.error('View exists but cannot be queried:', error.message);
      console.log('Recreating market_trends_mv');
      
      // Drop and recreate the view
      await pool.query('DROP MATERIALIZED VIEW market_trends_mv');
      await createMarketTrendsView();
    }
    
    return true;
  } catch (error) {
    console.error('Error ensuring market trends view structure:', error);
    throw new Error('Failed to configure market trends materialized view: ' + error.message);
  }
}

/**
 * Creates the materialized view directly from the businesses table
 * This approach avoids using temporary tables which aren't supported for materialized views
 */
async function createMarketTrendsView() {
  try {
    // Create materialized view directly from businesses table
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
    
    // Add indices
    await pool.query(`
      CREATE INDEX market_trends_mv_date_idx ON market_trends_mv(date_listed);
      CREATE INDEX market_trends_mv_industry_idx ON market_trends_mv(industry);
      CREATE INDEX market_trends_mv_location_idx ON market_trends_mv(location);
    `);
    
    return true;
  } catch (error) {
    console.error('Error creating materialized view:', error);
    throw error;
  }
}

/**
 * Initializes the market trends materialized view
 * This should be called during application startup
 */
export async function initializeMarketTrends() {
  try {
    // Check if businesses table exists and has the necessary columns
    const businessesCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables WHERE table_name = 'businesses'
      );
    `);
    
    if (!businessesCheck.rows[0].exists) {
      console.warn('Businesses table does not exist yet - will defer market trends initialization');
      return { success: false, error: 'Businesses table does not exist yet' };
    }
    
    console.log('Ensuring market trends view structure...');
    await ensureMarketTrendsViewStructure();
    
    console.log('Refreshing market trends data...');
    await refreshMarketTrends();
    
    console.log('Market trends initialization complete');
    return { success: true };
  } catch (error) {
    console.error('Error initializing market trends:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Verifies the market trends structure and returns structure information
 * Useful for API diagnostic endpoints
 */
export async function getMarketTrendsStructure() {
  try {
    // Check if view exists
    const viewCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM pg_matviews WHERE matviewname = 'market_trends_mv'
      );
    `);
    
    const exists = viewCheck.rows[0].exists;
    
    if (!exists) {
      return {
        exists: false,
        columns: []
      };
    }
    
    // Get column information
    const columnsQuery = `
      SELECT column_name, data_type, ordinal_position
      FROM information_schema.columns 
      WHERE table_name = 'market_trends_mv'
      ORDER BY ordinal_position;
    `;
    
    const columns = await pool.query(columnsQuery);
    
    // Get row count
    const countQuery = `SELECT COUNT(*) FROM market_trends_mv;`;
    const count = await pool.query(countQuery);
    
    return {
      exists: true,
      columns: columns.rows,
      rowCount: parseInt(count.rows[0].count)
    };
  } catch (error) {
    console.error('Error getting market trends structure:', error);
    return {
      exists: false,
      error: error.message
    };
  }
}
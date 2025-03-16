import pool from '../db.js';

/**
 * Diagnoses and fixes issues with the market_trends_mv materialized view
 */
export async function diagnoseAndFixMarketTrends() {
  console.log('Starting market trends diagnostic...');
  
  try {
    // Step 1: Check if the materialized view exists
    console.log('Checking if materialized view exists...');
    const viewExistsQuery = `
      SELECT EXISTS (
        SELECT FROM pg_matviews WHERE matviewname = 'market_trends_mv'
      );
    `;
    const viewExists = await pool.query(viewExistsQuery);
    
    if (!viewExists.rows[0].exists) {
      console.log('market_trends_mv does not exist - creating it now');
      await createMarketTrendsView();
    } else {
      console.log('market_trends_mv exists - checking structure');
      
      // Step 2: Check the column structure
      const columnsQuery = `
        SELECT column_name, data_type
        FROM information_schema.columns 
        WHERE table_name = 'market_trends_mv'
        ORDER BY ordinal_position;
      `;
      const columns = await pool.query(columnsQuery);
      
      console.log('Current columns:', columns.rows);
      
      // Add column count for diagnostics
      console.log(`Found ${columns.rows.length} columns in market_trends_mv`);
      
      // Check if date_listed column exists
      const hasDateColumn = columns.rows.some(col => col.column_name === 'date_listed');
      
      // If no columns or missing date column, recreate view
      if (columns.rows.length === 0 || !hasDateColumn) {
        console.log('Missing columns or required date_listed column - recreating view');
        await recreateMarketTrendsView();
      } else {
        console.log('View structure appears correct');
        
        // Step 3: Check if there are any rows
        const countQuery = `SELECT COUNT(*) FROM market_trends_mv;`;
        const countResult = await pool.query(countQuery);
        
        if (parseInt(countResult.rows[0].count) === 0) {
          console.log('View exists but is empty - refreshing data');
          await refreshView();
        } else {
          console.log(`View contains ${countResult.rows[0].count} rows`);
        }
      }
    }
    
    // Final verification check
    const verificationCheck = await verifyMarketTrendsView();
    
    // Return success with current state
    return verificationCheck;
    
  } catch (error) {
    console.error('Error during market trends diagnosis:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * Verify the market trends view structure is correct
 */
async function verifyMarketTrendsView() {
  try {
    console.log('Verifying market trends view structure...');
    
    // Check if view exists
    const viewCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM pg_matviews WHERE matviewname = 'market_trends_mv'
      );
    `);
    
    if (!viewCheck.rows[0].exists) {
      console.log('Verification failed: View does not exist');
      return {
        success: false,
        message: 'View does not exist'
      };
    }
    
    // Direct query to check data in the view
    try {
      console.log('Attempting to query data from the view...');
      const dataCheck = await pool.query(`SELECT * FROM market_trends_mv LIMIT 5;`);
      console.log(`Query returned ${dataCheck.rows.length} rows from view`);
      
      if (dataCheck.rows.length > 0) {
        console.log('Sample row from view:', dataCheck.rows[0]);
      }
    } catch (queryErr) {
      console.error('Error querying view data:', queryErr);
    }
    
    // Get column information using a more direct approach
    const columnsQuery = `
      SELECT a.attname as column_name, 
             pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type
      FROM pg_attribute a
      JOIN pg_class c ON a.attrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE c.relname = 'market_trends_mv'
        AND a.attnum > 0 
        AND NOT a.attisdropped
      ORDER BY a.attnum;
    `;
    
    const columns = await pool.query(columnsQuery);
    console.log('Final structure verification using pg_attribute:', columns.rows);
    
    if (columns.rows.length === 0) {
      console.log('Verification failed: View exists but has no columns');
      return {
        success: false,
        message: 'View exists but has no columns',
        structure: []
      };
    }
    
    // Verify date_listed column exists
    const hasDateColumn = columns.rows.some(col => col.column_name === 'date_listed');
    if (!hasDateColumn) {
      console.log('Verification failed: Missing required date_listed column');
      return {
        success: false,
        message: 'Missing required date_listed column',
        structure: columns.rows
      };
    }
    
    // Get row count
    let rowCount = 0;
    try {
      const countQuery = `SELECT COUNT(*) FROM market_trends_mv;`;
      const count = await pool.query(countQuery);
      rowCount = parseInt(count.rows[0].count);
    } catch (countErr) {
      console.error('Error counting rows:', countErr);
    }
    
    return {
      success: true,
      message: 'Market trends view verification complete',
      structure: columns.rows,
      rowCount: rowCount,
      hasDateColumn: hasDateColumn
    };
  } catch (error) {
    console.error('Verification error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Creates the market trends materialized view
 */
async function createMarketTrendsView() {
  try {
    console.log('Attempting to create market_trends_mv materialized view...');
    
    // First, check the businesses table structure
    const businessCheck = await checkBusinessesTable();
    if (!businessCheck.success) {
      console.error('Cannot create view:', businessCheck.message);
      throw new Error(businessCheck.message);
    }
    
    // Double check the businesses table has records with proper data types
    const sampleRow = await pool.query(`
      SELECT date_listed::text, price::numeric, industry::text, location::text, 
             ebitda::numeric, gross_revenue::numeric
      FROM businesses 
      WHERE price IS NOT NULL 
      LIMIT 1
    `);
    
    if (sampleRow.rows.length === 0) {
      console.warn('Warning: No valid business records found for the materialized view');
    } else {
      console.log('Sample data found:', sampleRow.rows[0]);
    }
    
    // Use a simpler query first to see if it works - avoid complex expressions
    console.log('Attempting to create view with simplified query first...');
    
    // Drop the view if it exists (clean slate)
    await pool.query(`DROP MATERIALIZED VIEW IF EXISTS market_trends_mv;`);
    
    // CRUCIAL CHANGE: Use simple column aliases and explicit type casting
    const createViewQuery = `
      CREATE MATERIALIZED VIEW market_trends_mv AS 
      SELECT 
        date_listed,
        industry::text,
        location::text,
        CAST(AVG(price::numeric) AS numeric) as avg_price,
        CAST(AVG(CASE WHEN gross_revenue <> 0 THEN ebitda::numeric / gross_revenue::numeric ELSE NULL END) AS numeric) as avg_multiple,
        CAST(AVG(gross_revenue::numeric) AS numeric) as avg_gross_revenue,
        CAST(AVG(ebitda::numeric) AS numeric) as avg_ebitda,
        COUNT(*)::integer as listings_count
      FROM businesses
      WHERE price IS NOT NULL
      GROUP BY date_listed, industry, location
      ORDER BY date_listed DESC;
    `;
    
    console.log('Using SQL:');
    console.log(createViewQuery);
    
    console.log('Executing create view query...');
    await pool.query(createViewQuery);
    console.log('View creation query executed successfully');
    
    // Verify view was created properly before trying indices
    console.log('Checking if view was created with proper structure...');
    const checkColumns = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'market_trends_mv'
      ORDER BY ordinal_position;
    `);
    
    console.log(`View created with ${checkColumns.rows.length} columns:`, checkColumns.rows);
    
    if (checkColumns.rows.length === 0) {
      throw new Error('View was created but has no columns. This indicates a PostgreSQL issue.');
    }
    
    // Now safely add indices since we know view has columns
    console.log('Creating indices...');
    await pool.query(`CREATE INDEX market_trends_mv_date_idx ON market_trends_mv(date_listed);`);
    await pool.query(`CREATE INDEX market_trends_mv_industry_idx ON market_trends_mv(industry);`);
    await pool.query(`CREATE INDEX market_trends_mv_location_idx ON market_trends_mv(location);`);
    console.log('Indices created successfully');
    
    // Verify the view was created successfully and has columns
    const verifyResult = await verifyMarketTrendsView();
    if (!verifyResult.success) {
      console.error('View was created but verification failed:', verifyResult.message);
      throw new Error(`View creation complete but verification failed: ${verifyResult.message}`);
    }
    
    console.log('Successfully created and verified market_trends_mv');
    return true;
  } catch (error) {
    console.error('Error creating market trends view:', error);
    
    // Additional debugging for SQL errors
    if (error.code) {
      console.error('SQL Error Code:', error.code);
      console.error('SQL Error Detail:', error.detail);
      console.error('SQL Error Hint:', error.hint);
    }
    
    throw error;
  }
}

/**
 * Recreates the market trends materialized view
 */
async function recreateMarketTrendsView() {
  try {
    // First drop the existing view
    console.log('Dropping existing market_trends_mv materialized view...');
    await pool.query(`DROP MATERIALIZED VIEW IF EXISTS market_trends_mv;`);
    console.log('Drop completed successfully');
    
    // Then recreate it
    const result = await createMarketTrendsView();
    console.log('Successfully recreated market_trends_mv with correct structure');
    return result;
  } catch (error) {
    console.error('Error recreating market trends view:', error);
    throw error;
  }
}

/**
 * Refreshes the materialized view data
 */
async function refreshView() {
  try {
    console.log('Refreshing market_trends_mv data...');
    await pool.query(`REFRESH MATERIALIZED VIEW market_trends_mv;`);
    console.log('Refresh complete');
    return true;
  } catch (error) {
    console.error('Error refreshing market trends view:', error);
    throw error;
  }
}

// Add a function to explicitly check the data in the businesses table
export async function checkBusinessesTable() {
  try {
    console.log('Checking businesses table...');
    
    // First check connection
    await pool.query('SELECT NOW()');
    console.log('Database connected');
    
    // Get row count
    const countQuery = `SELECT COUNT(*) FROM businesses;`;
    const countResult = await pool.query(countQuery);
    
    console.log(`Businesses table contains ${countResult.rows[0].count} rows`);
    
    // Check columns needed for market trends
    const columnsQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'businesses'
      AND column_name IN ('date_listed', 'price', 'industry', 'location', 'ebitda', 'gross_revenue')
      ORDER BY ordinal_position;
    `;
    const columns = await pool.query(columnsQuery);
    
    console.log('Required columns in businesses table:', columns.rows);
    
    // Check if any missing
    const requiredColumns = ['date_listed', 'price', 'industry', 'location', 'ebitda', 'gross_revenue'];
    const missingColumns = requiredColumns.filter(col => 
      !columns.rows.some(row => row.column_name === col)
    );
    
    if (missingColumns.length > 0) {
      console.warn('Warning: Missing columns in businesses table:', missingColumns);
      return {
        success: false,
        message: 'Missing required columns in businesses table',
        missingColumns
      };
    }
    
    // Check for null date_listed values which can cause issues
    const nullDateCheck = await pool.query(`
      SELECT COUNT(*) FROM businesses WHERE date_listed IS NULL
    `);
    
    if (parseInt(nullDateCheck.rows[0].count) > 0) {
      console.warn(`Warning: Found ${nullDateCheck.rows[0].count} rows with NULL date_listed`);
    }
    
    return {
      success: true,
      message: 'Businesses table appears to have all required columns',
      rowCount: countResult.rows[0].count
    };
    
  } catch (error) {
    console.error('Error checking businesses table:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Add direct view inspection function for debugging
export async function inspectView() {
  try {
    console.log('Inspecting materialized view definition...');
    
    // Get the view definition
    const definitionQuery = `
      SELECT pg_get_viewdef('market_trends_mv'::regclass, true) AS view_definition;
    `;
    
    const definition = await pool.query(definitionQuery);
    console.log('View definition:', definition.rows[0]?.view_definition || 'Not found');
    
    return {
      success: true,
      definition: definition.rows[0]?.view_definition
    };
  } catch (error) {
    console.error('Error inspecting view:', error);
    return { success: false, error: error.message };
  }
}

// If this file is run directly (not imported)
if (process.argv[1].endsWith('fixMarketTrends.js')) {
  (async () => {
    console.log('Running market trends diagnostics tool...');
    
    try {
      const businessesCheck = await checkBusinessesTable();
      console.log('Businesses table check result:', businessesCheck);
      
      // Debug: Attempt to recreate the view directly
      console.log('Forcing recreation of market trends view...');
      await recreateMarketTrendsView();
      
      // Inspect the view definition
      await inspectView();
      
      // Final verification
      const verification = await verifyMarketTrendsView();
      console.log('Final verification result:', verification);
      
      process.exit(0);
    } catch (error) {
      console.error('Fatal error during diagnostics:', error);
      process.exit(1);
    }
  })();
}

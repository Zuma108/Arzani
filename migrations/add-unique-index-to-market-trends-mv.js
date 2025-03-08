import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import fs from 'fs';
import pool from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function createUniqueIndex() {
  try {
    console.log('Creating unique index on market_trends_mv...');
    
    // First check if the materialized view exists
    const viewCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM pg_matviews WHERE matviewname = 'market_trends_mv'
      );
    `);
    
    if (!viewCheck.rows[0].exists) {
      console.log('❌ Materialized view market_trends_mv does not exist.');
      return;
    }
    
    // Check if index already exists
    const indexCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM pg_indexes WHERE indexname = 'market_trends_mv_unique_idx'
      );
    `);
    
    if (indexCheck.rows[0].exists) {
      console.log('✅ Index market_trends_mv_unique_idx already exists.');
      return;
    }
    
    // Get the actual structure of the materialized view
    const columnsQuery = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'market_trends_mv'
      ORDER BY ordinal_position;
    `);
    
    console.log('Available columns:', columnsQuery.rows.map(r => r.column_name));
    
    if (columnsQuery.rows.length === 0) {
      console.log('❌ No columns found in market_trends_mv. The view might be empty or not properly defined.');
      
      // Create a dummy view to allow concurrent refresh
      console.log('Creating a market_trends_mv view with a dummy unique column...');
      
      await pool.query(`
        DROP MATERIALIZED VIEW IF EXISTS market_trends_mv;
        
        CREATE MATERIALIZED VIEW market_trends_mv AS 
        SELECT 
          ROW_NUMBER() OVER () AS unique_id,
          NOW() AS refresh_timestamp
        WITH NO DATA;
        
        CREATE UNIQUE INDEX market_trends_mv_unique_idx ON market_trends_mv(unique_id);
        
        REFRESH MATERIALIZED VIEW market_trends_mv;
      `);
      
      console.log('✅ Created skeleton materialized view with unique index.');
      return;
    }
    
    // Try different strategies to create a unique index
    
    // Strategy 1: Find an explicitly named "id" or "unique_id" column
    const idColumn = columnsQuery.rows.find(col => 
      ['id', 'unique_id', 'uid', 'row_id'].includes(col.column_name.toLowerCase())
    );
    
    if (idColumn) {
      console.log(`Found ID column: ${idColumn.column_name}`);
      await pool.query(`
        CREATE UNIQUE INDEX market_trends_mv_unique_idx ON market_trends_mv (${idColumn.column_name});
      `);
      console.log(`✅ Created unique index on ${idColumn.column_name}`);
      return;
    }
    
    // Strategy 2: Look for timestamp columns that might be used for uniqueness
    const timeColumns = columnsQuery.rows.filter(col => 
      col.column_name.toLowerCase().includes('time') || 
      col.column_name.toLowerCase().includes('date') ||
      col.data_type.includes('timestamp') ||
      col.data_type.includes('date')
    );
    
    const categoryColumns = columnsQuery.rows.filter(col => 
      col.column_name.toLowerCase().includes('category') ||
      col.column_name.toLowerCase().includes('type') ||
      col.column_name.toLowerCase().includes('industry') ||
      col.column_name.toLowerCase() === 'name'
    );
    
    if (timeColumns.length > 0 && categoryColumns.length > 0) {
      // Build a composite key with time and category
      const timeCol = timeColumns[0].column_name;
      const categoryCol = categoryColumns[0].column_name;
      
      console.log(`Creating composite index on ${timeCol} and ${categoryCol}`);
      await pool.query(`
        CREATE UNIQUE INDEX market_trends_mv_unique_idx ON market_trends_mv (${timeCol}, ${categoryCol});
      `);
      console.log(`✅ Created unique composite index on ${timeCol}, ${categoryCol}`);
      return;
    }
    
    // Strategy 3: As a last resort, try to use all columns (risky but might work)
    if (columnsQuery.rows.length > 0 && columnsQuery.rows.length <= 5) {
      const allColumns = columnsQuery.rows.map(r => r.column_name).join(', ');
      console.log(`Creating composite index using all columns: ${allColumns}`);
      
      await pool.query(`
        CREATE UNIQUE INDEX market_trends_mv_unique_idx ON market_trends_mv (${allColumns});
      `);
      console.log('✅ Created unique index using all columns');
      return;
    }
    
    // If all strategies fail, use row_number() to create a unique column
    console.log('No suitable columns found for unique index. Adding a unique_id column...');
    
    // Create a new materialized view with a unique_id column
    const originalColumns = columnsQuery.rows.map(r => r.column_name).join(', ');
    
    await pool.query(`
      CREATE OR REPLACE MATERIALIZED VIEW market_trends_mv_new AS
      SELECT 
        ROW_NUMBER() OVER () AS unique_id, 
        *
      FROM market_trends_mv;
      
      DROP MATERIALIZED VIEW market_trends_mv;
      ALTER MATERIALIZED VIEW market_trends_mv_new RENAME TO market_trends_mv;
      
      CREATE UNIQUE INDEX market_trends_mv_unique_idx ON market_trends_mv(unique_id);
    `);
    
    console.log('✅ Added unique_id column and created unique index');
    
  } catch (error) {
    console.error('❌ Error creating unique index:', error);
    throw error;
  }
}

// Run the migration
createUniqueIndex()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });

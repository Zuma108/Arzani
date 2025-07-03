// test-analytics-table.js
// A simple script to test if the analytics_events table is properly set up

const { Pool } = require('pg');
const config = require('./config');

// Create a connection pool
const pool = new Pool(config.database);

async function testAnalyticsTable() {
  try {
    console.log('Testing analytics_events table...');
    
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'analytics_events'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.error('❌ analytics_events table does not exist! Please run the analytics_events_table.sql script first.');
      return;
    }
    
    console.log('✅ analytics_events table exists.');
    
    // Test inserting a sample record
    await pool.query(`
      INSERT INTO analytics_events 
        (event_type, user_id, event_data, ip_address, verification_code, success) 
      VALUES 
        ('test_event', 
         (SELECT id FROM users ORDER BY id LIMIT 1), 
         '{"test": "data"}', 
         '127.0.0.1', 
         '123456', 
         true)
      RETURNING id;
    `);
    
    console.log('✅ Successfully inserted test record.');
    
    // Test querying the sample record
    const result = await pool.query(`
      SELECT * FROM analytics_events WHERE event_type = 'test_event' ORDER BY created_at DESC LIMIT 1;
    `);
    
    console.log('✅ Successfully queried the test record:');
    console.log(result.rows[0]);
    
    // Test the weekly analytics summary function
    const summary = await pool.query(`
      SELECT * FROM get_weekly_analytics_summary();
    `);
    
    console.log('✅ Weekly analytics summary function works:');
    console.table(summary.rows);
    
    // Clean up test data
    await pool.query(`
      DELETE FROM analytics_events WHERE event_type = 'test_event';
    `);
    
    console.log('✅ Cleaned up test data.');
    console.log('✅ All tests passed! The analytics_events table is ready to use.');
    
  } catch (error) {
    console.error('❌ Error testing analytics_events table:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the test
testAnalyticsTable();

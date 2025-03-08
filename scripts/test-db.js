import pool from '../db.js';

async function testConnection() {
  try {
    // Test basic connection
    const result = await pool.query('SELECT NOW()');
    console.log('Database connected:', result.rows[0]);

    // Check if tables exist
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Available tables:', tables.rows.map(r => r.table_name));

    // Test business_history table
    const history = await pool.query('SELECT COUNT(*) FROM business_history');
    console.log('History entries:', history.rows[0].count);

  } catch (error) {
    console.error('Database test failed:', error);
  } finally {
    await pool.end();
  }
}

testConnection();

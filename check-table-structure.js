import pool from './db.js';

async function checkTableStructure() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, ordinal_position 
      FROM information_schema.columns 
      WHERE table_name = 'a2a_session_context' 
      ORDER BY ordinal_position
    `);
    
    console.log('a2a_session_context table structure:');
    result.rows.forEach(row => {
      console.log(`  ${row.ordinal_position}. ${row.column_name} (${row.data_type})`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkTableStructure();

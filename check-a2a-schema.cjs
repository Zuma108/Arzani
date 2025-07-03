const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function checkA2ASchema() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'a2a_chat_sessions'
      ORDER BY ordinal_position;
    `);
    
    console.log('a2a_chat_sessions schema:');
    console.table(result.rows);
    
    await pool.end();
  } catch (error) {
    console.error('Error checking schema:', error);
    process.exit(1);
  }
}

checkA2ASchema();

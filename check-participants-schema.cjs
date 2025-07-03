const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function checkConversationParticipantsSchema() {
  try {
    // Check if the table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'conversation_participants'
      );
    `);
    
    const tableExists = tableCheck.rows[0].exists;
    console.log(`conversation_participants table exists: ${tableExists}`);
    
    if (tableExists) {
      const result = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'conversation_participants'
        ORDER BY ordinal_position;
      `);
      
      console.log('conversation_participants schema:');
      console.table(result.rows);
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error checking schema:', error);
    process.exit(1);
  }
}

checkConversationParticipantsSchema();

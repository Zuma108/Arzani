import pool from '../../db.js';

async function checkSchema() {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'blog_posts' 
      ORDER BY ordinal_position
    `);
    
    console.log('Blog Posts Table Schema:');
    console.log('========================');
    result.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type}${row.character_maximum_length ? `(${row.character_maximum_length})` : ''}`);
    });
    
    client.release();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSchema();

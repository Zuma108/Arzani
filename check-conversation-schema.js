import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Create a database connection pool
const pool = new pg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function checkConversationSchema() {
  console.log('Checking conversations and messages table schema...');
  
  try {
    // Check conversations table
    const conversationsSchema = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'conversations'
      ORDER BY ordinal_position
    `);
    
    console.log('\nConversations table schema:');
    console.table(conversationsSchema.rows);
    
    // Check messages table
    const messagesSchema = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'messages'
      ORDER BY ordinal_position
    `);
    
    console.log('\nMessages table schema:');
    console.table(messagesSchema.rows);
    
    // Check conversation_participants table
    const participantsSchema = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'conversation_participants'
      ORDER BY ordinal_position
    `);
    
    console.log('\nConversation_participants table schema:');
    console.table(participantsSchema.rows);
    
    // Check for indexes that might be using wrong column names
    const conversationIndexes = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'conversations'
    `);
    
    console.log('\nConversations table indexes:');
    console.table(conversationIndexes.rows);
    
    const messagesIndexes = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'messages'
    `);
    
    console.log('\nMessages table indexes:');
    console.table(messagesIndexes.rows);
    
    const participantsIndexes = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'conversation_participants'
    `);
    
    console.log('\nConversation_participants table indexes:');
    console.table(participantsIndexes.rows);
    
  } catch (error) {
    console.error('Error checking schema:', error);
  } finally {
    await pool.end();
  }
}

// Run the check
checkConversationSchema();

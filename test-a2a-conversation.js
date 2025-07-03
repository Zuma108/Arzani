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

async function testCreateConversation() {
  console.log('Testing creating a conversation in a2a_chat_sessions...');
  
  try {
    // Create a new conversation directly in the database
    const createQuery = `
      INSERT INTO a2a_chat_sessions (
        user_id,
        session_name,
        agent_type,
        title,
        created_at,
        updated_at,
        is_active,
        last_active_at,
        is_pinned,
        metadata
      )
      VALUES (
        1, 'Test Chat', 'orchestrator', 'Test Title', NOW(), NOW(), true, NOW(), false, '{}'
      )
      RETURNING id, created_at, updated_at
    `;
    
    console.log('Executing query:', createQuery);
    const result = await pool.query(createQuery);
    const conversation = result.rows[0];
    
    console.log('✅ Successfully created test conversation:');
    console.log(conversation);
    
    // Add a test message
    const messageQuery = `
      INSERT INTO a2a_chat_messages (
        session_id,
        sender_type,
        agent_type,
        message_content,
        content,
        created_at,
        message_order
      )
      VALUES (
        $1, 'user', 'orchestrator', 'Test message content', 'Test message content', NOW(), 1
      )
      RETURNING id, created_at
    `;
    
    console.log('Executing message query:', messageQuery);
    const messageResult = await pool.query(messageQuery, [conversation.id]);
    const message = messageResult.rows[0];
    
    console.log('✅ Successfully created test message:');
    console.log(message);
    
    // Print expected JSON response for frontend
    console.log('\nExpected API response for frontend:');
    console.log(JSON.stringify({
      success: true,
      id: conversation.id,
      created_at: conversation.created_at,
      updated_at: conversation.updated_at,
      group_name: 'Test Chat',
      title: 'Test Title',
      agent_type: 'orchestrator',
      is_ai_chat: true
    }, null, 2));
    
    // Clean up
    await pool.query('DELETE FROM a2a_chat_messages WHERE session_id = $1', [conversation.id]);
    await pool.query('DELETE FROM a2a_chat_sessions WHERE id = $1', [conversation.id]);
    console.log('✅ Cleaned up test data');
    
  } catch (error) {
    console.error('❌ Error testing conversation creation:', error);
    console.error('Error details:', error.stack);
  } finally {
    await pool.end();
  }
}

// Run the test
testCreateConversation();

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

async function checkApiResponseFormat() {
  console.log('Checking API response format for compatibility...');
  
  try {
    // 1. Check the format of data in a2a_chat_sessions
    const a2aSessions = await pool.query(`
      SELECT 
        id, 
        user_id, 
        title, 
        session_name,
        agent_type,
        COALESCE(last_active_at, updated_at, created_at) as last_active_at,
        created_at,
        updated_at,
        is_active,
        is_pinned
      FROM a2a_chat_sessions
      WHERE is_active = true
      ORDER BY COALESCE(last_active_at, updated_at, created_at) DESC
      LIMIT 5;
    `);
    
    console.log('Sample a2a_chat_sessions data:');
    console.log(JSON.stringify(a2aSessions.rows, null, 2));
    
    // 2. Simulate the threads API response format
    const threadsApiResponse = {
      success: true,
      data: a2aSessions.rows.map(session => ({
        id: session.id,
        title: session.title || session.session_name || 'Untitled Chat',
        group_name: session.session_name,
        last_active_at: session.last_active_at,
        updated_at: session.updated_at,
        created_at: session.created_at,
        is_pinned: session.is_pinned || false,
        agent_type: session.agent_type,
        // Frontend expected fields
        last_message: null, // This would come from the latest message
        is_ai_chat: true,
        conversation_id: session.id // Alternative field name used in frontend
      }))
    };
    
    console.log('\nSimulated threads API response:');
    console.log(JSON.stringify(threadsApiResponse, null, 2));
    
    // 3. Check the frontend expected format
    console.log('\nFrontend expects:');
    console.log('1. loadConversations() expects: data.data array of conversation objects');
    console.log('2. createNewConversation() expects: direct conversation object with id/conversation_id field');
    
    // 4. Check if we're missing any crucial fields
    const frontendRequiredFields = [
      'id', 'title', 'created_at', 'updated_at', 'is_ai_chat'
    ];
    
    if (a2aSessions.rows.length > 0) {
      const missingFields = frontendRequiredFields.filter(field => {
        // Special handling for is_ai_chat which is added in API layer
        if (field === 'is_ai_chat') return false;
        return !(field in a2aSessions.rows[0]);
      });
      
      if (missingFields.length > 0) {
        console.log('\n⚠️ Missing fields required by frontend:', missingFields);
        console.log('These fields need to be added in the API response transformation.');
      } else {
        console.log('\n✅ All required frontend fields are present in the data.');
      }
    }
    
    // 5. Check the last message association
    const lastMessageQuery = await pool.query(`
      WITH session_with_message AS (
        SELECT 
          s.id as session_id,
          m.id as message_id,
          m.message_content,
          m.created_at as message_created_at,
          ROW_NUMBER() OVER (PARTITION BY s.id ORDER BY m.created_at DESC) as rn
        FROM a2a_chat_sessions s
        LEFT JOIN a2a_chat_messages m ON s.id = m.session_id
        WHERE s.is_active = true
        AND m.id IS NOT NULL
      )
      SELECT * FROM session_with_message WHERE rn = 1 LIMIT 5;
    `);
    
    console.log('\nLast message association check:');
    console.log(JSON.stringify(lastMessageQuery.rows, null, 2));
    
    // 6. Recommendations
    console.log('\nRecommendations:');
    console.log('1. Ensure the /api/threads endpoint returns { success: true, data: [...] }');
    console.log('2. Each conversation object should include: id, title, created_at, updated_at, is_ai_chat');
    console.log('3. Include last_message from the most recent a2a_chat_messages entry');
    console.log('4. Add is_ai_chat field (true) if not present in database');
    console.log('5. For backwards compatibility, include conversation_id as an alias to id');
    
    console.log('\nCheck complete.');
    
  } catch (error) {
    console.error('Error during check:', error);
  } finally {
    await pool.end();
  }
}

// Execute the check
checkApiResponseFormat();

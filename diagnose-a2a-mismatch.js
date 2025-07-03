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

async function diagnoseConversationMismatch() {
  console.log('Starting conversation/a2a table mismatch diagnosis...');
  
  try {
    // 1. Check if the tables exist
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name IN ('a2a_chat_sessions', 'a2a_chat_messages', 'conversations', 'messages');
    `);
    
    const tables = tableCheck.rows.map(row => row.table_name);
    console.log('Tables found:', tables);
    
    // 2. Count rows in each table
    const counts = {};
    for (const table of tables) {
      const countResult = await pool.query(`SELECT COUNT(*) FROM ${table}`);
      counts[table] = parseInt(countResult.rows[0].count);
    }
    
    console.log('Row counts:', counts);
    
    // 3. Check most recent entries in each table
    const recentData = {};
    
    if (tables.includes('a2a_chat_sessions')) {
      const recentSessions = await pool.query(`
        SELECT id, user_id, title, created_at
        FROM a2a_chat_sessions
        ORDER BY created_at DESC
        LIMIT 5;
      `);
      recentData.a2a_chat_sessions = recentSessions.rows;
    }
    
    if (tables.includes('conversations')) {
      const recentConversations = await pool.query(`
        SELECT id, user_id, title, created_at
        FROM conversations
        ORDER BY created_at DESC
        LIMIT 5;
      `);
      recentData.conversations = recentConversations.rows;
    }
    
    console.log('Recent sessions/conversations:');
    console.log(JSON.stringify(recentData, null, 2));
    
    // 4. Check if there are any user IDs that appear in both systems
    if (tables.includes('a2a_chat_sessions') && tables.includes('conversations')) {
      const userOverlap = await pool.query(`
        SELECT a.user_id, 
               COUNT(DISTINCT a.id) as a2a_count,
               COUNT(DISTINCT c.id) as conv_count
        FROM a2a_chat_sessions a
        JOIN conversations c ON a.user_id = c.user_id
        WHERE a.user_id IS NOT NULL AND c.user_id IS NOT NULL
        GROUP BY a.user_id;
      `);
      
      console.log('Users with conversations in both systems:');
      console.log(JSON.stringify(userOverlap.rows, null, 2));
    }
    
    // 5. Check API route registrations
    console.log('\nAPI endpoints check:');
    console.log('- Make sure threadsApiRoutes is registered in server.js');
    console.log('- Make sure messagesApiRoutes is registered in server.js');
    console.log('- Check the frontend code to see which endpoints it\'s calling');
    
    // 6. Recommendations
    console.log('\nRecommendations:');
    
    // Old to new migration needed?
    if (counts.conversations > counts.a2a_chat_sessions) {
      console.log('- Consider migrating data from conversations/messages to a2a_chat_sessions/a2a_chat_messages');
    }
    
    // Recent activity mismatch
    if (recentData.conversations && recentData.a2a_chat_sessions) {
      const latestConvDate = new Date(recentData.conversations[0].created_at);
      const latestA2aDate = new Date(recentData.a2a_chat_sessions[0].created_at);
      
      if (latestConvDate > latestA2aDate) {
        console.log('- Recent activity is going to the old tables instead of a2a tables');
        console.log(`  Latest conversation: ${latestConvDate.toISOString()}`);
        console.log(`  Latest a2a session: ${latestA2aDate.toISOString()}`);
      }
    }
    
    // 7. Check for API response format mismatches
    console.log('\nAPI Response Format Check:');
    
    // Check a2a_chat_sessions structure and compare with frontend expectations
    if (tables.includes('a2a_chat_sessions')) {
      const a2aSessionStructure = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'a2a_chat_sessions';
      `);
      
      console.log('a2a_chat_sessions columns:');
      const a2aColumns = a2aSessionStructure.rows.map(row => row.column_name);
      console.log(a2aColumns);
      
      // Check if key fields expected by frontend exist
      const requiredFields = ['id', 'title', 'user_id', 'created_at', 'updated_at', 'is_active'];
      const missingFields = requiredFields.filter(field => !a2aColumns.includes(field));
      
      if (missingFields.length > 0) {
        console.log('⚠️ Missing fields in a2a_chat_sessions that frontend may expect:', missingFields);
      }
      
      // Check sample data format
      const sampleSession = await pool.query(`
        SELECT * FROM a2a_chat_sessions LIMIT 1;
      `);
      
      if (sampleSession.rows.length > 0) {
        console.log('Sample a2a_chat_sessions data format:');
        console.log(JSON.stringify(sampleSession.rows[0], null, 2));
      }
    }
    
    // Check if there's a mismatch in how dates are formatted
    if (tables.includes('a2a_chat_sessions')) {
      const dateFormatCheck = await pool.query(`
        SELECT 
          id,
          to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at_iso,
          created_at::text as created_at_text
        FROM a2a_chat_sessions
        LIMIT 1;
      `);
      
      if (dateFormatCheck.rows.length > 0) {
        console.log('\nDate format check:');
        console.log(dateFormatCheck.rows[0]);
      }
    }
    
    // 8. Check for response structure expected by frontend
    console.log('\nFrontend expected structure check:');
    console.log('Frontend loadConversations() expects response in format: data.data');
    console.log('Frontend createNewConversation() expects direct response fields: id/conversation_id, group_name, created_at, updated_at');
    
    console.log('\nAPI endpoint investigation:');
    console.log('Verify that /api/threads endpoint returns { success: true, data: [...conversations] }');
    console.log('Verify that each conversation object has expected fields (id, title, created_at, etc.)');
    
    console.log('\nDiagnosis complete.');
    
  } catch (error) {
    console.error('Error during diagnosis:', error);
  } finally {
    await pool.end();
  }
}

// Execute the diagnosis
diagnoseConversationMismatch();

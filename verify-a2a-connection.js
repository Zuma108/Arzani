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

async function verifyA2AConnection() {
  console.log('Verifying a2a connection...');
  
  try {
    // 1. Check if the tables are now in sync
    const latestActivityCheck = await pool.query(`
      SELECT 
        'conversations' as table_name, 
        MAX(created_at) as latest_activity
      FROM conversations
      UNION ALL
      SELECT 
        'a2a_chat_sessions' as table_name, 
        MAX(created_at) as latest_activity
      FROM a2a_chat_sessions
      ORDER BY latest_activity DESC;
    `);
    
    console.log('Latest activity by table:');
    console.log(latestActivityCheck.rows);
      // 2. Compare the most recent a2a_chat_sessions with the old conversations
    const recentSessionsCheck = await pool.query(`
      SELECT 
        a.id as a2a_id,
        a.title as a2a_title,
        a.created_at as a2a_created_at,
        c.id as conv_id,
        c.title as conv_title,
        c.created_at as conv_created_at
      FROM a2a_chat_sessions a
      LEFT JOIN conversations c ON 
        a.created_at::date = c.created_at::date
        AND EXTRACT(EPOCH FROM (a.created_at - c.created_at)) BETWEEN -1 AND 1 -- Within 1 second
      WHERE a.created_at > (NOW() - INTERVAL '1 day')
      ORDER BY a.created_at DESC
      LIMIT 10;
    `);
    
    console.log('\nRecent a2a sessions with potential conversation matches:');
    console.log(recentSessionsCheck.rows);
    
    // 3. Check if any conversations have been created in the old tables after the fix
    const postFixConversations = await pool.query(`
      SELECT 
        id, title, created_at
      FROM conversations
      WHERE created_at > (
        SELECT MAX(created_at) FROM a2a_chat_sessions
      )
      ORDER BY created_at DESC;
    `);
    
    if (postFixConversations.rows.length > 0) {
      console.log('\n⚠️ WARNING: New conversations are still being created in the old tables!');
      console.log(postFixConversations.rows);
    } else {
      console.log('\n✅ No new conversations in old tables after a2a migration.');
    }
    
    // 4. Final verification
    console.log('\nVerification complete.');
    
    if (latestActivityCheck.rows[0].table_name === 'a2a_chat_sessions') {
      console.log('✅ The a2a_chat_sessions table now has the most recent activity.');
      console.log('The API should now be properly reading and writing to the a2a tables.');
    } else {
      console.log('⚠️ The conversations table still has more recent activity than a2a_chat_sessions.');
      console.log('You may need to fix the code that creates new conversations to use a2a tables.');
    }
    
  } catch (error) {
    console.error('Error during verification:', error);
  } finally {
    await pool.end();
  }
}

// Execute the verification
verifyA2AConnection();

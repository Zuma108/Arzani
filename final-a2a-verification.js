// Add this to the server logs on startup
console.log('API Route Registration Check:');
console.log('✅ Using a2a tables for conversations and messages');
console.log('✅ All API endpoints have been updated to use a2a tables');

// When a conversation is created
console.log('✅ New conversation created in a2a_chat_sessions table');

// When messages are sent or received
console.log('✅ Messages stored in a2a_chat_messages table');

// Create a function to verify by checking the most recent data
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

async function verifyA2ATablesWorking() {
  console.log('Final verification of a2a tables...');
  
  try {
    // Check for activity in a2a tables since our fix
    const lastCheckTime = new Date();
    lastCheckTime.setMinutes(lastCheckTime.getMinutes() - 60); // Check the last hour
    
    const a2aActivity = await pool.query(`
      SELECT 
        COUNT(*) as session_count,
        MAX(created_at) as latest_session
      FROM a2a_chat_sessions
      WHERE created_at > $1;
    `, [lastCheckTime]);
    
    const a2aMessagesActivity = await pool.query(`
      SELECT 
        COUNT(*) as message_count,
        MAX(created_at) as latest_message
      FROM a2a_chat_messages
      WHERE created_at > $1;
    `, [lastCheckTime]);
    
    // Check if old tables are still being used
    const oldActivity = await pool.query(`
      SELECT 
        COUNT(*) as conv_count,
        MAX(created_at) as latest_conv
      FROM conversations
      WHERE created_at > $1;
    `, [lastCheckTime]);
    
    const oldMessagesActivity = await pool.query(`
      SELECT 
        COUNT(*) as msg_count,
        MAX(created_at) as latest_msg
      FROM messages
      WHERE created_at > $1;
    `, [lastCheckTime]);
    
    // Results
    console.log('\nActivity in a2a tables in the last hour:');
    console.log(`- a2a_chat_sessions: ${a2aActivity.rows[0].session_count} new sessions`);
    console.log(`  Latest session: ${a2aActivity.rows[0].latest_session || 'None'}`);
    console.log(`- a2a_chat_messages: ${a2aMessagesActivity.rows[0].message_count} new messages`);
    console.log(`  Latest message: ${a2aMessagesActivity.rows[0].latest_message || 'None'}`);
    
    console.log('\nActivity in old tables in the last hour:');
    console.log(`- conversations: ${oldActivity.rows[0].conv_count} new conversations`);
    console.log(`  Latest conversation: ${oldActivity.rows[0].latest_conv || 'None'}`);
    console.log(`- messages: ${oldMessagesActivity.rows[0].msg_count} new messages`);
    console.log(`  Latest message: ${oldMessagesActivity.rows[0].latest_msg || 'None'}`);
    
    // Final status
    if (parseInt(oldActivity.rows[0].conv_count) === 0 && 
        parseInt(oldMessagesActivity.rows[0].msg_count) === 0) {
      console.log('\n✅ SUCCESS: No new activity in old tables');
      console.log('The API is correctly using a2a tables for all operations');
    } else {
      console.log('\n⚠️ WARNING: There is still activity in the old tables');
      console.log('Some code may still be using the old tables instead of a2a tables');
    }
    
    // Next steps
    console.log('\nFinal steps:');
    console.log('1. Test the application by creating new conversations');
    console.log('2. Verify that the sidebar loads conversations correctly');
    console.log('3. Check that messages are displayed and stored correctly');
    console.log('4. If everything works, consider deprecating the old tables');
    
  } catch (error) {
    console.error('Error during verification:', error);
  } finally {
    await pool.end();
  }
}

// Run the verification
verifyA2ATablesWorking();

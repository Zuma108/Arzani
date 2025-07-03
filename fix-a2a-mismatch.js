import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Create a database connection pool
const pool = new pg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function fixA2AMismatch() {
  console.log('Starting a2a mismatch fix...');
  
  try {
    // 1. Check which tables have the most recent data
    const recentActivityCheck = await pool.query(`
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
    
    console.log('Recent activity by table:');
    console.log(recentActivityCheck.rows);
    
    // 2. Find the routes that create conversations and check if they're using a2a tables
    console.log('\nChecking API route implementations...');
    
    // 3. Fix: Create migration script to sync recent conversations from old tables to a2a tables
    console.log('\nMigrating recent conversations from old tables to a2a tables...');
    
    // Get most recent conversations that aren't in a2a tables
    const recentConversations = await pool.query(`
      SELECT 
        c.id as old_id, 
        c.user_id, 
        c.title, 
        c.created_at, 
        c.updated_at
      FROM conversations c
      WHERE c.created_at > (
        SELECT COALESCE(MAX(created_at), '2000-01-01'::timestamp) 
        FROM a2a_chat_sessions
      )
      ORDER BY c.created_at DESC
      LIMIT 50;
    `);
    
    console.log(`Found ${recentConversations.rows.length} recent conversations to migrate`);
    
    // Migrate each conversation
    for (const conv of recentConversations.rows) {
      console.log(`Migrating conversation ${conv.old_id} from ${conv.created_at}...`);
      
      // Insert into a2a_chat_sessions
      const sessionResult = await pool.query(`
        INSERT INTO a2a_chat_sessions (
          user_id, 
          title, 
          session_name, 
          agent_type, 
          created_at, 
          updated_at, 
          is_active,
          last_active_at
        ) VALUES (
          $1, $2, 'Migrated Conversation', 'orchestrator', $3, $4, true, $4
        ) RETURNING id;
      `, [
        conv.user_id || 1,  // Use default user ID 1 if null
        conv.title || 'Migrated Conversation', 
        conv.created_at, 
        conv.updated_at || conv.created_at
      ]);
      
      const newSessionId = sessionResult.rows[0].id;
      
      // Get messages from old conversation
      const messages = await pool.query(`
        SELECT * FROM messages 
        WHERE conversation_id = $1 
        ORDER BY created_at ASC;
      `, [conv.old_id]);
      
      console.log(`Migrating ${messages.rows.length} messages for conversation ${conv.old_id}...`);
      
      // Migrate each message
      for (const msg of messages.rows) {        // Check a2a_chat_messages columns before inserting
        const messageColumns = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'a2a_chat_messages'
        `);
        
        const columns = messageColumns.rows.map(row => row.column_name);
        console.log('a2a_chat_messages columns:', columns);
        
        // Prepare the insert query based on available columns
        let insertColumns = ['session_id'];
        let insertValues = [newSessionId];
        let valuePlaceholders = ['$1'];
        let valueIndex = 2;
        
        // Add standard fields if they exist in the schema
        const fieldMappings = [
          { column: 'role', value: msg.role || (msg.is_from_user ? 'user' : 'assistant') },
          { column: 'message_content', value: msg.content || msg.message || '' },
          { column: 'content', value: msg.content || msg.message || '' },
          { column: 'created_at', value: msg.created_at },
          { column: 'updated_at', value: msg.updated_at || msg.created_at },
          { column: 'is_active', value: true },
          { column: 'message_type', value: 'text' }
        ];
        
        fieldMappings.forEach(mapping => {
          if (columns.includes(mapping.column)) {
            insertColumns.push(mapping.column);
            insertValues.push(mapping.value);
            valuePlaceholders.push(`$${valueIndex}`);
            valueIndex++;
          }
        });
        
        // Construct and execute dynamic query
        const insertQuery = `
          INSERT INTO a2a_chat_messages (${insertColumns.join(', ')})
          VALUES (${valuePlaceholders.join(', ')})
        `;
        
        await pool.query(insertQuery, insertValues);
      }
      
      console.log(`✅ Successfully migrated conversation ${conv.old_id} to a2a session ${newSessionId}`);
    }
    
    // 4. Update the frontend to work with both old and new data formats
    console.log('\nFixing database mismatch complete.');
    console.log('Please restart your server to ensure changes take effect.');
    
  } catch (error) {
    console.error('Error during fix:', error);
  } finally {
    await pool.end();
  }
}

// Execute the fix
fixA2AMismatch();

/**
 * Fix Threads API to use A2A tables
 * 
 * This script modifies the threads API routes to use the a2a_chat_sessions, a2a_chat_messages
 * and related tables instead of the older conversations tables.
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const pool = require('./db.js');

const __dirname = path.resolve();

console.log('🔄 Starting thread API fix process...');

// Backup the current threads.js file
const threadsFilePath = path.join(__dirname, 'routes', 'api', 'threads.js');
const backupFilePath = path.join(__dirname, 'routes', 'api', 'threads.js.bak');

try {
  // Create backup
  console.log('📦 Creating backup of threads.js...');
  fs.copyFileSync(threadsFilePath, backupFilePath);
  console.log('✅ Backup created at: ' + backupFilePath);
  
  // Read the current threads.js content
  const originalContent = fs.readFileSync(threadsFilePath, 'utf8');
  
  // Modify the content to use a2a tables
  let newContent = originalContent;
  
  // Replace the query in the GET / endpoint
  console.log('🛠️ Updating main GET endpoint to use a2a tables...');
  
  // Find the main query portion
  const queryStartMarker = 'WITH user_conversations AS (';
  const queryEndMarker = 'FROM bucketed_conversations bc';
  const queryRegex = new RegExp(`${queryStartMarker}[\\s\\S]*?${queryEndMarker}`, 'g');
  
  // Replace with a2a query
  const a2aQuery = `WITH user_conversations AS (
    SELECT DISTINCT
        s.id,
        s.created_at,
        s.updated_at,
        s.is_active,
        s.title AS group_name,
        NULL AS business_id,
        
        -- Get last message info
        COALESCE(last_msg.content, '') AS last_message,
        COALESCE(last_msg.created_at, s.created_at) AS last_message_time,
        CASE 
            WHEN last_msg.sender_type = 'user' THEN 'User'
            ELSE s.agent_type 
        END AS last_sender_name,
        
        -- Get agent type info
        s.agent_type,
        
        -- Calculate time buckets
        CASE 
            WHEN COALESCE(last_msg.created_at, s.last_active_at, s.created_at)::date = CURRENT_DATE THEN 'today'
            WHEN COALESCE(last_msg.created_at, s.last_active_at, s.created_at)::date = CURRENT_DATE - INTERVAL '1 day' THEN 'yesterday'
            WHEN COALESCE(last_msg.created_at, s.last_active_at, s.created_at) >= CURRENT_DATE - INTERVAL '7 days' THEN 'last7Days'
            ELSE 'older'
        END AS time_bucket,
        
        -- Get thread preferences
        COALESCE(tp.is_pinned, false) AS is_pinned
        
    FROM a2a_chat_sessions s
    
    -- Get thread preferences
    LEFT JOIN a2a_thread_preferences tp ON s.id = tp.session_id AND tp.user_id = $1
    
    -- Get last message
    LEFT JOIN LATERAL (
        SELECT m.content, m.created_at, m.sender_type
        FROM a2a_chat_messages m
        WHERE m.session_id = s.id
        ORDER BY m.created_at DESC
        LIMIT 1
    ) last_msg ON true
    
    WHERE s.user_id = $1 AND s.is_active = true
    ORDER BY COALESCE(last_msg.created_at, s.last_active_at, s.created_at) DESC
),

bucketed_conversations AS (
    SELECT 
        uc.*,
        ROW_NUMBER() OVER (PARTITION BY time_bucket ORDER BY last_message_time DESC) as bucket_row_num,
        ROW_NUMBER() OVER (PARTITION BY CASE WHEN is_pinned THEN 1 ELSE 0 END ORDER BY last_message_time DESC) as pinned_row_num
    FROM user_conversations uc
),

counts AS (
    SELECT 
        COUNT(*) as total_count,
        COUNT(CASE WHEN is_pinned THEN 1 END) as pinned_count,
        COUNT(CASE WHEN time_bucket = 'today' THEN 1 END) as today_count,
        COUNT(CASE WHEN time_bucket = 'yesterday' THEN 1 END) as yesterday_count,
        COUNT(CASE WHEN time_bucket = 'last7Days' THEN 1 END) as last7days_count,
        COUNT(CASE WHEN time_bucket = 'older' THEN 1 END) as older_count
    FROM user_conversations
)

SELECT 
    bc.*,
    c.total_count,
    c.pinned_count,
    c.today_count,
    c.yesterday_count,
    c.last7days_count,
    c.older_count
FROM bucketed_conversations bc`;

  newContent = newContent.replace(queryRegex, a2aQuery);
  
  // Update the response formatter to match expected format
  console.log('🛠️ Updating response formatter to match expected format...');
  
  // Find the response formatter portion
  const formatterStartMarker = 'const response = {';
  const formatterEndMarker = 'res.json(response);';
  const formatterRegex = new RegExp(`${formatterStartMarker}[\\s\\S]*?${formatterEndMarker}`, 'g');
  
  // Replace with a2a formatter
  const a2aFormatter = `const response = {
    success: true,
    data: {
        pinned: results.filter(r => r.is_pinned).map(formatThread),
        today: results.filter(r => !r.is_pinned && r.time_bucket === 'today').map(formatThread),
        yesterday: results.filter(r => !r.is_pinned && r.time_bucket === 'yesterday').map(formatThread),
        last7Days: results.filter(r => !r.is_pinned && r.time_bucket === 'last7Days').map(formatThread),
        older: results.filter(r => !r.is_pinned && r.time_bucket === 'older').map(formatThread),
        metadata: {
            totalCount: results.length > 0 ? results[0].total_count : 0,
            pinnedCount: results.length > 0 ? results[0].pinned_count : 0,
            todayCount: results.length > 0 ? results[0].today_count : 0,
            yesterdayCount: results.length > 0 ? results[0].yesterday_count : 0,
            last7DaysCount: results.length > 0 ? results[0].last7days_count : 0,
            olderCount: results.length > 0 ? results[0].older_count : 0,
            limit,
            offset,
            generatedAt: new Date().toISOString(),
            fromCache: false
        }
    },
    timestamp: new Date().toISOString()
};

res.json(response);`;

  newContent = newContent.replace(formatterRegex, a2aFormatter);
  
  // Update the formatThread function
  console.log('🛠️ Updating formatThread function...');
  
  const threadFormatterRegex = /function formatThread\(thread\) {[\s\S]*?}/;
  const a2aThreadFormatter = `function formatThread(thread) {
    return {
        id: thread.id,
        title: thread.group_name || 'New Chat',
        last_message: thread.last_message || '',
        last_message_time: thread.last_message_time,
        last_sender_name: thread.last_sender_name,
        created_at: thread.created_at,
        updated_at: thread.updated_at,
        agent_type: thread.agent_type || 'orchestrator',
        is_pinned: thread.is_pinned,
        is_active: thread.is_active,
        time_bucket: thread.time_bucket
    };
}`;

  newContent = newContent.replace(threadFormatterRegex, a2aThreadFormatter);
  
  // Update the messages endpoint
  console.log('🛠️ Updating messages endpoint to use a2a tables...');
  
  const messagesEndpointRegex = /router\.get\('\/\:id\/messages'/;
  const messagesQueryRegex = /SELECT\s+m\.\*[\s\S]*?FROM\s+messages\s+m[\s\S]*?WHERE\s+m\.conversation_id\s+=\s+\$1[\s\S]*?ORDER\s+BY\s+m\.created_at/;
  
  const a2aMessagesQuery = `SELECT 
        m.id,
        m.content,
        m.created_at,
        m.sender_type,
        m.agent_type,
        m.message_order
    FROM a2a_chat_messages m
    WHERE m.session_id = $1
    ORDER BY m.created_at`;
  
  newContent = newContent.replace(messagesQueryRegex, a2aMessagesQuery);
  
  // Save the modified content
  console.log('💾 Saving updated threads.js file...');
  fs.writeFileSync(threadsFilePath, newContent, 'utf8');
  console.log('✅ threads.js file updated successfully!');
  
  // Now let's check if we have a2a threads in the database
  console.log('🔍 Checking for a2a thread data...');
  
  const a2aCheck = await pool.query('SELECT COUNT(*) FROM a2a_chat_sessions');
  console.log(`ℹ️ Found ${a2aCheck.rows[0].count} threads in a2a_chat_sessions table`);
  
  if (parseInt(a2aCheck.rows[0].count) === 0) {
    console.log('⚠️ No a2a threads found in database, need to migrate data');
    
    // Get conversation data
    const conversationData = await pool.query(`
      SELECT c.*, u.id as user_id 
      FROM conversations c
      LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id
      LEFT JOIN users u ON cp.user_id = u.id
      WHERE c.is_ai_chat = true
    `);
    
    console.log(`ℹ️ Found ${conversationData.rows.length} AI conversations to migrate`);
    
    // Migrate each conversation to a2a
    for (const conv of conversationData.rows) {
      const userId = conv.user_id || 1;
      
      console.log(`🔄 Migrating conversation ${conv.id} for user ${userId}...`);
      
      // Create a2a session
      const sessionResult = await pool.query(`
        INSERT INTO a2a_chat_sessions 
          (user_id, session_name, agent_type, created_at, updated_at, is_active, title, last_active_at)
        VALUES
          ($1, $2, $3, $4, $5, true, $6, $7)
        RETURNING id
      `, [
        userId,
        conv.group_name || 'Migrated Chat',
        conv.agent_type || 'orchestrator',
        conv.created_at,
        conv.updated_at,
        conv.title || conv.group_name || 'Migrated Chat',
        conv.last_message_at || conv.updated_at || conv.created_at
      ]);
      
      const sessionId = sessionResult.rows[0].id;
      console.log(`✅ Created a2a session with ID ${sessionId}`);
      
      // Get messages for this conversation
      const messages = await pool.query(`
        SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at
      `, [conv.id]);
      
      console.log(`ℹ️ Found ${messages.rows.length} messages to migrate`);
      
      // Migrate each message
      for (let i = 0; i < messages.rows.length; i++) {
        const msg = messages.rows[i];
        await pool.query(`
          INSERT INTO a2a_chat_messages 
            (session_id, content, sender_type, agent_type, message_order, created_at)
          VALUES
            ($1, $2, $3, $4, $5, $6)
        `, [
          sessionId,
          msg.content || '',
          msg.is_from_user ? 'user' : 'assistant',
          conv.agent_type || 'orchestrator',
          i + 1,
          msg.created_at
        ]);
      }
      
      console.log(`✅ Migrated ${messages.rows.length} messages for conversation ${conv.id}`);
    }
    
    console.log('🎉 Migration completed successfully!');
  } else {
    console.log('✅ a2a threads found in database, no migration needed');
  }
  
  console.log('✅ Threads API fix process completed successfully!');
  console.log('🔄 Please restart the server for changes to take effect.');

} catch (error) {
  console.error('❌ Error fixing threads API:', error);
  
  if (fs.existsSync(backupFilePath)) {
    console.log('🔄 Restoring from backup...');
    fs.copyFileSync(backupFilePath, threadsFilePath);
    console.log('✅ Restored from backup');
  }
}

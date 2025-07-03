import pool from './db/index.js';

async function checkConversationData() {
  try {
    console.log('🔍 Checking conversation data...\n');
    
    // Check conversations table
    const conversationsResult = await pool.query(`
      SELECT 
        id, title, group_name, is_ai_chat, created_at, updated_at, user_id,
        conversation_type, last_message
      FROM conversations 
      ORDER BY updated_at DESC 
      LIMIT 10
    `);
    
    console.log('💬 CONVERSATIONS TABLE:');
    console.log(`   📊 Total conversations: ${conversationsResult.rows.length}`);
    if (conversationsResult.rows.length > 0) {
      console.log('   📋 Sample conversations:');
      conversationsResult.rows.forEach((conv, i) => {
        console.log(`   ${i + 1}. ID: ${conv.id}, Title: "${conv.title || conv.group_name || 'Untitled'}", Type: ${conv.conversation_type || 'unknown'}, User: ${conv.user_id}`);
      });
    }
    
    // Check messages table
    const messagesResult = await pool.query(`
      SELECT 
        COUNT(*) as total_messages,
        COUNT(DISTINCT conversation_id) as conversations_with_messages
      FROM messages
    `);
    
    console.log(`\n💭 MESSAGES TABLE:`);
    console.log(`   📊 Total messages: ${messagesResult.rows[0].total_messages}`);
    console.log(`   📊 Conversations with messages: ${messagesResult.rows[0].conversations_with_messages}`);
    
    // Check recent messages
    const recentMessages = await pool.query(`
      SELECT 
        m.id, m.conversation_id, m.content, m.sender_id, m.created_at,
        u.username as sender_name
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      ORDER BY m.created_at DESC 
      LIMIT 5
    `);
    
    if (recentMessages.rows.length > 0) {
      console.log('   📋 Recent messages:');
      recentMessages.rows.forEach((msg, i) => {
        const preview = msg.content.length > 50 ? msg.content.substring(0, 50) + '...' : msg.content;
        console.log(`   ${i + 1}. Conv ${msg.conversation_id}: "${preview}" - ${msg.sender_name || 'Unknown'} (${msg.created_at.toDateString()})`);
      });
    }
    
    // Check conversation participants
    const participantsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_participants,
        COUNT(DISTINCT conversation_id) as conversations_with_participants,
        COUNT(DISTINCT user_id) as unique_users_in_conversations
      FROM conversation_participants
    `);
    
    console.log(`\n👥 CONVERSATION PARTICIPANTS TABLE:`);
    console.log(`   📊 Total participant entries: ${participantsResult.rows[0].total_participants}`);
    console.log(`   📊 Conversations with participants: ${participantsResult.rows[0].conversations_with_participants}`);
    console.log(`   📊 Unique users in conversations: ${participantsResult.rows[0].unique_users_in_conversations}`);
    
    // Check A2A chat sessions
    const a2aSessionsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(DISTINCT user_id) as unique_users,
        array_agg(DISTINCT agent_type) as agent_types
      FROM a2a_chat_sessions
    `);
    
    console.log(`\n🤖 A2A CHAT SESSIONS:`);
    console.log(`   📊 Total A2A sessions: ${a2aSessionsResult.rows[0].total_sessions}`);
    console.log(`   📊 Unique users: ${a2aSessionsResult.rows[0].unique_users}`);
    console.log(`   📊 Agent types: ${a2aSessionsResult.rows[0].agent_types?.join(', ') || 'None'}`);
    
    // Check recent A2A sessions
    const recentA2aSessions = await pool.query(`
      SELECT 
        id, title, session_name, agent_type, user_id, created_at, is_active
      FROM a2a_chat_sessions 
      ORDER BY last_active_at DESC 
      LIMIT 5
    `);
    
    if (recentA2aSessions.rows.length > 0) {
      console.log('   📋 Recent A2A sessions:');
      recentA2aSessions.rows.forEach((session, i) => {
        console.log(`   ${i + 1}. ID: ${session.id}, Title: "${session.title || session.session_name || 'Untitled'}", Agent: ${session.agent_type}, User: ${session.user_id}, Active: ${session.is_active}`);
      });
    }
    
    // Check A2A messages
    const a2aMessagesResult = await pool.query(`
      SELECT 
        COUNT(*) as total_messages,
        COUNT(DISTINCT session_id) as sessions_with_messages
      FROM a2a_chat_messages
    `);
    
    console.log(`\n🤖 A2A CHAT MESSAGES:`);
    console.log(`   📊 Total A2A messages: ${a2aMessagesResult.rows[0].total_messages}`);
    console.log(`   📊 Sessions with messages: ${a2aMessagesResult.rows[0].sessions_with_messages}`);
    
    // Check users table
    const usersResult = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as recent_users
      FROM users
    `);
    
    console.log(`\n👤 USERS TABLE:`);
    console.log(`   📊 Total users: ${usersResult.rows[0].total_users}`);
    console.log(`   📊 Recent users (30 days): ${usersResult.rows[0].recent_users}`);
    
    // Check for potential issues
    console.log(`\n🔍 POTENTIAL ISSUES:`);
    
    // Check for conversations without participants
    const orphanedConversations = await pool.query(`
      SELECT c.id, c.title, c.group_name 
      FROM conversations c
      LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id
      WHERE cp.conversation_id IS NULL
      LIMIT 5
    `);
    
    if (orphanedConversations.rows.length > 0) {
      console.log(`   ⚠️  Found ${orphanedConversations.rows.length} conversations without participants:`);
      orphanedConversations.rows.forEach(conv => {
        console.log(`      - Conv ${conv.id}: "${conv.title || conv.group_name || 'Untitled'}"`);
      });
    } else {
      console.log(`   ✅ All conversations have participants`);
    }
    
    // Check for messages without conversation participants
    const messagesWithoutParticipants = await pool.query(`
      SELECT DISTINCT m.conversation_id
      FROM messages m
      LEFT JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id AND m.sender_id = cp.user_id
      WHERE cp.conversation_id IS NULL
      LIMIT 5
    `);
    
    if (messagesWithoutParticipants.rows.length > 0) {
      console.log(`   ⚠️  Found messages in conversations where sender is not a participant`);
    } else {
      console.log(`   ✅ All message senders are conversation participants`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking conversation data:', error);
    process.exit(1);
  }
}

checkConversationData();

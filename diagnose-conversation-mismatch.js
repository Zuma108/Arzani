/**
 * Diagnostic script to verify conversation data mismatch
 * 
 * This script checks both the legacy conversations tables and the a2a_chat_sessions tables,
 * comparing the data to diagnose the mismatch between frontend expectations and database reality.
 */

const pool = require('./db.js');

// ANSI color codes for nice output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

async function diagnoseConversationMismatch() {
  console.log(`${colors.blue}🔍 Starting conversation data diagnosis...${colors.reset}`);
  
  try {
    // 1. Check legacy conversations
    console.log(`\n${colors.magenta}📊 Checking legacy conversations table...${colors.reset}`);
    const conversationsResult = await pool.query(`
      SELECT COUNT(*) as total, 
             COUNT(CASE WHEN is_ai_chat = true THEN 1 END) as ai_chats,
             MAX(created_at) as latest_created,
             MAX(updated_at) as latest_updated
      FROM conversations
    `);
    
    const convData = conversationsResult.rows[0];
    console.log(`${colors.cyan}Total conversations: ${colors.yellow}${convData.total}${colors.reset}`);
    console.log(`${colors.cyan}AI conversations: ${colors.yellow}${convData.ai_chats}${colors.reset}`);
    console.log(`${colors.cyan}Latest created: ${colors.yellow}${convData.latest_created}${colors.reset}`);
    console.log(`${colors.cyan}Latest updated: ${colors.yellow}${convData.latest_updated}${colors.reset}`);
    
    // 2. Check a2a_chat_sessions
    console.log(`\n${colors.magenta}📊 Checking a2a_chat_sessions table...${colors.reset}`);
    const a2aResult = await pool.query(`
      SELECT COUNT(*) as total,
             COUNT(DISTINCT user_id) as unique_users,
             MAX(created_at) as latest_created,
             MAX(updated_at) as latest_updated
      FROM a2a_chat_sessions
    `);
    
    const a2aData = a2aResult.rows[0];
    console.log(`${colors.cyan}Total sessions: ${colors.yellow}${a2aData.total}${colors.reset}`);
    console.log(`${colors.cyan}Unique users: ${colors.yellow}${a2aData.unique_users}${colors.reset}`);
    console.log(`${colors.cyan}Latest created: ${colors.yellow}${a2aData.latest_created}${colors.reset}`);
    console.log(`${colors.cyan}Latest updated: ${colors.yellow}${a2aData.latest_updated}${colors.reset}`);
    
    // 3. Check for message counts in both systems
    console.log(`\n${colors.magenta}📊 Checking message counts...${colors.reset}`);
    const legacyMessagesResult = await pool.query(`
      SELECT COUNT(*) as count FROM messages
    `);
    
    const a2aMessagesResult = await pool.query(`
      SELECT COUNT(*) as count FROM a2a_chat_messages
    `);
    
    console.log(`${colors.cyan}Legacy messages: ${colors.yellow}${legacyMessagesResult.rows[0].count}${colors.reset}`);
    console.log(`${colors.cyan}a2a messages: ${colors.yellow}${a2aMessagesResult.rows[0].count}${colors.reset}`);
    
    // 4. Compare session_id between a2a_chat_sessions and a2a_chat_messages
    console.log(`\n${colors.magenta}📊 Checking session_id alignment...${colors.reset}`);
    const sessionAlignmentResult = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM a2a_chat_sessions) as total_sessions,
        (SELECT COUNT(DISTINCT session_id) FROM a2a_chat_messages) as distinct_message_sessions,
        (SELECT COUNT(*) FROM a2a_chat_sessions s 
         WHERE EXISTS (SELECT 1 FROM a2a_chat_messages m WHERE m.session_id = s.id)) as sessions_with_messages
    `);
    
    const alignmentData = sessionAlignmentResult.rows[0];
    console.log(`${colors.cyan}Total sessions: ${colors.yellow}${alignmentData.total_sessions}${colors.reset}`);
    console.log(`${colors.cyan}Distinct message sessions: ${colors.yellow}${alignmentData.distinct_message_sessions}${colors.reset}`);
    console.log(`${colors.cyan}Sessions with messages: ${colors.yellow}${alignmentData.sessions_with_messages}${colors.reset}`);
    
    const sessionsWithoutMessages = alignmentData.total_sessions - alignmentData.sessions_with_messages;
    if (sessionsWithoutMessages > 0) {
      console.log(`${colors.red}⚠️ Found ${sessionsWithoutMessages} sessions without messages!${colors.reset}`);
    }
    
    // 5. Check the API endpoint path
    console.log(`\n${colors.magenta}📊 Analyzing API endpoint paths...${colors.reset}`);
    
    // Quick diagnostic of the frontend API call
    const frontendApiPath = '/api/threads';
    console.log(`${colors.cyan}Frontend is calling: ${colors.yellow}${frontendApiPath}${colors.reset}`);
    
    // Check server router mappings from database
    const routerMappingResult = await pool.query(`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE column_name LIKE '%api%' AND column_name LIKE '%endpoint%'
      LIMIT 5
    `);
    
    if (routerMappingResult.rows.length > 0) {
      console.log(`${colors.cyan}Found API endpoint references in database:${colors.reset}`);
      routerMappingResult.rows.forEach(row => {
        console.log(`${colors.gray}- ${row.table_name}.${row.column_name}${colors.reset}`);
      });
    }
    
    // 6. Make diagnosis
    console.log(`\n${colors.green}📋 Diagnosis Summary:${colors.reset}`);
    
    // Compare timestamps to see which system is more current
    const legacyIsNewer = new Date(convData.latest_updated) > new Date(a2aData.latest_updated);
    
    if (legacyIsNewer) {
      console.log(`${colors.red}⚠️ Legacy conversations table has more recent data than a2a_chat_sessions!${colors.reset}`);
      console.log(`${colors.yellow}This suggests that new conversations are still being created in the legacy system.${colors.reset}`);
    } else {
      console.log(`${colors.green}✅ a2a_chat_sessions has more recent data than legacy conversations.${colors.reset}`);
    }
    
    // Check if there's a significant mismatch in conversation counts
    const convRatio = a2aData.total / convData.ai_chats;
    if (convRatio < 0.5) {
      console.log(`${colors.red}⚠️ Significant mismatch in conversation counts! a2a has only ${(convRatio * 100).toFixed(1)}% of legacy AI chats.${colors.reset}`);
    } else if (convRatio > 1.5) {
      console.log(`${colors.yellow}⚠️ a2a has ${(convRatio * 100).toFixed(1)}% more sessions than legacy has AI chats.${colors.reset}`);
    } else {
      console.log(`${colors.green}✅ Conversation counts between systems appear reasonably aligned.${colors.reset}`);
    }
    
    // Check message alignment
    const messageRatio = a2aMessagesResult.rows[0].count / legacyMessagesResult.rows[0].count;
    if (messageRatio < 0.5) {
      console.log(`${colors.red}⚠️ Significant mismatch in message counts! a2a has only ${(messageRatio * 100).toFixed(1)}% of legacy messages.${colors.reset}`);
    } else {
      console.log(`${colors.green}✅ Message counts between systems appear reasonably aligned.${colors.reset}`);
    }
    
    // Check API alignment based on database references
    if (a2aData.total > 0 && alignmentData.sessions_with_messages === 0) {
      console.log(`${colors.red}⚠️ API mismatch detected! a2a sessions exist but have no messages.${colors.reset}`);
      console.log(`${colors.yellow}This suggests API routes may be misaligned - creating sessions in a2a but messages elsewhere.${colors.reset}`);
    }
    
    console.log(`\n${colors.blue}🔍 Conversation data diagnosis complete.${colors.reset}`);
    
    // Final recommendation
    console.log(`\n${colors.magenta}💡 Recommendation:${colors.reset}`);
    
    if (a2aData.total < convData.ai_chats / 2) {
      console.log(`${colors.yellow}The diagnosis indicates that the frontend may be trying to read from a2a tables,${colors.reset}`);
      console.log(`${colors.yellow}but the data is primarily in the legacy conversations tables.${colors.reset}`);
      console.log(`\n${colors.green}Recommended action: Run the fix-threads-api-to-use-a2a.js script to:${colors.reset}`);
      console.log(`${colors.green}1. Update the API to read from the correct tables${colors.reset}`);
      console.log(`${colors.green}2. Migrate existing conversations to the a2a system${colors.reset}`);
    } else if (legacyIsNewer) {
      console.log(`${colors.yellow}The diagnosis indicates that new conversations are still being created in legacy tables,${colors.reset}`);
      console.log(`${colors.yellow}but the frontend may be expecting to read from a2a tables.${colors.reset}`);
      console.log(`\n${colors.green}Recommended action: Update API routes to consistently use a2a tables.${colors.reset}`);
    } else {
      console.log(`${colors.green}Both systems appear to be reasonably aligned.${colors.reset}`);
      console.log(`${colors.green}The issue may be with specific API routes or their implementation.${colors.reset}`);
      console.log(`\n${colors.green}Recommended action: Ensure all API routes consistently use either legacy or a2a tables.${colors.reset}`);
    }
    
  } catch (error) {
    console.error(`${colors.red}❌ Error during diagnosis:${colors.reset}`, error);
  }
}

// Run the diagnostic
diagnoseConversationMismatch()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });

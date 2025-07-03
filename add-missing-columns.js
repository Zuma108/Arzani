import pool from './db/index.js';

async function addMissingColumns() {
  try {
    console.log('🔧 Adding missing columns to conversations table...\n');
    
    const columnsToAdd = [
      {
        name: 'title',
        definition: 'VARCHAR(255)',
        description: 'Conversation title'
      },
      {
        name: 'last_message',
        definition: 'TEXT',
        description: 'Last message content'
      },
      {
        name: 'last_message_at',
        definition: 'TIMESTAMP WITHOUT TIME ZONE',
        description: 'Last message timestamp'
      },
      {
        name: 'is_pinned',
        definition: 'BOOLEAN DEFAULT FALSE',
        description: 'Pinned status'
      },
      {
        name: 'agent_type',
        definition: 'VARCHAR(100) DEFAULT \'orchestrator\'',
        description: 'AI agent type'
      }
    ];
    
    for (const column of columnsToAdd) {
      try {
        // Check if column exists
        const checkResult = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'conversations' AND column_name = $1
        `, [column.name]);
        
        if (checkResult.rows.length === 0) {
          // Column doesn't exist, add it
          await pool.query(`ALTER TABLE conversations ADD COLUMN ${column.name} ${column.definition}`);
          console.log(`✅ Added ${column.name} - ${column.description}`);
        } else {
          console.log(`ℹ️ Column ${column.name} already exists`);
        }
      } catch (error) {
        console.log(`❌ Failed to add ${column.name}: ${error.message}`);
      }
    }
    
    // Add unread_count to conversation_participants
    try {
      const checkUnread = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'conversation_participants' AND column_name = 'unread_count'
      `);
      
      if (checkUnread.rows.length === 0) {
        await pool.query(`ALTER TABLE conversation_participants ADD COLUMN unread_count INTEGER DEFAULT 0`);
        console.log(`✅ Added unread_count to conversation_participants`);
      } else {
        console.log(`ℹ️ Column unread_count already exists in conversation_participants`);
      }
    } catch (error) {
      console.log(`❌ Failed to add unread_count: ${error.message}`);
    }
    
    console.log('\n🔄 Updating existing data...');
    
    // Update titles for existing conversations
    try {
      const updateTitles = await pool.query(`
        UPDATE conversations 
        SET title = COALESCE(group_name, 'Untitled Chat')
        WHERE title IS NULL OR title = ''
      `);
      console.log(`✅ Updated ${updateTitles.rowCount} conversation titles`);
    } catch (error) {
      console.log(`❌ Failed to update titles: ${error.message}`);
    }
    
    // Update last_message info
    try {
      const updateLastMessage = await pool.query(`
        UPDATE conversations 
        SET 
          last_message = (
            SELECT content 
            FROM messages 
            WHERE messages.conversation_id = conversations.id 
            ORDER BY created_at DESC 
            LIMIT 1
          ),
          last_message_at = (
            SELECT created_at 
            FROM messages 
            WHERE messages.conversation_id = conversations.id 
            ORDER BY created_at DESC 
            LIMIT 1
          )
        WHERE last_message IS NULL OR last_message_at IS NULL
      `);
      console.log(`✅ Updated ${updateLastMessage.rowCount} conversations with last message info`);
    } catch (error) {
      console.log(`❌ Failed to update last message info: ${error.message}`);
    }
    
    // Set agent_type for AI chats
    try {
      const updateAgentType = await pool.query(`
        UPDATE conversations 
        SET agent_type = 'orchestrator'
        WHERE is_ai_chat = TRUE AND (agent_type IS NULL OR agent_type = '')
      `);
      console.log(`✅ Updated ${updateAgentType.rowCount} AI conversations with agent type`);
    } catch (error) {
      console.log(`❌ Failed to update agent types: ${error.message}`);
    }
    
    console.log('\n🔍 Final verification...');
    
    // Test the structure
    try {
      const testQuery = await pool.query(`
        SELECT 
          COUNT(*) as total_count,
          COUNT(CASE WHEN title IS NOT NULL AND title != '' THEN 1 END) as with_title,
          COUNT(CASE WHEN last_message IS NOT NULL THEN 1 END) as with_last_message,
          COUNT(CASE WHEN agent_type IS NOT NULL THEN 1 END) as with_agent_type,
          COUNT(CASE WHEN is_ai_chat = TRUE THEN 1 END) as ai_chats
        FROM conversations
      `);
      
      const stats = testQuery.rows[0];
      console.log(`📊 Total conversations: ${stats.total_count}`);
      console.log(`📝 With titles: ${stats.with_title}/${stats.total_count}`);
      console.log(`💬 With last messages: ${stats.with_last_message}/${stats.total_count}`);
      console.log(`🤖 With agent types: ${stats.with_agent_type}/${stats.total_count}`);
      console.log(`🤖 AI chats: ${stats.ai_chats}/${stats.total_count}`);
      
      if (parseInt(stats.with_title) === parseInt(stats.total_count) && 
          parseInt(stats.with_agent_type) > 0) {
        console.log('\n✅ Database structure successfully updated!');
      } else {
        console.log('\n⚠️ Some data still needs attention');
      }
      
    } catch (error) {
      console.log(`❌ Verification failed: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Error adding columns:', error);
  } finally {
    process.exit(0);
  }
}

addMissingColumns();

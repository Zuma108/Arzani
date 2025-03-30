import pool from '../../db/index.js';

/**
 * Fix conversation security issues by ensuring proper participant records
 * and cleaning up unauthorized access
 */
async function fixConversationSecurity() {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    console.log('Starting conversation security fix...');
    
    // 1. Create conversation_participants table if it doesn't exist
    const participantsExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'conversation_participants'
      )
    `);
    
    if (!participantsExists.rows[0].exists) {
      console.log('Creating conversation_participants table...');
      
      await client.query(`
        CREATE TABLE conversation_participants (
          id SERIAL PRIMARY KEY,
          conversation_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          joined_at TIMESTAMP DEFAULT NOW(),
          last_read_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(conversation_id, user_id)
        )
      `);
    }
    
    // 2. Find all conversations and messages to rebuild participant records
    console.log('Rebuilding conversation participant records...');
    
    // Get all conversations
    const conversationsResult = await client.query(`
      SELECT id FROM conversations
    `);
    
    for (const conversation of conversationsResult.rows) {
      const conversationId = conversation.id;
      
      // Find all users who have sent messages in this conversation
      const participantsResult = await client.query(`
        SELECT DISTINCT sender_id 
        FROM messages 
        WHERE conversation_id = $1
      `, [conversationId]);
      
      // Add each participant to the conversation_participants table
      for (const participant of participantsResult.rows) {
        const userId = participant.sender_id;
        
        await client.query(`
          INSERT INTO conversation_participants (conversation_id, user_id)
          VALUES ($1, $2)
          ON CONFLICT (conversation_id, user_id) DO NOTHING
        `, [conversationId, userId]);
      }
      
      console.log(`Processed conversation ${conversationId}: Added ${participantsResult.rows.length} participants`);
    }
    
    // 3. Add indexes for better performance
    console.log('Adding indexes for better performance...');
    
    // Add indexes to conversation_participants table
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id
      ON conversation_participants(user_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id
      ON conversation_participants(conversation_id)
    `);
    
    // 4. Verify all conversations have participants
    const orphanedConversations = await client.query(`
      SELECT c.id 
      FROM conversations c
      LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id
      WHERE cp.id IS NULL
    `);
    
    if (orphanedConversations.rows.length > 0) {
      console.log(`Found ${orphanedConversations.rows.length} conversations without participants. Adding system user...`);
      
      // Get system user ID or create one if it doesn't exist
      let systemUserId;
      const systemUserResult = await client.query(`
        SELECT id FROM users WHERE username = 'system' OR email = 'system@example.com' LIMIT 1
      `);
      
      if (systemUserResult.rows.length > 0) {
        systemUserId = systemUserResult.rows[0].id;
      } else {
        // Create system user
        const newSystemUserResult = await client.query(`
          INSERT INTO users (username, email, password, created_at)
          VALUES ('system', 'system@example.com', 'n/a', NOW())
          RETURNING id
        `);
        systemUserId = newSystemUserResult.rows[0].id;
      }
      
      // Add system user to orphaned conversations
      for (const conversation of orphanedConversations.rows) {
        await client.query(`
          INSERT INTO conversation_participants (conversation_id, user_id)
          VALUES ($1, $2)
        `, [conversation.id, systemUserId]);
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('Conversation security fix completed successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error fixing conversation security:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the migration if this file is executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  fixConversationSecurity()
    .then(() => {
      console.log('Conversation security migration completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

export default fixConversationSecurity;

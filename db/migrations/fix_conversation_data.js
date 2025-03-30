import pool from '../../db/index.js';

/**
 * Comprehensive conversation data fix
 * - Creates missing tables if needed
 * - Fixes user access to conversations
 * - Ensures conversation_participants records exist
 */
async function fixConversationData() {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    console.log('Starting conversation data fix...');
    
    // Step 1: Ensure all required tables exist
    console.log('Checking required tables...');
    
    // Check conversations table
    const conversationsExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'conversations'
      )
    `);
    
    if (!conversationsExists.rows[0].exists) {
      console.log('Creating conversations table...');
      await client.query(`
        CREATE TABLE conversations (
          id SERIAL PRIMARY KEY,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          is_group_chat BOOLEAN DEFAULT FALSE,
          group_name VARCHAR(255),
          business_id INTEGER
        )
      `);
    }
    
    // Check messages table
    const messagesExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'messages'
      )
    `);
    
    if (!messagesExists.rows[0].exists) {
      console.log('Creating messages table...');
      await client.query(`
        CREATE TABLE messages (
          id SERIAL PRIMARY KEY,
          conversation_id INTEGER REFERENCES conversations(id),
          sender_id INTEGER,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          is_system_message BOOLEAN DEFAULT FALSE,
          is_read BOOLEAN DEFAULT FALSE,
          attachment_url VARCHAR(500),
          voice_url VARCHAR(500)
        )
      `);
    }
    
    // Check conversation_participants table
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
          conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
          user_id INTEGER,
          joined_at TIMESTAMP DEFAULT NOW(),
          last_read_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(conversation_id, user_id)
        )
      `);
    }
    
    // Step 2: Fix conversation access by rebuilding participant records
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
      
      if (participantsResult.rows.length === 0) {
        console.log(`Warning: No messages found for conversation ${conversationId}`);
        continue;
      }
      
      // Add each participant to the conversation_participants table
      for (const participant of participantsResult.rows) {
        const userId = participant.sender_id;
        
        if (!userId) {
          console.log(`Warning: Invalid sender_id found in messages for conversation ${conversationId}`);
          continue;
        }
        
        await client.query(`
          INSERT INTO conversation_participants (conversation_id, user_id)
          VALUES ($1, $2)
          ON CONFLICT (conversation_id, user_id) DO NOTHING
        `, [conversationId, userId]);
      }
      
      // If this conversation is related to a business, add the business owner as participant
      const businessCheck = await client.query(`
        SELECT business_id FROM conversations WHERE id = $1 AND business_id IS NOT NULL
      `, [conversationId]);
      
      if (businessCheck.rows.length > 0 && businessCheck.rows[0].business_id) {
        const businessId = businessCheck.rows[0].business_id;
        
        // Get business owner
        const ownerCheck = await client.query(`
          SELECT user_id FROM businesses WHERE id = $1
        `, [businessId]);
        
        if (ownerCheck.rows.length > 0 && ownerCheck.rows[0].user_id) {
          const ownerId = ownerCheck.rows[0].user_id;
          
          // Add business owner to participants if not already added
          await client.query(`
            INSERT INTO conversation_participants (conversation_id, user_id)
            VALUES ($1, $2)
            ON CONFLICT (conversation_id, user_id) DO NOTHING
          `, [conversationId, ownerId]);
        }
      }
    }
    
    // Step 3: Add indexes for better performance
    console.log('Adding indexes for better query performance...');
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id 
      ON conversation_participants(user_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id 
      ON conversation_participants(conversation_id)
    `);
    
    // Step 4: Create trigger to automatically add message senders as participants
    console.log('Creating trigger for automatic participant management...');
    
    await client.query(`
      CREATE OR REPLACE FUNCTION add_sender_as_participant()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO conversation_participants (conversation_id, user_id, joined_at, last_read_at)
        VALUES (NEW.conversation_id, NEW.sender_id, NOW(), NOW())
        ON CONFLICT (conversation_id, user_id) DO NOTHING;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Check if trigger exists before creating
    const triggerExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'add_participant_on_message'
      )
    `);
    
    if (!triggerExists.rows[0].exists) {
      await client.query(`
        CREATE TRIGGER add_participant_on_message
        AFTER INSERT ON messages
        FOR EACH ROW
        EXECUTE FUNCTION add_sender_as_participant();
      `);
    }
    
    // Step 5: Update conversation timestamps to match latest message
    console.log('Updating conversation timestamps based on latest messages...');
    
    await client.query(`
      UPDATE conversations c
      SET updated_at = COALESCE(
        (SELECT MAX(created_at) FROM messages WHERE conversation_id = c.id),
        c.created_at
      )
    `);
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('Conversation data fix completed successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error fixing conversation data:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the migration
fixConversationData()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });

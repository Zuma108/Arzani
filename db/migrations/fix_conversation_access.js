import pool from '../../db/index.js';

/**
 * Migration script to fix conversation access issues
 * Ensures that all conversations have proper participant records
 * and removes any access to conversations that users shouldn't see
 */
async function fixConversationAccess() {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    console.log('Starting conversation access fix migration...');
    
    // 1. Ensure conversation_participants table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'conversation_participants'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
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
    
    // 2. Create indices if they don't exist
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id 
      ON conversation_participants(conversation_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id 
      ON conversation_participants(user_id)
    `);
    
    // 3. Find all conversations and ensure participants are properly recorded
    console.log('Finding all conversations...');
    
    const conversations = await client.query(`
      SELECT id FROM conversations
    `);
    
    console.log(`Found ${conversations.rows.length} conversations. Processing...`);
    
    let participantsAdded = 0;
    
    for (const conversation of conversations.rows) {
      const conversationId = conversation.id;
      
      // Find all users who have sent messages in this conversation
      const messagesQuery = await client.query(`
        SELECT DISTINCT sender_id 
        FROM messages 
        WHERE conversation_id = $1
      `, [conversationId]);
      
      // Get list of all participants
      const participants = messagesQuery.rows.map(row => row.sender_id);
      
      // Check business owner too, if business_id is present
      const businessCheck = await client.query(`
        SELECT business_id FROM conversations WHERE id = $1
      `, [conversationId]);
      
      if (businessCheck.rows[0] && businessCheck.rows[0].business_id) {
        const businessId = businessCheck.rows[0].business_id;
        
        const businessOwnerQuery = await client.query(`
          SELECT user_id FROM businesses WHERE id = $1
        `, [businessId]);
        
        if (businessOwnerQuery.rows[0]) {
          // Add business owner to participants if not already included
          const ownerId = businessOwnerQuery.rows[0].user_id;
          if (!participants.includes(ownerId)) {
            participants.push(ownerId);
          }
        }
      }
      
      // Ensure each participant is in the conversation_participants table
      for (const userId of participants) {
        const participantCheck = await client.query(`
          SELECT id FROM conversation_participants 
          WHERE conversation_id = $1 AND user_id = $2
        `, [conversationId, userId]);
        
        if (participantCheck.rows.length === 0) {
          await client.query(`
            INSERT INTO conversation_participants (conversation_id, user_id, joined_at, last_read_at)
            VALUES ($1, $2, NOW(), NOW())
          `, [conversationId, userId]);
          
          participantsAdded++;
        }
      }
    }
    
    console.log(`Added ${participantsAdded} missing participant records`);
    
    // 4. Create a trigger to automatically add message senders as participants
    await client.query(`
      CREATE OR REPLACE FUNCTION add_message_sender_as_participant()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO conversation_participants (conversation_id, user_id, joined_at, last_read_at)
        VALUES (NEW.conversation_id, NEW.sender_id, NOW(), NOW())
        ON CONFLICT (conversation_id, user_id) DO NOTHING;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Check if trigger already exists
    const triggerCheck = await client.query(`
      SELECT 1 FROM pg_trigger WHERE tgname = 'add_participant_on_message'
    `);
    
    if (triggerCheck.rows.length === 0) {
      await client.query(`
        CREATE TRIGGER add_participant_on_message
        AFTER INSERT ON messages
        FOR EACH ROW
        EXECUTE FUNCTION add_message_sender_as_participant();
      `);
      
      console.log('Created trigger to automatically add message senders as participants');
    }
    
    // Commit changes
    await client.query('COMMIT');
    
    console.log('Conversation access fix completed successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error fixing conversation access:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the migration
fixConversationAccess()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });

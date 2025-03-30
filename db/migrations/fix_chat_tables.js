import pool from '../../db/index.js';

/**
 * Migration to fix chat tables and ensure all required tables and columns exist
 */
async function fixChatTables() {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    console.log('Starting chat tables fix migration...');
    
    // 1. Check if conversations table exists
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
    
    // 2. Check if messages table exists
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
          conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
          sender_id INTEGER NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          is_system_message BOOLEAN DEFAULT FALSE,
          is_read BOOLEAN DEFAULT FALSE,
          attachment_url VARCHAR(500),
          voice_url VARCHAR(500)
        )
      `);
    } else {
      // Check if required columns exist in messages table
      console.log('Checking messages table columns...');
      
      const columns = await client.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'messages'
      `);
      
      const columnNames = columns.rows.map(col => col.column_name);
      console.log('Existing columns in messages table:', columnNames);
      
      // Add missing columns if needed
      const requiredColumns = [
        { name: 'is_system_message', type: 'BOOLEAN DEFAULT FALSE' },
        { name: 'is_read', type: 'BOOLEAN DEFAULT FALSE' },
        { name: 'attachment_url', type: 'VARCHAR(500)' },
        { name: 'voice_url', type: 'VARCHAR(500)' }
      ];
      
      for (const col of requiredColumns) {
        if (!columnNames.includes(col.name)) {
          console.log(`Adding ${col.name} column to messages table...`);
          await client.query(`ALTER TABLE messages ADD COLUMN ${col.name} ${col.type}`);
        }
      }
    }
    
    // 3. Check if conversation_participants table exists
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
          user_id INTEGER NOT NULL,
          joined_at TIMESTAMP DEFAULT NOW(),
          last_read_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(conversation_id, user_id)
        )
      `);
      
      // Copy message participants to the new table
      console.log('Adding existing message participants to conversation_participants table...');
      
      await client.query(`
        INSERT INTO conversation_participants (conversation_id, user_id)
        SELECT DISTINCT conversation_id, sender_id
        FROM messages
        ON CONFLICT (conversation_id, user_id) DO NOTHING
      `);
    }
    
    // 4. Add necessary indexes
    console.log('Creating indexes...');
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_conversation_id 
      ON messages(conversation_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_sender_id 
      ON messages(sender_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_conversation_participants_conv_id 
      ON conversation_participants(conversation_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id 
      ON conversation_participants(user_id)
    `);
    
    // 5. Create an auto-participant trigger
    console.log('Creating auto-participant trigger...');
    
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
    
    // Check if trigger exists
    const triggerExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'add_participant_on_message'
      )
    `);
    
    if (!triggerExists.rows[0].exists) {
      await client.query(`
        CREATE TRIGGER add_participant_on_message
        BEFORE INSERT ON messages
        FOR EACH ROW
        EXECUTE FUNCTION add_message_sender_as_participant();
      `);
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('Chat tables fix completed successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error fixing chat tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the migration
fixChatTables()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });

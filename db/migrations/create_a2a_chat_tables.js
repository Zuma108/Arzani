import pool from '../../db/index.js';

/**
 * Migration to create A2A-specific chat tables for persistent chat history
 * These tables are separate from the main chat system and specifically designed for A2A interactions
 */
async function createA2AChatTables() {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    console.log('Starting A2A chat tables creation...');
    
    // 1. Create a2a_chat_sessions table
    const sessionTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'a2a_chat_sessions'
      )
    `);
    
    if (!sessionTableExists.rows[0].exists) {
      console.log('Creating a2a_chat_sessions table...');
      await client.query(`
        CREATE TABLE a2a_chat_sessions (
          id SERIAL PRIMARY KEY,
          session_id VARCHAR(255) UNIQUE NOT NULL,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          agent_type VARCHAR(100) NOT NULL DEFAULT 'orchestrator',
          session_title VARCHAR(500),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          is_active BOOLEAN DEFAULT TRUE,
          metadata JSONB DEFAULT '{}'::jsonb
        )
      `);
    } else {
      console.log('a2a_chat_sessions table already exists');
    }
    
    // 2. Create a2a_chat_messages table
    const messagesTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'a2a_chat_messages'
      )
    `);
    
    if (!messagesTableExists.rows[0].exists) {
      console.log('Creating a2a_chat_messages table...');
      await client.query(`
        CREATE TABLE a2a_chat_messages (
          id SERIAL PRIMARY KEY,
          session_id VARCHAR(255) NOT NULL REFERENCES a2a_chat_sessions(session_id) ON DELETE CASCADE,
          message_type VARCHAR(50) NOT NULL CHECK (message_type IN ('user', 'assistant', 'system')),
          content TEXT NOT NULL,
          agent_type VARCHAR(100),
          task_id VARCHAR(255),
          timestamp TIMESTAMP DEFAULT NOW(),
          metadata JSONB DEFAULT '{}'::jsonb,
          message_order INTEGER NOT NULL DEFAULT 0
        )
      `);
    } else {
      console.log('a2a_chat_messages table already exists');
    }
    
    // 3. Create indexes for better performance
    console.log('Creating indexes for A2A chat tables...');
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_a2a_chat_sessions_session_id 
      ON a2a_chat_sessions(session_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_a2a_chat_sessions_user_id 
      ON a2a_chat_sessions(user_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_a2a_chat_sessions_updated_at 
      ON a2a_chat_sessions(updated_at)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_a2a_chat_messages_session_id 
      ON a2a_chat_messages(session_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_a2a_chat_messages_timestamp 
      ON a2a_chat_messages(timestamp)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_a2a_chat_messages_order 
      ON a2a_chat_messages(session_id, message_order)
    `);
    
    // 4. Create trigger to update session updated_at when messages are added
    console.log('Creating trigger for automatic session timestamp updates...');
    
    await client.query(`
      CREATE OR REPLACE FUNCTION update_a2a_session_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        UPDATE a2a_chat_sessions
        SET updated_at = NOW()
        WHERE session_id = NEW.session_id;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Check if trigger exists before creating
    const triggerExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_a2a_session_on_message'
      )
    `);
    
    if (!triggerExists.rows[0].exists) {
      await client.query(`
        CREATE TRIGGER update_a2a_session_on_message
        AFTER INSERT ON a2a_chat_messages
        FOR EACH ROW
        EXECUTE FUNCTION update_a2a_session_timestamp();
      `);
      console.log('Created trigger for A2A session timestamp updates');
    }
    
    // 5. Add some initial data constraints
    await client.query(`
      ALTER TABLE a2a_chat_messages 
      ADD CONSTRAINT check_content_not_empty 
      CHECK (length(trim(content)) > 0)
    `);
    
    await client.query(`
      ALTER TABLE a2a_chat_sessions 
      ADD CONSTRAINT check_session_id_not_empty 
      CHECK (length(trim(session_id)) > 0)
    `);
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('A2A chat tables created successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating A2A chat tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the migration if this file is executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  createA2AChatTables()
    .then(() => {
      console.log('A2A chat tables migration completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('A2A chat tables migration failed:', error);
      process.exit(1);
    });
}

export default createA2AChatTables;

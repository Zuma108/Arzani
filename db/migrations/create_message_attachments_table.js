import pool from '../index.js';

export async function up() {
  try {
    console.log('Connected to PostgreSQL database');
    
    // First check if the users table exists
    const usersCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (!usersCheck.rows[0].exists) {
      console.error('The users table does not exist. Cannot create message_attachments with foreign key to users.');
      return false;
    }
    
    // Check if messages table exists
    const messagesCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'messages'
      );
    `);
    
    if (!messagesCheck.rows[0].exists) {
      console.error('The messages table does not exist. Cannot create message_attachments with foreign key to messages.');
      return false;
    }
    
    // Check if conversations table exists
    const conversationsCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'conversations'
      );
    `);
    
    if (!conversationsCheck.rows[0].exists) {
      console.error('The conversations table does not exist. Cannot create message_attachments with foreign key to conversations.');
      return false;
    }
    
    // Check if message_attachments table already exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'message_attachments'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('message_attachments table already exists, skipping creation');
    } else {
      // Create the table
      await pool.query(`
        CREATE TABLE message_attachments (
          id SERIAL PRIMARY KEY,
          message_id INTEGER,
          user_id INTEGER NOT NULL,
          file_name VARCHAR(255) NOT NULL,
          original_name VARCHAR(255) NOT NULL,
          file_url TEXT NOT NULL,
          file_type VARCHAR(100),
          file_size BIGINT,
          conversation_id INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        );
      `);
      
      console.log('Created message_attachments table');
    }
    
    // Check each index separately
    try {
      // Check if the message_id index exists
      const messageIdIndexCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM pg_indexes 
          WHERE tablename = 'message_attachments' 
          AND indexname = 'idx_message_attachments_message_id'
        );
      `);
      
      if (!messageIdIndexCheck.rows[0].exists) {
        await pool.query(`
          CREATE INDEX idx_message_attachments_message_id ON message_attachments(message_id);
        `);
        console.log('Created message_id index');
      }
    } catch (error) {
      console.error('Error creating message_id index:', error.message);
    }
    
    try {
      // Check if the user_id index exists
      const userIdIndexCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM pg_indexes 
          WHERE tablename = 'message_attachments' 
          AND indexname = 'idx_message_attachments_user_id'
        );
      `);
      
      if (!userIdIndexCheck.rows[0].exists) {
        await pool.query(`
          CREATE INDEX idx_message_attachments_user_id ON message_attachments(user_id);
        `);
        console.log('Created user_id index');
      }
    } catch (error) {
      console.error('Error creating user_id index:', error.message);
    }
    
    try {
      // Check if the conversation_id index exists
      const conversationIdIndexCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM pg_indexes 
          WHERE tablename = 'message_attachments' 
          AND indexname = 'idx_message_attachments_conversation_id'
        );
      `);
      
      if (!conversationIdIndexCheck.rows[0].exists) {
        await pool.query(`
          CREATE INDEX idx_message_attachments_conversation_id ON message_attachments(conversation_id);
        `);
        console.log('Created conversation_id index');
      }
    } catch (error) {
      console.error('Error creating conversation_id index:', error.message);
    }
    
    // Modify messages table to add message_type column if it doesn't exist
    try {
      const result = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'message_type'
      `);
      
      if (result.rows.length === 0) {
        await pool.query(`
          ALTER TABLE messages
          ADD COLUMN message_type VARCHAR(50) DEFAULT 'text'
        `);
        console.log('Added message_type column to messages table');
      } else {
        console.log('message_type column already exists in messages table');
      }
    } catch (error) {
      console.error('Error modifying messages table:', error.message);
    }
    
    return true;
  } catch (error) {
    console.error('Migration error:', error);
    return false;
  }
}

export async function down() {
  try {
    // Drop indexes first
    try {
      await pool.query('DROP INDEX IF EXISTS idx_message_attachments_message_id');
      await pool.query('DROP INDEX IF EXISTS idx_message_attachments_user_id');
      await pool.query('DROP INDEX IF EXISTS idx_message_attachments_conversation_id');
      console.log('Dropped message_attachments indexes');
    } catch (indexError) {
      console.error('Error dropping indexes:', indexError.message);
    }
    
    // Drop table
    await pool.query('DROP TABLE IF EXISTS message_attachments');
    console.log('Dropped message_attachments table');
    
    // Try to drop the message_type column if it exists
    try {
      // Check if the column exists first
      const columnCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'message_type'
      `);
      
      if (columnCheck.rows.length > 0) {
        await pool.query(`
          ALTER TABLE messages DROP COLUMN message_type
        `);
        console.log('Dropped message_type column from messages table');
      }
    } catch (columnError) {
      console.error('Error dropping message_type column:', columnError.message);
    }
    
    return true;
  } catch (error) {
    console.error('Migration rollback error:', error);
    return false;
  }
}

// Run migration if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  up()
    .then(result => {
      console.log('Migration result:', result);
      process.exit(result ? 0 : 1);
    })
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

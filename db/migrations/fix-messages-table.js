import pool from '../../db/index.js';

/**
 * Repairs the messages table by ensuring all required columns exist
 * and fixing any issues with data integrity
 */
async function fixMessagesTable() {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    // Check if the messages table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'messages'
      )
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('Messages table does not exist, creating it...');
      
      // Create messages table
      await client.query(`
        CREATE TABLE messages (
          id SERIAL PRIMARY KEY,
          conversation_id INTEGER NOT NULL,
          sender_id INTEGER NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          is_read BOOLEAN DEFAULT FALSE,
          is_system_message BOOLEAN DEFAULT FALSE,
          attachment_url VARCHAR(500),
          voice_url VARCHAR(500)
        )
      `);
      
      console.log('Messages table created successfully');
    } else {
      console.log('Messages table exists, checking columns...');
      
      // Get current columns
      const columns = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'messages'
      `);
      
      const columnNames = columns.rows.map(col => col.column_name);
      console.log('Existing columns:', columnNames);
      
      // List of required columns and their types
      const requiredColumns = [
        { name: 'id', type: 'integer' },
        { name: 'conversation_id', type: 'integer' },
        { name: 'sender_id', type: 'integer' },
        { name: 'content', type: 'text' },
        { name: 'created_at', type: 'timestamp without time zone' },
        { name: 'is_read', type: 'boolean' },
        { name: 'is_system_message', type: 'boolean' },
        { name: 'attachment_url', type: 'character varying' },
        { name: 'voice_url', type: 'character varying' }
      ];
      
      // Add missing columns
      for (const col of requiredColumns) {
        if (!columnNames.includes(col.name)) {
          console.log(`Adding missing column: ${col.name}`);
          
          let defaultValue = '';
          if (col.type === 'boolean') {
            defaultValue = 'DEFAULT FALSE';
          } else if (col.type === 'timestamp without time zone') {
            defaultValue = 'DEFAULT NOW()';
          }
          
          await client.query(`
            ALTER TABLE messages 
            ADD COLUMN ${col.name} ${col.type} ${defaultValue}
          `);
          
          console.log(`Added column ${col.name}`);
        }
      }
    }
    
    // Check if conversation_participants table exists, create if not
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
      
      // Add existing participants from messages
      console.log('Adding existing participants from messages...');
      
      await client.query(`
        INSERT INTO conversation_participants (conversation_id, user_id)
        SELECT DISTINCT conversation_id, sender_id
        FROM messages
        ON CONFLICT (conversation_id, user_id) DO NOTHING
      `);
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('Messages table fixed successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error fixing messages table:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the migration if this file is executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  fixMessagesTable()
    .then(() => {
      console.log('Messages table migration completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

export default fixMessagesTable;

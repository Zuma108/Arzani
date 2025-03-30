import pool from '../../db/index.js';

/**
 * Updates the chat schema to include missing columns and improve user role differentiation
 */
async function updateChatSchema() {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    // 1. Check if role_id column exists in users table, add if not
    const usersCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'role_id'
    `);
    
    if (usersCheck.rows.length === 0) {
      console.log('Adding role_id column to users table...');
      
      // Create user_roles table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_roles (
          id SERIAL PRIMARY KEY,
          name VARCHAR(50) NOT NULL UNIQUE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // Insert default roles
      await client.query(`
        INSERT INTO user_roles (name) 
        VALUES ('user'), ('business_owner'), ('admin')
        ON CONFLICT (name) DO NOTHING
      `);
      
      // Add role_id to users table
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES user_roles(id)
      `);
      
      // Set default role for existing users
      await client.query(`
        UPDATE users 
        SET role_id = (SELECT id FROM user_roles WHERE name = 'user')
        WHERE role_id IS NULL
      `);
    }
    
    // 2. Add missing columns to messages table
    const messageColumns = [
      { name: 'attachment_url', type: 'VARCHAR(500)' },
      { name: 'voice_url', type: 'VARCHAR(500)' },
    ];
    
    for (const column of messageColumns) {
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = $1
      `, [column.name]);
      
      if (columnCheck.rows.length === 0) {
        console.log(`Adding ${column.name} column to messages table...`);
        await client.query(`
          ALTER TABLE messages 
          ADD COLUMN ${column.name} ${column.type}
        `);
      }
    }
    
    // 3. Update conversation_participants table to include last_read_at
    const participantsCheck = await client.query(`
      SELECT to_regclass('public.conversation_participants') as exists
    `);
    
    if (!participantsCheck.rows[0].exists) {
      console.log('Creating conversation_participants table...');
      await client.query(`
        CREATE TABLE conversation_participants (
          id SERIAL PRIMARY KEY,
          conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          joined_at TIMESTAMP DEFAULT NOW(),
          last_read_at TIMESTAMP DEFAULT NOW(),
          is_active BOOLEAN DEFAULT TRUE,
          UNIQUE(conversation_id, user_id)
        )
      `);
      
      // Migrate existing conversations to the participants table
      console.log('Migrating existing conversations to participants table...');
      
      // For each conversation, add both business owner and inquirer
      const conversations = await client.query(`
        SELECT id, user_id as inquirer_id, business_id FROM conversations
      `);
      
      for (const conv of conversations.rows) {
        // Get business owner
        if (conv.business_id) {
          const business = await client.query(`
            SELECT user_id as owner_id FROM businesses WHERE id = $1
          `, [conv.business_id]);
          
          if (business.rows.length > 0) {
            const ownerId = business.rows[0].owner_id;
            
            // Add conversation participants
            await client.query(`
              INSERT INTO conversation_participants (conversation_id, user_id)
              VALUES ($1, $2), ($1, $3)
              ON CONFLICT (conversation_id, user_id) DO NOTHING
            `, [conv.id, conv.inquirer_id, ownerId]);
          }
        }
      }
    } else {
      // Check if last_read_at exists
      const lastReadCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'conversation_participants' AND column_name = 'last_read_at'
      `);
      
      if (lastReadCheck.rows.length === 0) {
        console.log('Adding last_read_at column to conversation_participants table...');
        await client.query(`
          ALTER TABLE conversation_participants 
          ADD COLUMN last_read_at TIMESTAMP DEFAULT NOW()
        `);
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('Chat schema update completed successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating chat schema:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the migration if this file is executed directly
// Fix: Replace CommonJS require.main check with ES module approach
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  updateChatSchema()
    .then(() => {
      console.log('Chat schema migration completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

export default updateChatSchema;

import pool from '../../db/index.js';

/**
 * Diagnostic tool to fix and report conversation access issues
 * Can be run with a specific conversation ID to diagnose issues
 */
async function fixConversationAccessDiagnostic(targetConversationId = null) {
  const client = await pool.connect();
  const results = {
    tablesChecked: {},
    accessFixed: [],
    errors: [],
    conversationsProcessed: 0
  };
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    console.log('Starting conversation access diagnostic...');
    
    // 1. Check for required tables
    const requiredTables = ['conversations', 'messages', 'conversation_participants', 'users'];
    
    for (const table of requiredTables) {
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        ) as exists
      `, [table]);
      
      results.tablesChecked[table] = tableCheck.rows[0].exists;
      
      if (!tableCheck.rows[0].exists) {
        const error = `Required table '${table}' does not exist`;
        results.errors.push(error);
        console.error(error);
      }
    }
    
    // Early return if critical tables don't exist
    if (!results.tablesChecked['conversations'] || !results.tablesChecked['messages']) {
      const error = 'Critical tables missing, cannot proceed';
      results.errors.push(error);
      console.error(error);
      await client.query('ROLLBACK');
      return results;
    }
    
    // Create conversation_participants table if it doesn't exist
    if (!results.tablesChecked['conversation_participants']) {
      console.log('Creating missing conversation_participants table...');
      
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
      
      await client.query(`
        CREATE INDEX idx_conversation_participants_conversation_id
        ON conversation_participants(conversation_id)
      `);
      
      await client.query(`
        CREATE INDEX idx_conversation_participants_user_id
        ON conversation_participants(user_id)
      `);
      
      results.tablesChecked['conversation_participants'] = true;
    }
    
    // 2. Get conversations to check
    let conversationsQuery;
    let queryParams = [];
    
    if (targetConversationId) {
      // If a specific conversation ID was provided, only check that one
      conversationsQuery = `SELECT id FROM conversations WHERE id = $1`;
      queryParams = [targetConversationId];
      console.log(`Checking specific conversation ID: ${targetConversationId}`);
    } else {
      // Otherwise check all conversations
      conversationsQuery = `SELECT id FROM conversations`;
      console.log('Checking all conversations');
    }
    
    const conversationsResult = await client.query(conversationsQuery, queryParams);
    console.log(`Found ${conversationsResult.rows.length} conversations to check`);
    
    // 3. Process each conversation
    for (const conversation of conversationsResult.rows) {
      const conversationId = conversation.id;
      results.conversationsProcessed++;
      
      console.log(`Processing conversation ID: ${conversationId}`);
      
      // 3.1 Get all the users who have sent messages in this conversation
      const messagesQuery = `
        SELECT DISTINCT sender_id FROM messages 
        WHERE conversation_id = $1 AND sender_id IS NOT NULL
      `;
      
      const messagesResult = await client.query(messagesQuery, [conversationId]);
      const messageSenders = messagesResult.rows.map(row => row.sender_id);
      
      console.log(`Found ${messageSenders.length} message senders in conversation ${conversationId}`);
      
      // 3.2 Get all current participants
      const participantsQuery = `
        SELECT user_id FROM conversation_participants 
        WHERE conversation_id = $1
      `;
      
      const participantsResult = await client.query(participantsQuery, [conversationId]);
      const currentParticipants = participantsResult.rows.map(row => row.user_id);
      
      console.log(`Found ${currentParticipants.length} current participants in conversation ${conversationId}`);
      
      // 3.3 Identify missing participants (users who sent messages but aren't listed as participants)
      const missingParticipants = messageSenders.filter(id => !currentParticipants.includes(id));
      
      console.log(`Found ${missingParticipants.length} missing participants in conversation ${conversationId}`);
      
      // 3.4 Add missing participants
      for (const userId of missingParticipants) {
        console.log(`Adding missing participant user ${userId} to conversation ${conversationId}`);
        
        await client.query(`
          INSERT INTO conversation_participants (conversation_id, user_id, joined_at, last_read_at)
          VALUES ($1, $2, NOW(), NOW())
          ON CONFLICT (conversation_id, user_id) DO NOTHING
        `, [conversationId, userId]);
        
        results.accessFixed.push({
          conversationId,
          userId,
          action: 'added_missing_participant'
        });
      }
      
      // 3.5 Check if this conversation is related to a business
      const businessQuery = `
        SELECT business_id FROM conversations WHERE id = $1 AND business_id IS NOT NULL
      `;
      
      const businessResult = await client.query(businessQuery, [conversationId]);
      
      if (businessResult.rows.length > 0 && businessResult.rows[0].business_id) {
        const businessId = businessResult.rows[0].business_id;
        
        console.log(`Conversation ${conversationId} is related to business ${businessId}`);
        
        // Get business owner
        const ownerQuery = `
          SELECT user_id FROM businesses WHERE id = $1
        `;
        
        const ownerResult = await client.query(ownerQuery, [businessId]);
        
        if (ownerResult.rows.length > 0 && ownerResult.rows[0].user_id) {
          const ownerId = ownerResult.rows[0].user_id;
          
          // Check if owner is already a participant
          if (!currentParticipants.includes(ownerId)) {
            console.log(`Adding business owner ${ownerId} to conversation ${conversationId}`);
            
            await client.query(`
              INSERT INTO conversation_participants (conversation_id, user_id, joined_at, last_read_at)
              VALUES ($1, $2, NOW(), NOW())
              ON CONFLICT (conversation_id, user_id) DO NOTHING
            `, [conversationId, ownerId]);
            
            results.accessFixed.push({
              conversationId,
              userId: ownerId,
              action: 'added_business_owner'
            });
          }
        }
      }
    }
    
    // 4. Create/update auto-participant trigger
    console.log('Ensuring auto-participant trigger exists...');
    
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
    
    const triggerCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'add_participant_on_message'
      ) AS exists
    `);
    
    if (!triggerCheck.rows[0].exists) {
      await client.query(`
        CREATE TRIGGER add_participant_on_message
        BEFORE INSERT ON messages
        FOR EACH ROW
        EXECUTE FUNCTION add_message_sender_as_participant();
      `);
      
      console.log('Created add_participant_on_message trigger');
    } else {
      console.log('add_participant_on_message trigger already exists');
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('Conversation access diagnostic completed successfully');
    return results;
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during conversation access diagnostic:', error);
    results.errors.push(error.message);
    return results;
  } finally {
    client.release();
  }
}

// Allow running this script with a specific conversation ID
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const targetConversationId = process.argv[2] ? parseInt(process.argv[2]) : null;
  
  // Run fix
  fixConversationAccessDiagnostic(targetConversationId)
    .then(results => {
      console.log('===== DIAGNOSTIC RESULTS =====');
      console.log(`Tables checked: ${Object.entries(results.tablesChecked).map(([table, exists]) => `${table}: ${exists ? 'OK' : 'MISSING'}`).join(', ')}`);
      console.log(`Conversations processed: ${results.conversationsProcessed}`);
      console.log(`Access issues fixed: ${results.accessFixed.length}`);
      console.log(`Errors: ${results.errors.length}`);
      
      if (results.accessFixed.length > 0) {
        console.log('\nAccess fixes:');
        results.accessFixed.forEach(fix => {
          console.log(`- Conversation ${fix.conversationId}: ${fix.action} for user ${fix.userId}`);
        });
      }
      
      if (results.errors.length > 0) {
        console.log('\nErrors:');
        results.errors.forEach(error => {
          console.log(`- ${error}`);
        });
      }
      
      process.exit(0);
    })
    .catch(err => {
      console.error('Script failed:', err);
      process.exit(1);
    });
}

export default fixConversationAccessDiagnostic;

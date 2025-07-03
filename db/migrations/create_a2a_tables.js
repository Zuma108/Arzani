import pool from '../index.js';

/**
 * Migration to create A2A (Agent-to-Agent) protocol specific tables
 * This creates tables for A2A task persistence, message logging, and agent interactions
 */
export async function up() {
  const client = await pool.connect();
  
  try {
    console.log('Starting A2A tables migration...');
    await client.query('BEGIN');

    // 1. Create a2a_tasks table for task state persistence
    const a2aTasksExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'a2a_tasks'
      )
    `);

    if (!a2aTasksExists.rows[0].exists) {
      console.log('Creating a2a_tasks table...');
      await client.query(`
        CREATE TABLE a2a_tasks (
          id SERIAL PRIMARY KEY,
          task_id VARCHAR(255) UNIQUE NOT NULL,
          session_id VARCHAR(255) NOT NULL,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          task_type VARCHAR(100) NOT NULL,
          task_description TEXT NOT NULL,
          task_context JSONB DEFAULT '{}',
          task_state VARCHAR(50) DEFAULT 'pending',
          progress_data JSONB DEFAULT '{}',
          assigned_agents JSONB DEFAULT '[]',
          current_agent VARCHAR(100),
          priority VARCHAR(20) DEFAULT 'medium',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          started_at TIMESTAMP,
          completed_at TIMESTAMP,
          error_data JSONB,
          metadata JSONB DEFAULT '{}'
        )
      `);

      // Create indexes for a2a_tasks
      await client.query(`
        CREATE INDEX idx_a2a_tasks_task_id ON a2a_tasks(task_id);
        CREATE INDEX idx_a2a_tasks_session_id ON a2a_tasks(session_id);
        CREATE INDEX idx_a2a_tasks_user_id ON a2a_tasks(user_id);
        CREATE INDEX idx_a2a_tasks_state ON a2a_tasks(task_state);
        CREATE INDEX idx_a2a_tasks_type ON a2a_tasks(task_type);
        CREATE INDEX idx_a2a_tasks_created_at ON a2a_tasks(created_at);
      `);

      console.log('✅ a2a_tasks table created successfully');
    } else {
      console.log('a2a_tasks table already exists, skipping creation');
    }

    // 2. Create a2a_messages table for A2A protocol message logging
    const a2aMessagesExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'a2a_messages'
      )
    `);

    if (!a2aMessagesExists.rows[0].exists) {
      console.log('Creating a2a_messages table...');
      await client.query(`
        CREATE TABLE a2a_messages (
          id SERIAL PRIMARY KEY,
          message_id VARCHAR(255) UNIQUE NOT NULL,
          task_id VARCHAR(255) REFERENCES a2a_tasks(task_id) ON DELETE CASCADE,
          session_id VARCHAR(255) NOT NULL,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          sender_type VARCHAR(50) NOT NULL, -- 'user', 'agent', 'system', 'orchestrator'
          sender_agent VARCHAR(100), -- specific agent name if sender_type is 'agent'
          receiver_type VARCHAR(50), -- 'user', 'agent', 'system', 'orchestrator'
          receiver_agent VARCHAR(100), -- specific agent name if receiver_type is 'agent'
          message_type VARCHAR(50) NOT NULL, -- 'task_request', 'task_response', 'progress_update', 'error', 'completion'
          content TEXT NOT NULL,
          structured_data JSONB DEFAULT '{}',
          attachments JSONB DEFAULT '[]',
          protocol_version VARCHAR(20) DEFAULT '1.0',
          classification_data JSONB, -- stores AI classification results
          processing_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          processed_at TIMESTAMP,
          metadata JSONB DEFAULT '{}'
        )
      `);

      // Create indexes for a2a_messages
      await client.query(`
        CREATE INDEX idx_a2a_messages_message_id ON a2a_messages(message_id);
        CREATE INDEX idx_a2a_messages_task_id ON a2a_messages(task_id);
        CREATE INDEX idx_a2a_messages_session_id ON a2a_messages(session_id);
        CREATE INDEX idx_a2a_messages_user_id ON a2a_messages(user_id);
        CREATE INDEX idx_a2a_messages_sender_type ON a2a_messages(sender_type);
        CREATE INDEX idx_a2a_messages_message_type ON a2a_messages(message_type);
        CREATE INDEX idx_a2a_messages_created_at ON a2a_messages(created_at);
        CREATE INDEX idx_a2a_messages_processing_status ON a2a_messages(processing_status);
      `);

      console.log('✅ a2a_messages table created successfully');
    } else {
      console.log('a2a_messages table already exists, skipping creation');
    }

    // 3. Create a2a_agent_interactions table for detailed agent interaction tracking
    const a2aInteractionsExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'a2a_agent_interactions'
      )
    `);

    if (!a2aInteractionsExists.rows[0].exists) {
      console.log('Creating a2a_agent_interactions table...');
      await client.query(`
        CREATE TABLE a2a_agent_interactions (
          id SERIAL PRIMARY KEY,
          interaction_id VARCHAR(255) UNIQUE NOT NULL,
          task_id VARCHAR(255) REFERENCES a2a_tasks(task_id) ON DELETE CASCADE,
          message_id VARCHAR(255) REFERENCES a2a_messages(message_id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          agent_name VARCHAR(100) NOT NULL,
          action_type VARCHAR(100) NOT NULL, -- 'task_assignment', 'analysis', 'processing', 'response_generation'
          input_data JSONB,
          output_data JSONB,
          execution_time_ms INTEGER,
          tokens_used INTEGER DEFAULT 0,
          success BOOLEAN DEFAULT true,
          error_message TEXT,
          confidence_score DECIMAL(3,2), -- 0.00-1.00 confidence score
          reasoning TEXT, -- AI reasoning or explanation
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          completed_at TIMESTAMP,
          metadata JSONB DEFAULT '{}'
        )
      `);

      // Create indexes for a2a_agent_interactions
      await client.query(`
        CREATE INDEX idx_a2a_interactions_interaction_id ON a2a_agent_interactions(interaction_id);
        CREATE INDEX idx_a2a_interactions_task_id ON a2a_agent_interactions(task_id);
        CREATE INDEX idx_a2a_interactions_message_id ON a2a_agent_interactions(message_id);
        CREATE INDEX idx_a2a_interactions_user_id ON a2a_agent_interactions(user_id);
        CREATE INDEX idx_a2a_interactions_agent_name ON a2a_agent_interactions(agent_name);
        CREATE INDEX idx_a2a_interactions_action_type ON a2a_agent_interactions(action_type);
        CREATE INDEX idx_a2a_interactions_created_at ON a2a_agent_interactions(created_at);
        CREATE INDEX idx_a2a_interactions_success ON a2a_agent_interactions(success);
      `);

      console.log('✅ a2a_agent_interactions table created successfully');
    } else {
      console.log('a2a_agent_interactions table already exists, skipping creation');
    }

    // 4. Create a2a_session_state table for session persistence
    const a2aSessionExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'a2a_session_state'
      )
    `);

    if (!a2aSessionExists.rows[0].exists) {
      console.log('Creating a2a_session_state table...');
      await client.query(`
        CREATE TABLE a2a_session_state (
          id SERIAL PRIMARY KEY,
          session_id VARCHAR(255) UNIQUE NOT NULL,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          conversation_id INTEGER REFERENCES conversations(id) ON DELETE SET NULL,
          active_tasks JSONB DEFAULT '[]',
          session_context JSONB DEFAULT '{}',
          orchestrator_state JSONB DEFAULT '{}',
          last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP,
          is_active BOOLEAN DEFAULT true,
          metadata JSONB DEFAULT '{}'
        )
      `);

      // Create indexes for a2a_session_state
      await client.query(`
        CREATE INDEX idx_a2a_session_session_id ON a2a_session_state(session_id);
        CREATE INDEX idx_a2a_session_user_id ON a2a_session_state(user_id);
        CREATE INDEX idx_a2a_session_conversation_id ON a2a_session_state(conversation_id);
        CREATE INDEX idx_a2a_session_is_active ON a2a_session_state(is_active);
        CREATE INDEX idx_a2a_session_last_activity ON a2a_session_state(last_activity);
        CREATE INDEX idx_a2a_session_expires_at ON a2a_session_state(expires_at);
      `);

      console.log('✅ a2a_session_state table created successfully');
    } else {
      console.log('a2a_session_state table already exists, skipping creation');
    }

    // 5. Create triggers for updating updated_at timestamps
    console.log('Creating update timestamp triggers...');
    
    // Create or replace the trigger function
    await client.query(`
      CREATE OR REPLACE FUNCTION update_a2a_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create triggers for each table
    const tablesWithUpdatedAt = ['a2a_tasks', 'a2a_session_state'];
    
    for (const table of tablesWithUpdatedAt) {
      await client.query(`
        DROP TRIGGER IF EXISTS update_${table}_timestamp ON ${table};
        CREATE TRIGGER update_${table}_timestamp
        BEFORE UPDATE ON ${table}
        FOR EACH ROW
        EXECUTE FUNCTION update_a2a_timestamp();
      `);
    }

    // 6. Create a view for active A2A sessions with tasks
    await client.query(`
      CREATE OR REPLACE VIEW a2a_active_sessions AS
      SELECT 
        s.session_id,
        s.user_id,
        s.conversation_id,
        s.last_activity,
        s.created_at as session_created,
        COUNT(t.id) as active_task_count,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'task_id', t.task_id,
              'task_type', t.task_type,
              'task_state', t.task_state,
              'current_agent', t.current_agent,
              'created_at', t.created_at
            )
            ORDER BY t.created_at DESC
          ) FILTER (WHERE t.id IS NOT NULL), 
          '[]'::json
        ) as tasks
      FROM a2a_session_state s
      LEFT JOIN a2a_tasks t ON s.session_id = t.session_id 
        AND t.task_state IN ('pending', 'processing', 'active')
      WHERE s.is_active = true
        AND s.expires_at > CURRENT_TIMESTAMP
      GROUP BY s.session_id, s.user_id, s.conversation_id, s.last_activity, s.created_at
      ORDER BY s.last_activity DESC;
    `);

    console.log('✅ A2A active sessions view created successfully');

    await client.query('COMMIT');
    console.log('🎉 A2A tables migration completed successfully!');
    
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ A2A tables migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function down() {
  const client = await pool.connect();
  
  try {
    console.log('Rolling back A2A tables migration...');
    await client.query('BEGIN');

    // Drop view
    await client.query('DROP VIEW IF EXISTS a2a_active_sessions');
    
    // Drop triggers and function
    await client.query('DROP TRIGGER IF EXISTS update_a2a_tasks_timestamp ON a2a_tasks');
    await client.query('DROP TRIGGER IF EXISTS update_a2a_session_state_timestamp ON a2a_session_state');
    await client.query('DROP FUNCTION IF EXISTS update_a2a_timestamp()');
    
    // Drop tables in reverse order due to foreign key constraints
    await client.query('DROP TABLE IF EXISTS a2a_agent_interactions CASCADE');
    await client.query('DROP TABLE IF EXISTS a2a_messages CASCADE');
    await client.query('DROP TABLE IF EXISTS a2a_session_state CASCADE');
    await client.query('DROP TABLE IF EXISTS a2a_tasks CASCADE');

    await client.query('COMMIT');
    console.log('✅ A2A tables migration rollback completed');
    
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ A2A tables migration rollback failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
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

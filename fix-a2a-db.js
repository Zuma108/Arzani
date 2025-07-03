import pool from './db.js';

async function fixA2ADatabase() {
  try {
    console.log('🔧 Fixing A2A Database Issues...');
    
    // 1. Add missing 'last_accessed' column to a2a_session_context
    console.log('1. Adding last_accessed column to a2a_session_context...');
    try {
      await pool.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'a2a_session_context' AND column_name = 'last_accessed'
            ) THEN
                ALTER TABLE a2a_session_context 
                ADD COLUMN last_accessed TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;
                
                UPDATE a2a_session_context 
                SET last_accessed = COALESCE(last_activity, updated_at, created_at, NOW());
                
                RAISE NOTICE 'Added last_accessed column to a2a_session_context';
            ELSE
                RAISE NOTICE 'last_accessed column already exists in a2a_session_context';
            END IF;
        END $$;
      `);
      console.log('✅ last_accessed column handled successfully');
    } catch (error) {
      console.log('⚠️  last_accessed column fix failed:', error.message);
    }

    // 2. Add missing 'initial_query' column to a2a_tasks
    console.log('2. Adding initial_query column to a2a_tasks...');
    try {
      await pool.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'a2a_tasks' AND column_name = 'initial_query'
            ) THEN
                ALTER TABLE a2a_tasks 
                ADD COLUMN initial_query TEXT DEFAULT 'Legacy task - query not recorded';
                
                RAISE NOTICE 'Added initial_query column to a2a_tasks';
            ELSE
                RAISE NOTICE 'initial_query column already exists in a2a_tasks';
            END IF;
        END $$;
      `);
      console.log('✅ initial_query column handled successfully');
    } catch (error) {
      console.log('⚠️  initial_query column fix failed:', error.message);
    }

    // 3. Add missing 'primary_agent' column to a2a_tasks
    console.log('3. Adding primary_agent column to a2a_tasks...');
    try {
      await pool.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'a2a_tasks' AND column_name = 'primary_agent'
            ) THEN
                ALTER TABLE a2a_tasks 
                ADD COLUMN primary_agent VARCHAR(100) DEFAULT 'orchestrator';
                
                UPDATE a2a_tasks 
                SET primary_agent = COALESCE(current_agent, 'orchestrator')
                WHERE primary_agent IS NULL;
                
                ALTER TABLE a2a_tasks 
                ALTER COLUMN primary_agent SET NOT NULL;
                
                RAISE NOTICE 'Added primary_agent column to a2a_tasks';
            ELSE
                RAISE NOTICE 'primary_agent column already exists in a2a_tasks';
            END IF;
        END $$;
      `);
      console.log('✅ primary_agent column handled successfully');
    } catch (error) {
      console.log('⚠️  primary_agent column fix failed:', error.message);
    }

    // 4. Create upsert function for thread preferences
    console.log('4. Creating thread preferences upsert function...');
    try {
      await pool.query(`
        CREATE OR REPLACE FUNCTION upsert_thread_preferences(
            p_user_id INTEGER,
            p_preferences JSONB
        ) RETURNS VOID AS $$
        BEGIN
            INSERT INTO thread_preferences (user_id, preferences, created_at, updated_at)
            VALUES (p_user_id, p_preferences, NOW(), NOW())
            ON CONFLICT (user_id) DO UPDATE SET
                preferences = EXCLUDED.preferences,
                updated_at = NOW();
            
        EXCEPTION WHEN others THEN
            UPDATE thread_preferences 
            SET preferences = p_preferences, updated_at = NOW()
            WHERE user_id = p_user_id;
            
            IF NOT FOUND THEN
                INSERT INTO thread_preferences (user_id, preferences, created_at, updated_at)
                VALUES (p_user_id, p_preferences, NOW(), NOW());
            END IF;
        END;
        $$ LANGUAGE plpgsql;
      `);
      console.log('✅ Thread preferences upsert function created');
    } catch (error) {
      console.log('⚠️  Thread preferences function creation failed:', error.message);
    }

    // 5. Ensure thread_preferences has unique constraint
    console.log('5. Ensuring thread_preferences unique constraint...');
    try {
      await pool.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE table_name = 'thread_preferences' 
                AND constraint_type = 'UNIQUE'
                AND constraint_name LIKE '%user_id%'
            ) THEN
                DELETE FROM thread_preferences a USING thread_preferences b 
                WHERE a.id > b.id AND a.user_id = b.user_id;
                
                ALTER TABLE thread_preferences 
                ADD CONSTRAINT thread_preferences_user_id_unique UNIQUE (user_id);
                
                RAISE NOTICE 'Added unique constraint to thread_preferences.user_id';
            ELSE
                RAISE NOTICE 'Unique constraint already exists on thread_preferences.user_id';
            END IF;
        END $$;
      `);
      console.log('✅ Thread preferences unique constraint handled');
    } catch (error) {
      console.log('⚠️  Thread preferences constraint fix failed:', error.message);
    }

    // 6. Clean up orphaned interactions
    console.log('6. Cleaning up orphaned agent interactions...');
    try {
      const result = await pool.query(`
        DELETE FROM a2a_agent_interactions 
        WHERE task_id NOT IN (SELECT task_id FROM a2a_tasks)
      `);
      console.log(`✅ Cleaned up ${result.rowCount} orphaned interactions`);
    } catch (error) {
      console.log('⚠️  Orphaned interactions cleanup failed:', error.message);
    }

    // 7. Create trigger for last_accessed
    console.log('7. Creating last_accessed trigger...');
    try {
      await pool.query(`
        CREATE OR REPLACE FUNCTION update_a2a_session_last_accessed()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.last_accessed = NOW();
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);
      
      await pool.query(`DROP TRIGGER IF EXISTS trigger_update_a2a_session_last_accessed ON a2a_session_context`);
      await pool.query(`
        CREATE TRIGGER trigger_update_a2a_session_last_accessed
            BEFORE UPDATE ON a2a_session_context
            FOR EACH ROW
            EXECUTE FUNCTION update_a2a_session_last_accessed()
      `);
      console.log('✅ Last accessed trigger created');
    } catch (error) {
      console.log('⚠️  Last accessed trigger creation failed:', error.message);
    }

    // Verification
    console.log('\n📊 Verification Results:');
    
    // Check columns
    const sessionColumns = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'a2a_session_context' AND column_name = 'last_accessed'
    `);
    console.log(`✅ last_accessed column: ${sessionColumns.rows.length > 0 ? 'EXISTS' : 'MISSING'}`);
    
    const taskColumns = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'a2a_tasks' AND column_name IN ('initial_query', 'primary_agent')
    `);
    const hasInitialQuery = taskColumns.rows.some(col => col.column_name === 'initial_query');
    const hasPrimaryAgent = taskColumns.rows.some(col => col.column_name === 'primary_agent');
    console.log(`✅ initial_query column: ${hasInitialQuery ? 'EXISTS' : 'MISSING'}`);
    console.log(`✅ primary_agent column: ${hasPrimaryAgent ? 'EXISTS' : 'MISSING'}`);
    
    console.log('\n🎉 A2A Database Fix Complete!');
    
  } catch (error) {
    console.error('❌ Database fix failed:', error);
  } finally {
    await pool.end();
  }
}

fixA2ADatabase();

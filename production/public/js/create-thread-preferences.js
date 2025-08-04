import pool from '../../db.js';

async function createThreadPreferencesTable() {
  try {
    console.log('🔧 Creating thread_preferences table...');
    
    // Create the thread_preferences table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS thread_preferences (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        preferences JSONB DEFAULT '{}',
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    console.log('✅ thread_preferences table created successfully');
    
    // Create the upsert function
    console.log('🔧 Creating upsert function...');
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
    
    console.log('✅ upsert_thread_preferences function created successfully');
    
    // Create update trigger
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_thread_preferences_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    await pool.query(`DROP TRIGGER IF EXISTS trigger_update_thread_preferences_updated_at ON thread_preferences`);
    await pool.query(`
      CREATE TRIGGER trigger_update_thread_preferences_updated_at
          BEFORE UPDATE ON thread_preferences
          FOR EACH ROW
          EXECUTE FUNCTION update_thread_preferences_updated_at()
    `);
    
    console.log('✅ thread_preferences update trigger created');
    
    // Verify table exists
    const result = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = 'thread_preferences'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ thread_preferences table verification: EXISTS');
    } else {
      console.log('❌ thread_preferences table verification: MISSING');
    }
    
    console.log('\n🎉 Thread Preferences Table Setup Complete!');
    
  } catch (error) {
    console.error('❌ Thread preferences table creation failed:', error);
  } finally {
    await pool.end();
  }
}

createThreadPreferencesTable();

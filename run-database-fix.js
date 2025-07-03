import pool from './db.js';
import fs from 'fs';

async function runDatabaseFix() {
  try {
    console.log('🔧 Running A2A Foreign Key Issues Fix...');
    
    const sqlContent = fs.readFileSync('./fix-a2a-foreign-key-issues.sql', 'utf8');
    
    // Split the SQL into individual statements (basic splitting by semicolon)
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`Executing ${statements.length} database statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`Executing statement ${i + 1}/${statements.length}...`);
          await pool.query(statement);
        } catch (error) {
          console.error(`Error in statement ${i + 1}:`, error.message);
          if (statement.includes('BEGIN') || statement.includes('COMMIT')) {
            // Ignore transaction control errors in individual statements
            continue;
          }
          throw error;
        }
      }
    }
    
    console.log('✅ Database fix completed successfully!');
    
    // Run verification queries
    console.log('\n📊 Verification Results:');
    
    // Check a2a_session_context columns
    const sessionColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'a2a_session_context' 
      ORDER BY ordinal_position
    `);
    console.log('a2a_session_context columns:', sessionColumns.rows);
    
    // Check if last_accessed column exists
    const hasLastAccessed = sessionColumns.rows.some(col => col.column_name === 'last_accessed');
    console.log(`✅ last_accessed column ${hasLastAccessed ? 'exists' : 'missing'}!`);
    
    // Check a2a_tasks columns
    const taskColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'a2a_tasks' 
      ORDER BY ordinal_position
    `);
    
    const hasInitialQuery = taskColumns.rows.some(col => col.column_name === 'initial_query');
    const hasPrimaryAgent = taskColumns.rows.some(col => col.column_name === 'primary_agent');
    console.log(`✅ initial_query column ${hasInitialQuery ? 'exists' : 'missing'}!`);
    console.log(`✅ primary_agent column ${hasPrimaryAgent ? 'exists' : 'missing'}!`);
    
    // Check thread_preferences constraints
    const constraints = await pool.query(`
      SELECT constraint_name, constraint_type 
      FROM information_schema.table_constraints 
      WHERE table_name = 'thread_preferences'
    `);
    console.log('thread_preferences constraints:', constraints.rows);
    
    console.log('\n🎉 A2A Foreign Key Issues Fix Complete!');
    
  } catch (error) {
    console.error('❌ Database fix failed:', error);
  } finally {
    await pool.end();
  }
}

runDatabaseFix();

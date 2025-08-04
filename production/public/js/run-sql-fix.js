import pool from '../../db/index.js';
import fs from 'fs';

async function runSQLFix() {
  try {
    console.log('🔧 Running Sidebar Conversations Database Fix...\n');
    
    // Read the SQL file
    const sqlContent = fs.readFileSync('./fix-sidebar-conversations.sql', 'utf8');
    
    // Split into individual statements (rough approach, but should work for our script)
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'));
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const statement of statements) {
      if (statement.includes('DO $$') || statement.includes('CREATE OR REPLACE')) {
        // Execute complex statements as-is
        try {
          await pool.query(statement + ';');
          successCount++;
        } catch (error) {
          console.log(`⚠️ Statement failed (may be expected): ${error.message.substring(0, 100)}...`);
          errorCount++;
        }
      } else if (statement.trim().length > 10) {
        // Execute simple statements
        try {
          await pool.query(statement);
          successCount++;
        } catch (error) {
          console.log(`⚠️ Statement failed: ${error.message.substring(0, 100)}...`);
          errorCount++;
        }
      }
    }
    
    console.log(`✅ Database fix completed: ${successCount} successful, ${errorCount} warnings/errors`);
    
    // Now test if the columns exist
    console.log('\n🔍 Verifying database structure...');
    
    try {
      const testQuery = await pool.query(`
        SELECT 
          COUNT(*) as total_count,
          COUNT(CASE WHEN title IS NOT NULL AND title != '' THEN 1 END) as with_title,
          COUNT(CASE WHEN last_message IS NOT NULL THEN 1 END) as with_last_message,
          COUNT(CASE WHEN agent_type IS NOT NULL THEN 1 END) as with_agent_type
        FROM conversations
      `);
      
      const stats = testQuery.rows[0];
      console.log(`📊 Conversations: ${stats.total_count} total, ${stats.with_title} with titles, ${stats.with_last_message} with last messages`);
      console.log(`🤖 Agent types: ${stats.with_agent_type} conversations with agent_type`);
      
    } catch (error) {
      console.log(`❌ Verification failed: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Error running SQL fix:', error);
  } finally {
    process.exit(0);
  }
}

runSQLFix();

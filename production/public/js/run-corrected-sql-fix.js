#!/usr/bin/env node

/**
 * Run the corrected A2A database schema fix
 * This script applies the final database fixes needed for complete mainChatInput synchronization
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runCorrectedSqlFix() {
  try {
    console.log('🔧 Running corrected A2A database schema fixes...');
    
    // Read the corrected SQL fix file
    const sqlFile = path.join(__dirname, 'fix-a2a-database-schema-corrected.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('📄 SQL file loaded successfully');
    console.log('🔄 Executing database fixes...');
    
    // Execute the SQL fixes
    const result = await pool.query(sqlContent);
    
    console.log('✅ Database schema fixes completed successfully!');
    console.log('\n🎉 mainChatInput synchronization should now work without errors');
    console.log('\n📊 Summary of fixes applied:');
    console.log('   • Added session_id column to a2a_agent_interactions table');
    console.log('   • Fixed thread_previews table structure with user_id column');
    console.log('   • Added session_data column to a2a_session_context table');
    console.log('   • Added thread_id and preferences columns to a2a_thread_preferences table');
    console.log('   • Created proper indexes for performance');
    console.log('   • Added utility functions for thread management');
    
  } catch (error) {
    console.error('❌ Error running database fixes:', error);
    console.error('\nDetails:', error.message);
    
    if (error.code) {
      console.error('SQL Error Code:', error.code);
    }
    
    if (error.position) {
      console.error('Error Position:', error.position);
    }
    
    process.exit(1);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Run the fixes if this script is executed directly
if (process.argv[1] === __filename) {
  runCorrectedSqlFix()
    .then(() => {
      console.log('\n🏁 Database fixes completed. You can now restart the server to test the integration.');
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export default runCorrectedSqlFix;

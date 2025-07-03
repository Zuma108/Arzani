/**
 * Fix A2A Database Schema Issues
 * 
 * This script applies the necessary database schema fixes to resolve
 * the missing tables and columns that are causing A2A API errors.
 */

import fs from 'fs';
import path from 'path';
import pool from './db.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixA2ADatabaseSchema() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Starting A2A Database Schema Fix...');
    console.log('=====================================');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, 'fix-a2a-database-schema.sql');
    
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Migration file not found: ${sqlPath}`);
    }
    
    const migrationSQL = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📖 Executing A2A database schema migration...');
    
    // Execute the migration
    await client.query(migrationSQL);
    
    // Commit the transaction
    await client.query('COMMIT');
    
    console.log('✅ A2A Database Schema Fix Completed Successfully!');
    console.log('');
    console.log('🎯 Fixed Issues:');
    console.log('   • Missing tables: a2a_chat_sessions, a2a_chat_messages, a2a_thread_analytics, etc.');
    console.log('   • Missing columns: context_data, session_data, task_data, etc.');
    console.log('   • NULL constraint issues in a2a_messages.task_id');
    console.log('   • Added proper indexes and triggers');
    console.log('');
    console.log('🚀 A2A API endpoints should now work without database errors!');
    
    return { success: true };
    
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('❌ Error during A2A database schema fix:', error);
    console.error('Transaction rolled back.');
    return { success: false, error: error.message };
    
  } finally {
    client.release();
  }
}

// Verify the fix by checking table existence
async function verifySchemaFix() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verifying A2A Database Schema...');
    console.log('===================================');
    
    // Check for required tables
    const requiredTables = [
      'a2a_tasks',
      'a2a_messages', 
      'a2a_agent_interactions',
      'a2a_session_context',
      'a2a_chat_sessions',
      'a2a_chat_messages',
      'a2a_thread_analytics',
      'a2a_thread_cache',
      'a2a_thread_preferences',
      'a2a_file_uploads',
      'a2a_agent_transitions'
    ];
    
    console.log('📋 Checking required tables...');
    
    for (const tableName of requiredTables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [tableName]);
      
      if (result.rows[0].exists) {
        console.log(`   ✅ ${tableName}`);
      } else {
        console.log(`   ❌ ${tableName} - MISSING`);
      }
    }
    
    // Check for required columns in key tables
    console.log('');
    console.log('📋 Checking required columns...');
    
    const requiredColumns = [
      { table: 'a2a_session_context', column: 'context_data' },
      { table: 'a2a_session_context', column: 'session_data' },
      { table: 'a2a_agent_interactions', column: 'context_data' },
      { table: 'a2a_tasks', column: 'session_id' },
      { table: 'a2a_tasks', column: 'task_data' },
      { table: 'a2a_messages', column: 'session_id' }
    ];
    
    for (const { table, column } of requiredColumns) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = $1 AND column_name = $2
        )
      `, [table, column]);
      
      if (result.rows[0].exists) {
        console.log(`   ✅ ${table}.${column}`);
      } else {
        console.log(`   ❌ ${table}.${column} - MISSING`);
      }
    }
    
    console.log('');
    console.log('🎯 Schema verification completed!');
    
  } catch (error) {
    console.error('❌ Error during schema verification:', error);
  } finally {
    client.release();
  }
}

// Run the migration if this file is executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  fixA2ADatabaseSchema()
    .then(async (result) => {
      if (result.success) {
        console.log('');
        await verifySchemaFix();
        console.log('');
        console.log('🎉 A2A Database Schema Fix Complete!');
        console.log('You can now test the A2A API endpoints.');
        process.exit(0);
      } else {
        console.error('❌ Schema fix failed:', result.error);
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('❌ Unhandled error during schema fix:', err);
      process.exit(1);
    });
}

export { fixA2ADatabaseSchema, verifySchemaFix };

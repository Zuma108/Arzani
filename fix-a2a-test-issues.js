// Fix A2A Test Issues - Node.js version
import pool from './db.js';
import fs from 'fs/promises';

async function fixA2ATestIssues() {
  try {
    console.log('🔧 Fixing A2A Test Issues...\n');

    // 1. Create test user
    console.log('👤 Creating test user...');
    try {
      const userResult = await pool.query(`
        INSERT INTO users (id, email, password_hash, username, first_name, last_name, created_at, updated_at) 
        VALUES (999, 'test@a2a.local', '$2b$10$dummy.hash.for.testing.purposes', 'a2a_test_user', 'A2A', 'Tester', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          username = EXCLUDED.username,
          updated_at = NOW()
        RETURNING id, username
      `);
      console.log('✅ Test user created/updated:', userResult.rows[0]);
    } catch (error) {
      console.error('❌ Error creating test user:', error.message);
    }

    // 2. Check A2A table schemas
    console.log('\n📋 Checking A2A table schemas...');
    const schemaResult = await pool.query(`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name IN (
        'a2a_agent_interactions',
        'a2a_agent_transitions', 
        'a2a_file_uploads',
        'a2a_messages',
        'a2a_thread_cache',
        'a2a_thread_analytics',
        'a2a_tasks',
        'a2a_chat_sessions',
        'a2a_chat_messages'
      )
      ORDER BY table_name, ordinal_position
    `);

    // Group by table for better readability
    const tableSchemas = {};
    schemaResult.rows.forEach(row => {
      if (!tableSchemas[row.table_name]) {
        tableSchemas[row.table_name] = [];
      }
      tableSchemas[row.table_name].push({
        column: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable,
        default: row.column_default
      });
    });

    console.log('\n📊 A2A Table Schemas:');
    Object.entries(tableSchemas).forEach(([tableName, columns]) => {
      console.log(`\n🔷 ${tableName}:`);
      columns.forEach(col => {
        const nullable = col.nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultVal = col.default ? ` DEFAULT ${col.default}` : '';
        console.log(`  ${col.column}: ${col.type} ${nullable}${defaultVal}`);
      });
    });

    // 3. Check foreign key constraints
    console.log('\n🔗 Checking foreign key constraints...');
    const fkResult = await pool.query(`
      SELECT 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
      WHERE constraint_type = 'FOREIGN KEY' 
        AND tc.table_name LIKE 'a2a_%'
      ORDER BY tc.table_name
    `);

    if (fkResult.rows.length > 0) {
      console.log('\n🔗 Foreign Key Constraints:');
      fkResult.rows.forEach(row => {
        console.log(`  ${row.table_name}.${row.column_name} → ${row.foreign_table_name}.${row.foreign_column_name}`);
      });
    } else {
      console.log('No foreign key constraints found for A2A tables.');
    }

    console.log('\n✅ A2A test issues diagnosis complete!');
    
  } catch (error) {
    console.error('❌ Error during A2A fixes:', error);
  } finally {
    await pool.end();
  }
}

// Run the fixes
fixA2ATestIssues();

import pool from './db/index.js';

async function checkTables() {
  try {
    console.log('🔍 Checking database tables...\n');
    
    // Get all tables
    const allTablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📊 ALL TABLES:');
    allTablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Check specifically for conversation tables
    const conversationTables = ['conversations', 'messages', 'conversation_participants', 'a2a_chat_sessions', 'a2a_chat_messages'];
    
    console.log('\n💬 CONVERSATION TABLES STATUS:');
    for (const tableName of conversationTables) {
      const exists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [tableName]);
      
      if (exists.rows[0].exists) {
        // Get columns
        const columns = await pool.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = $1 
          ORDER BY ordinal_position
        `, [tableName]);
        
        console.log(`  ✅ ${tableName}`);
        columns.rows.forEach(col => {
          console.log(`     - ${col.column_name} (${col.data_type})`);
        });
      } else {
        console.log(`  ❌ ${tableName} - MISSING`);
      }
    }
    
    // Check for A2A tables
    const a2aTablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'a2a_%'
      ORDER BY table_name
    `);
    
    console.log('\n🤖 A2A TABLES:');
    if (a2aTablesResult.rows.length === 0) {
      console.log('  ❌ No A2A tables found');
    } else {
      a2aTablesResult.rows.forEach(row => {
        console.log(`  ✅ ${row.table_name}`);
      });
    }
    
    // Check users table
    const usersExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      )
    `);
    
    console.log('\n👥 USERS TABLE:');
    if (usersExists.rows[0].exists) {
      const userColumns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        ORDER BY ordinal_position
      `);
      
      console.log('  ✅ users');
      userColumns.rows.forEach(col => {
        console.log(`     - ${col.column_name} (${col.data_type})`);
      });
    } else {
      console.log('  ❌ users - MISSING');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking tables:', error);
    process.exit(1);
  }
}

checkTables();

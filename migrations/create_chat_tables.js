// Migration script to create chat tables
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db.js';

// Get directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createChatTables() {
  console.log('Running chat tables migration...');
  
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create_chat_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    await pool.query(sql);
    
    console.log('✅ Chat tables created successfully');
  } catch (error) {
    console.error('❌ Error creating chat tables:', error);
    throw error;
  }
}

// Execute if this file is run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createChatTables()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { createChatTables };
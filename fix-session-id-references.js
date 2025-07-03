import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Create a database connection pool
const pool = new pg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function fixDatabaseSchemaReferences() {
  console.log('Starting to fix session_id references in SQL queries...');
  
  try {
    // 1. Get a list of files to check
    const filesToCheck = [
      'routes/api/threads.js',
      'routes/api/chat.js',
      'controllers/chatController.js'
    ];
    
    // 2. Check each file and fix references
    for (const filePath of filesToCheck) {
      console.log(`Checking file: ${filePath}`);
      
      const fullPath = path.join(process.cwd(), filePath);
      if (!fs.existsSync(fullPath)) {
        console.log(`  ⚠️ File not found: ${fullPath}`);
        continue;
      }
      
      // Read file content
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Replace session_id references with conversation_id
      const originalContent = content;
      
      // Replace the session_id with conversation_id in SQL queries
      // Be careful to only replace it in the context of conversation_participants table
      content = content.replace(/conversation_participants\s+cp\s+ON\s+.*?\s+=\s+cp\.session_id/g, 
                             match => match.replace('session_id', 'conversation_id'));
      
      content = content.replace(/cp\.session_id\s+=\s+conversations\.id/g, 
                             match => match.replace('session_id', 'conversation_id'));
      
      content = content.replace(/cp\.session_id\s+=\s+\$1/g, 
                             match => match.replace('session_id', 'conversation_id'));
      
      content = content.replace(/cp\.session_id\s+=\s+c\.id/g, 
                             match => match.replace('session_id', 'conversation_id'));
      
      content = content.replace(/m\.session_id\s+=\s+cp\.session_id/g, 
                             match => match.replace(/cp\.session_id/, 'cp.conversation_id'));
      
      // Check if any changes were made
      if (content !== originalContent) {
        console.log(`  ✅ Fixed references in ${filePath}`);
        
        // Backup the original file
        const backupPath = `${fullPath}.bak`;
        fs.writeFileSync(backupPath, originalContent);
        console.log(`  📦 Original backed up to ${backupPath}`);
        
        // Write the updated content
        fs.writeFileSync(fullPath, content);
        console.log(`  💾 Updated file saved`);
      } else {
        console.log(`  ✓ No changes needed in ${filePath}`);
      }
    }
    
    console.log('\nAll files processed. Testing the database connection...');
    
    // 3. Test the database connection to verify changes
    const testQuery = `
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_name = 'conversation_participants'
      ORDER BY ordinal_position;
    `;
    
    const result = await pool.query(testQuery);
    console.log('\nConversation participants table schema:');
    console.table(result.rows);
    
    console.log('\nFix completed successfully!');
    
  } catch (error) {
    console.error('Error during fix:', error);
  } finally {
    await pool.end();
  }
}

// Execute the fix
fixDatabaseSchemaReferences();

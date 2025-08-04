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

// Main function to find files that need to be updated
async function findFilesToUpdate() {
  console.log('Searching for files that create or use old conversation tables...');

  // 1. Find which API files are still using the old tables
  const searchDirectories = [
    'routes',
    'api',
    'controllers',
    'services',
    'public/js'
  ];

  for (const dir of searchDirectories) {
    console.log(`\nSearching in ${dir}...`);
    try {
      await searchFilesInDir(dir);
    } catch (err) {
      console.error(`Error searching in ${dir}:`, err);
    }
  }

  // 2. Check a specific list of files that might be involved
  const specificFiles = [
    'app.js',
    'server.js',
    'db.js',
    'database.js'
  ];

  console.log('\nChecking specific files...');
  for (const file of specificFiles) {
    try {
      if (fs.existsSync(file)) {
        console.log(`Checking ${file}...`);
        const content = fs.readFileSync(file, 'utf8');
        
        if (content.includes('conversations') || content.includes('messages')) {
          console.log(`⚠️ ${file} contains references to old tables`);
          
          // Check if this is a route registration file
          if (content.includes('app.use') || content.includes('router.use')) {
            console.log(`  This file registers routes - check for proper API imports`);
          }
        }
      }
    } catch (err) {
      console.error(`Error checking ${file}:`, err);
    }
  }
  
  // 3. Get all files that contain "conversations" or "messages" table references
  console.log('\nSearch completed.');
  console.log(`To fix the issue, ensure that all API endpoints that create conversations use a2a tables.`);
  console.log(`Look for INSERT statements into 'conversations' or 'messages' tables and convert them to use a2a_chat_sessions and a2a_chat_messages instead.`);
  
  await pool.end();
}

// Helper function to search files in a directory recursively
async function searchFilesInDir(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      console.log(`Directory ${dirPath} does not exist.`);
      return;
    }
    
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        await searchFilesInDir(filePath);
      } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.ts'))) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Look for SQL statements with the old table names
        if (content.includes('INSERT INTO conversations') || 
            content.includes('INSERT INTO messages') || 
            content.includes('UPDATE conversations') || 
            content.includes('UPDATE messages')) {
          console.log(`⚠️ Found SQL operations on old tables in: ${filePath}`);
        }
        
        // Look for direct table references
        if ((content.includes('conversations') || content.includes('messages')) && 
            (content.includes('INSERT INTO') || content.includes('UPDATE') || content.includes('SELECT'))) {
          console.log(`⚠️ File may reference old tables: ${filePath}`);
        }
        
        // Look for API endpoint handlers that might create conversations
        if ((content.includes('post') || content.includes('POST')) && 
            (content.includes('/conversations') || content.includes('/api/conversations'))) {
          console.log(`⚠️ Found API endpoints for old conversations tables: ${filePath}`);
        }
      }
    }
  } catch (err) {
    console.error(`Error searching in directory ${dirPath}:`, err);
  }
}

// Run the script
findFilesToUpdate();

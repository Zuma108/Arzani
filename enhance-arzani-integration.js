/**
 * Arzani-X Integration Enhancement Script
 * Ensures consistent API usage and proper authentication across frontend
 */

// Database connection
import pool from './db.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

console.log('🛠️ Starting Arzani-X Integration Enhancement...\n');

// Configuration
const config = {
  apiPaths: {
    // Standardize on these API endpoints
    standardEndpoints: [
      '/api/a2a/sessions',
      '/api/a2a/messages',
      '/api/a2a/sessions/:id/messages',
      '/api/a2a/log-interaction',
      '/api/a2a/log-transition',
      '/api/a2a/log-file-upload',
      '/api/a2a/log-message',
      '/api/a2a/analytics',
      '/api/a2a/cache',
      '/api/a2a/tasks',
      '/api/a2a/interactions',
      '/api/a2a/session-context'
    ],
    // Legacy endpoints to be reviewed
    legacyEndpoints: [
      '/api/threads',
      '/api/messages',
      '/api/conversations'
    ]
  },
  filePaths: {
    frontendJs: [
      './public/js/arzani-x.js',
      './public/js/arzani-x-persistence.js',
      './public/js/a2a-persistence-manager.js'
    ],
    views: [
      './views/Arzani-x.ejs'
    ]
  }
};

// Enhancement functions
async function enhanceSessionContextHandling() {
  console.log('📊 Enhancing session context handling...');
  
  try {
    // Check if user_id is consistently used in session context
    const sessionContextQuery = `
      SELECT COUNT(*) as total_sessions, 
             COUNT(CASE WHEN context_data ? 'user_id' THEN 1 END) as with_user_id
      FROM a2a_session_context;
    `;
    
    const result = await pool.query(sessionContextQuery);
    const { total_sessions, with_user_id } = result.rows[0];
    
    console.log(`Found ${total_sessions} session contexts, ${with_user_id} with user_id (${Math.round(with_user_id/total_sessions*100)}%)`);
    
    if (with_user_id < total_sessions) {
      console.log('⚠️ Some session contexts are missing user_id, creating migration...');
      
      // Create a migration script
      const migrationSql = `
        -- Migration to ensure user_id in all session contexts
        UPDATE a2a_session_context sc
        SET context_data = jsonb_set(
          COALESCE(context_data, '{}'::jsonb),
          '{user_id}',
          (SELECT to_jsonb(user_id) FROM a2a_chat_sessions WHERE id = sc.session_id),
          true
        )
        WHERE NOT context_data ? 'user_id'
        AND EXISTS (SELECT 1 FROM a2a_chat_sessions WHERE id = sc.session_id);
      `;
      
      fs.writeFileSync('./migrations/add_user_id_to_session_context.sql', migrationSql);
      console.log('✅ Migration script created: ./migrations/add_user_id_to_session_context.sql');
    }
  } catch (error) {
    console.error('❌ Error enhancing session context:', error);
  }
}

async function validateApiIntegration() {
  console.log('🔍 Validating API integration consistency...');
  
  let inconsistentApiUsage = false;
  
  for (const filePath of [...config.filePaths.frontendJs, ...config.filePaths.views]) {
    try {
      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ File not found: ${filePath}`);
        continue;
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for legacy endpoint usage
      for (const endpoint of config.apiPaths.legacyEndpoints) {
        if (content.includes(endpoint)) {
          console.log(`⚠️ Legacy endpoint "${endpoint}" used in ${filePath}`);
          inconsistentApiUsage = true;
        }
      }
      
      // Check for authentication token usage with API calls
      const apiCallRegex = /fetch\([^)]*\/api\/[^)]*\)/g;
      const apiCalls = content.match(apiCallRegex) || [];
      
      const authHeaderRegex = /headers[^{]*{[^}]*('|")Authorization('|"):/;
      
      for (const apiCall of apiCalls) {
        if (!authHeaderRegex.test(apiCall) && !apiCall.includes('getAuthHeaders()')) {
          console.log(`⚠️ Possible unauthenticated API call in ${filePath}:`);
          console.log(`   ${apiCall.substring(0, 100)}...`);
        }
      }
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error);
    }
  }
  
  if (inconsistentApiUsage) {
    console.log('\n⚠️ API usage inconsistencies found. Consider standardizing on A2A API endpoints.');
  } else {
    console.log('✅ API integration is consistent across frontend files.');
  }
}

async function validateDatabaseSchemaAlignment() {
  console.log('🧪 Validating database schema alignment...');
  
  try {
    // Get A2A table schemas
    const schemaQuery = `
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'a2a_%'
      ORDER BY table_name, ordinal_position;
    `;
    
    const schemaResult = await pool.query(schemaQuery);
    
    // Check for potential frontend-backend schema mismatches
    const tableColumnMap = {};
    
    for (const row of schemaResult.rows) {
      if (!tableColumnMap[row.table_name]) {
        tableColumnMap[row.table_name] = [];
      }
      tableColumnMap[row.table_name].push({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES'
      });
    }
    
    // Check frontend files for field references that might not match database schema
    for (const filePath of config.filePaths.frontendJs) {
      if (!fs.existsSync(filePath)) continue;
      
      const content = fs.readFileSync(filePath, 'utf8');
      
      for (const tableName of Object.keys(tableColumnMap)) {
        // Convert a2a_chat_sessions to chatSessions, a2a_chat_messages to chatMessages, etc.
        const jsVarName = tableName.replace('a2a_', '').replace(/_([a-z])/g, (m, p1) => p1.toUpperCase());
        
        // Look for object construction that might be inserting into this table
        const tableInsertRegex = new RegExp(`(${jsVarName}|${tableName}).*?{[^}]*}`, 'g');
        const matches = content.match(tableInsertRegex) || [];
        
        for (const match of matches) {
          // Check if this looks like database object construction
          if (match.includes(':') || match.includes('=')) {
            // Extract field names
            const fieldRegex = /['"]?(\w+)['"]?\s*[=:]/g;
            let fieldMatch;
            while ((fieldMatch = fieldRegex.exec(match)) !== null) {
              const fieldName = fieldMatch[1];
              
              // Check if field exists in database schema
              const dbColumns = tableColumnMap[tableName].map(col => col.name);
              if (!dbColumns.includes(fieldName) && 
                  !['id', 'table', 'schema', 'db', 'database'].includes(fieldName)) {
                console.log(`⚠️ Potential schema mismatch: Field "${fieldName}" in frontend might not match database schema for "${tableName}"`);
              }
            }
          }
        }
      }
    }
    
    console.log('✅ Database schema validation complete.');
  } catch (error) {
    console.error('❌ Error validating schema alignment:', error);
  }
}

// Run enhancement functions
async function main() {
  try {
    await validateApiIntegration();
    console.log('\n---\n');
    
    await enhanceSessionContextHandling();
    console.log('\n---\n');
    
    await validateDatabaseSchemaAlignment();
    console.log('\n---\n');
    
    console.log('✅ Arzani-X integration enhancement complete!');
  } catch (error) {
    console.error('❌ Enhancement process failed:', error);
  } finally {
    // Close database connection
    await pool.end();
  }
}

// Create migrations directory if it doesn't exist
if (!fs.existsSync('./migrations')) {
  fs.mkdirSync('./migrations');
}

main();

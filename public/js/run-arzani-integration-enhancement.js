#!/usr/bin/env node

/**
 * Arzani-X Integration Test and Enhancement Runner
 * This script validates the integration and applies necessary fixes
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory (ES module equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting Arzani-X Integration Validation and Enhancement...\n');

// Configuration
const config = {
  testFile: 'test-arzani-integration.js',
  enhancementScript: 'enhance-arzani-integration.js',
  sqlFixScript: 'fix-arzani-database-schema-alignment.sql',
  dbConnection: {
    // These will be overridden by .env values
    host: 'localhost',
    database: 'marketplace',
    user: 'postgres'
  }
};

// Load environment variables
try {
  const dotenv = await import('dotenv');
  dotenv.config();
  config.dbConnection.host = process.env.DB_HOST || config.dbConnection.host;
  config.dbConnection.database = process.env.DB_NAME || config.dbConnection.database;
  config.dbConnection.user = process.env.DB_USER || config.dbConnection.user;
} catch (error) {
  console.warn('⚠️ Failed to load .env file, using default database connection values');
}

// Helper function to run a command and return its output
function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(' ')}`);
    
    const childProcess = spawn(command, args, { 
      stdio: 'pipe',
      ...options
    });
    
    let stdout = '';
    let stderr = '';
    
    if (childProcess.stdout) {
      childProcess.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        if (!options.silent) {
          process.stdout.write(output);
        }
      });
    }
    
    if (childProcess.stderr) {
      childProcess.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        if (!options.silent) {
          process.stderr.write(output);
        }
      });
    }
    
    childProcess.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Command failed with code ${code}\n${stderr}`));
      }
    });
    
    childProcess.on('error', (error) => {
      reject(error);
    });
  });
}

// Run integration test
async function runIntegrationTest() {
  console.log('🧪 Running integration tests...\n');
  
  try {
    await runCommand('node', [config.testFile]);
    console.log('\n✅ Integration tests passed!\n');
    return true;
  } catch (error) {
    console.error('\n❌ Integration tests failed!\n');
    return false;
  }
}

// Apply SQL fixes
async function applyDatabaseFixes() {
  console.log('🛠️ Applying database schema fixes...\n');
  
  try {
    const sqlFile = path.resolve(config.sqlFixScript);
    
    if (!fs.existsSync(sqlFile)) {
      throw new Error(`SQL fix script not found: ${sqlFile}`);
    }
    
    // Use environment variables for PostgreSQL connection if available
    const dbHost = process.env.DB_HOST || config.dbConnection.host;
    const dbName = process.env.DB_NAME || config.dbConnection.database;
    const dbUser = process.env.DB_USER || config.dbConnection.user;
    
    // Run the SQL script using psql
    await runCommand('psql', [
      '-h', dbHost,
      '-d', dbName,
      '-U', dbUser,
      '-f', sqlFile
    ]);
    
    console.log('\n✅ Database schema fixes applied successfully!\n');
    return true;
  } catch (error) {
    console.error('\n❌ Failed to apply database fixes:', error.message);
    return false;
  }
}

// Run the enhancement script
async function runEnhancementScript() {
  console.log('🔍 Running enhancement analysis...\n');
  
  try {
    await runCommand('node', [config.enhancementScript]);
    console.log('\n✅ Enhancement analysis completed!\n');
    return true;
  } catch (error) {
    console.error('\n❌ Enhancement analysis failed:', error.message);
    return false;
  }
}

// Main execution function
async function main() {
  try {
    // Step 1: Run initial integration test
    const initialTestPassed = await runIntegrationTest();
    
    // Step 2: Apply database fixes
    console.log('\n---\n');
    await applyDatabaseFixes();
    
    // Step 3: Run enhancement script
    console.log('\n---\n');
    await runEnhancementScript();
    
    // Step 4: Run integration test again if initial test failed
    if (!initialTestPassed) {
      console.log('\n---\n');
      console.log('🔄 Re-running integration tests after fixes...\n');
      await runIntegrationTest();
    }
    
    console.log('\n🎉 Arzani-X integration validation and enhancement completed!\n');
    console.log('📝 View the full report in ARZANI_X_INTEGRATION_SUCCESS_REPORT.md');
    console.log('📊 Database schema details in ARZANI_X_FRONTEND_DATABASE_INTEGRATION.md\n');
    
  } catch (error) {
    console.error('\n❌ Process failed:', error.message);
    process.exit(1);
  }
}

// Run the main function
main();

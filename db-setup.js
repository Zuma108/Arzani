/**
 * Database Setup Script
 * This script runs database migrations for the Arzani blog system
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';
import pool from './db.js';
import { createUserTable } from './database.js';
import { createBusinessHistoryTable } from './services/history.js';
import { createAssistantTables } from './migrations/create_assistant_interactions.js';
import { ensureCreditColumns } from './migrations/ensure_credit_columns.js';
import { createAICreditsTable } from './migrations/create_ai_credits_table.js';

// Get current directory name (for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Run the blog migrations
async function setupBlogDatabase() {
  try {
    console.log('Setting up blog database tables...');
    
    // Read the SQL file content
    const sqlFilePath = path.join(__dirname, 'migrations', 'blog_tables.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Execute the SQL commands
    await db.query(sqlContent);
    
    console.log('Blog database tables setup complete!');
    return true;
  } catch (error) {
    console.error('Error setting up blog database tables:', error);
    return false;
  }
}

// Function to run any necessary migrations
async function runMigrations() {
  try {
    // Check if blog tables exist
    const checkQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'blog_posts'
      )
    `;
    const { rows } = await db.query(checkQuery);
    const blogTablesExist = rows[0].exists;
    
    if (!blogTablesExist) {
      console.log('Blog tables do not exist. Running migrations...');
      await setupBlogDatabase();
    } else {
      console.log('Blog tables already exist. Skipping migrations.');
    }
    
    console.log('All migrations completed successfully.');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    process.exit();
  }
}

/**
 * Initialize all database tables required for the application
 */
async function initializeTables() {
  try {
    console.log('Starting database initialization...');
    
    // Check connection
    await pool.query('SELECT NOW()');
    console.log('Database connection successful');
    
    // Create tables in sequence
    await createUserTable();
    console.log('User table initialized');
    
    // Ensure credit columns exist (legacy support)
    await ensureCreditColumns();
    console.log('Credit columns initialized');
    
    // Create new AI credits table (new implementation)
    await createAICreditsTable();
    console.log('AI Credits table initialized');
    
    await createBusinessHistoryTable();
    console.log('Business history table initialized');
    
    // Add the new assistant tables
    await createAssistantTables();
    console.log('AI Assistant tables initialized');
    
    console.log('Database initialization complete');
    return true;
  } catch (error) {
    console.error('Database initialization failed:', error);
    return false;
  }
}

// Execute if run directly
if (process.argv[1].endsWith('db-setup.js')) {
  initializeTables()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

// Run migrations when this script is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations();
}

export { setupBlogDatabase, runMigrations, initializeTables };

import pool from './db.js';
import { createUserTable } from './database.js';
import { createBusinessHistoryTable } from './services/history.js';
import { createAssistantTables } from './migrations/create_assistant_interactions.js';
import { ensureCreditColumns } from './migrations/ensure_credit_columns.js';
import { createAICreditsTable } from './migrations/create_ai_credits_table.js';

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

export { initializeTables };

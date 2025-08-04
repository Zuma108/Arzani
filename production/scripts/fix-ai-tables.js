import pool from '../db.js';
import { createAssistantTables } from '../migrations/create_assistant_interactions.js';

/**
 * Fix AI assistant tables that are missing in the database
 */
async function fixAITables() {
  try {
    console.log('Checking for assistant_interactions table...');
    
    // Check if the table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'assistant_interactions'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('Table assistant_interactions does not exist. Creating now...');
      
      // Run the migration to create all necessary tables
      await createAssistantTables();
      console.log('Tables created successfully!');
    } else {
      console.log('Table assistant_interactions already exists.');
    }
    
    // Verify tables are now created
    const verifyCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'assistant_interactions'
      );
    `);
    
    if (verifyCheck.rows[0].exists) {
      console.log('✅ assistant_interactions table is now available');
    } else {
      console.error('❌ Failed to create assistant_interactions table');
    }

  } catch (error) {
    console.error('Error fixing AI tables:', error);
  } finally {
    // Close the pool
    await pool.end();
    console.log('Database connection closed');
  }
}

// Run the function if this script is executed directly
fixAITables()
  .then(() => {
    console.log('AI tables fix completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error running AI tables fix:', error);
    process.exit(1);
  });

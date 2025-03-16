import pool from '../db.js';

/**
 * Creates or updates the AI Credits table
 * This migration moves credit tracking from user columns to a dedicated table
 */
async function createAICreditsTable() {
  try {
    console.log('Starting AI Credits table migration...');
    
    // Check if table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'ai_credits'
      )
    `);
    
    if (!tableExists.rows[0].exists) {
      // Create the table
      await pool.query(`
        CREATE TABLE ai_credits (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          credits_used INTEGER DEFAULT 0,
          credits_limit INTEGER DEFAULT 30,
          last_reset TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          next_reset TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
          subscription_tier VARCHAR(50) DEFAULT 'free',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);
      
      console.log('Created ai_credits table');
      
      // Create index for faster lookups
      await pool.query(`
        CREATE INDEX idx_ai_credits_user_id ON ai_credits(user_id)
      `);
      
      console.log('Created index on ai_credits table');
      
      // Check if users table has credit columns
      const columnsExist = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'credits_used'
        )
      `);
      
      // Migrate existing data if columns exist
      if (columnsExist.rows[0].exists) {
        console.log('Migrating existing credit data from users table...');
        
        // Get users with credit data
        const users = await pool.query(`
          SELECT 
            id, 
            COALESCE(credits_used, 0) as credits_used, 
            COALESCE(credits_limit, 30) as credits_limit, 
            subscription_type,
            COALESCE(last_credit_reset, CURRENT_TIMESTAMP) as last_reset
          FROM users
          WHERE id IS NOT NULL
        `);
        
        // Insert credit records for each user
        for (const user of users.rows) {
          const now = new Date();
          const lastReset = user.last_reset || now;
          const nextReset = new Date(lastReset.getTime() + (7 * 24 * 60 * 60 * 1000));
          
          await pool.query(`
            INSERT INTO ai_credits 
              (user_id, credits_used, credits_limit, subscription_tier, last_reset, next_reset)
            VALUES 
              ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (user_id) DO NOTHING
          `, [
            user.id,
            user.credits_used,
            user.credits_limit,
            user.subscription_type || 'free',
            lastReset,
            nextReset
          ]);
        }
        
        console.log(`Migrated credit data for ${users.rows.length} users`);
      }
    } else {
      console.log('ai_credits table already exists');
    }
    
    console.log('AI Credits table migration complete');
  } catch (error) {
    console.error('Error creating AI Credits table:', error);
    throw error;
  }
}

// Run this migration if this script is executed directly
if (process.argv[1].endsWith('create_ai_credits_table.js')) {
  createAICreditsTable()
    .then(() => {
      console.log('AI Credits table migration completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error during migration:', error);
      process.exit(1);
    });
}

export { createAICreditsTable };

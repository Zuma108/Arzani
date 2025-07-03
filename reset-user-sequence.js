/**
 * Reset PostgreSQL Sequence Script
 * 
 * This script resets the PostgreSQL sequence for the users table
 * to avoid duplicate key violations during user creation.
 */

import pool from './db.js';

async function resetUserSequence() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get the current maximum ID from the users table
    const maxIdResult = await client.query('SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM users');
    const nextId = maxIdResult.rows[0].next_id;

    console.log(`Resetting users_id_seq to ${nextId}`);

    // Reset the sequence to the next valid ID
    await client.query(`ALTER SEQUENCE users_id_seq RESTART WITH ${nextId}`);

    // Verify the change
    const verifyResult = await client.query('SELECT last_value FROM users_id_seq');
    console.log(`Sequence reset to: ${verifyResult.rows[0].last_value}`);

    await client.query('COMMIT');
    console.log('Sequence reset successful');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error resetting sequence:', error);
  } finally {
    client.release();
  }
}

// Execute the function
resetUserSequence()
  .then(() => {
    console.log('Sequence reset operation completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Sequence reset operation failed:', error);
    process.exit(1);
  });

import bcrypt from 'bcrypt';
import pool from './db.js';

/**
 * Utility to fix common database inconsistencies
 */
async function repairUserAuthTable() {
  const client = await pool.connect();
  try {
    console.log('Starting user_auth table repair...');
    
    await client.query('BEGIN');
    
    // Find users without entries in users_auth table
    const missingAuthEntries = await client.query(`
      SELECT u.id, u.email, u.username 
      FROM users u
      LEFT JOIN users_auth ua ON u.id = ua.user_id
      WHERE ua.user_id IS NULL
    `);
    
    console.log(`Found ${missingAuthEntries.rows.length} users without auth entries`);
    
    // Create empty password entries for these users
    // Using a placeholder hash that cannot be used to login
    // Users will need to reset their password
    for (const user of missingAuthEntries.rows) {
      console.log(`Creating auth entry for user ${user.id} (${user.email})`);
      await client.query(`
        INSERT INTO users_auth (user_id, password_hash, verified)
        VALUES ($1, $2, $3)
      `, [user.id, 'REQUIRES_RESET', true]);
    }
    
    // Find users with empty password hashes
    const emptyHashUsers = await client.query(`
      SELECT u.id, u.email, u.username 
      FROM users u
      JOIN users_auth ua ON u.id = ua.user_id
      WHERE ua.password_hash IS NULL OR ua.password_hash = ''
    `);
    
    console.log(`Found ${emptyHashUsers.rows.length} users with empty password hashes`);
    
    // Set placeholder hash for these users too
    for (const user of emptyHashUsers.rows) {
      console.log(`Setting placeholder hash for user ${user.id} (${user.email})`);
      await client.query(`
        UPDATE users_auth SET password_hash = 'REQUIRES_RESET'
        WHERE user_id = $1
      `, [user.id]);
    }
    
    await client.query('COMMIT');
    console.log('Repair completed successfully');
    return {
      success: true,
      repaired: missingAuthEntries.rows.length + emptyHashUsers.rows.length
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error repairing database:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    client.release();
  }
}

/**
 * Repair a specific user account
 * Can be called during login process
 */
export async function repairUserAccount(userId, email) {
  if (!userId) {
    throw new Error('User ID is required for account repair');
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Check if user exists
    const userCheck = await client.query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );
    
    if (userCheck.rows.length === 0) {
      throw new Error('User not found');
    }
    
    // Check if users_auth entry exists
    const authCheck = await client.query(
      'SELECT user_id FROM users_auth WHERE user_id = $1',
      [userId]
    );
    
    if (authCheck.rows.length === 0) {
      // Create a new auth entry
      await client.query(
        'INSERT INTO users_auth (user_id, password_hash, verified) VALUES ($1, $2, true)',
        [userId, 'REQUIRES_RESET']
      );
    } else {
      // Update existing auth entry
      await client.query(
        'UPDATE users_auth SET password_hash = $1 WHERE user_id = $2',
        ['REQUIRES_RESET', userId]
      );
    }
    
    await client.query('COMMIT');
    console.log(`Repaired account for user ${userId} (${email})`);
    return {
      success: true,
      requiresPasswordReset: true
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error repairing user account:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Set a temporary password for a user
 * This can be used to fix accounts with password issues
 */
export async function setTemporaryPassword(email) {
  if (!email) {
    throw new Error('Email is required');
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Find user by email
    const userResult = await client.query(
      'SELECT id, email FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }
    
    const user = userResult.rows[0];
    
    // Generate a random temporary password
    const tempPassword = Math.random().toString(36).slice(2) + 
                         Math.random().toString(36).toUpperCase().slice(2);
    
    // Hash the temporary password
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    
    // Check if users_auth entry exists
    const authCheck = await client.query(
      'SELECT user_id FROM users_auth WHERE user_id = $1',
      [user.id]
    );
    
    if (authCheck.rows.length === 0) {
      // Create a new auth entry
      await client.query(
        'INSERT INTO users_auth (user_id, password_hash, verified) VALUES ($1, $2, true)',
        [user.id, hashedPassword]
      );
    } else {
      // Update existing auth entry
      await client.query(
        'UPDATE users_auth SET password_hash = $1 WHERE user_id = $2',
        [hashedPassword, user.id]
      );
    }
    
    await client.query('COMMIT');
    console.log(`Temporary password set for ${email}`);
    
    return {
      success: true,
      tempPassword
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error setting temporary password:', error);
    throw error;
  } finally {
    client.release();
  }
}

export { repairUserAuthTable };

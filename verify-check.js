import dotenv from 'dotenv';
import pool from './db.js';
import readline from 'readline';

dotenv.config();

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promise wrapper for readline question
function question(query) {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

// Check verification status for a user
async function checkVerificationStatus(email) {
  try {
    console.log(`Looking up user with email: ${email}`);
    
    // Find user
    const userResult = await pool.query(
      'SELECT id, email, username FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (userResult.rows.length === 0) {
      console.log('No user found with that email.');
      return null;
    }
    
    const user = userResult.rows[0];
    console.log(`Found user: ID=${user.id}, Username=${user.username}`);
    
    // Check auth record
    const authResult = await pool.query(
      'SELECT password_hash, verified FROM users_auth WHERE user_id = $1',
      [user.id]
    );
    
    if (authResult.rows.length === 0) {
      console.log('No auth record found for this user.');
      return {
        user,
        auth: null,
        verified: false
      };
    }
    
    const auth = authResult.rows[0];
    console.log(`Auth record: verified=${auth.verified}, has_password=${!!auth.password_hash}`);
    
    return {
      user,
      auth,
      verified: auth.verified
    };
  } catch (error) {
    console.error('Error checking verification status:', error);
    throw error;
  }
}

// Fix verification status
async function fixVerification(userId) {
  try {
    console.log(`Attempting to fix verification for user ID: ${userId}`);
    
    // Check if auth record exists
    const authCheck = await pool.query(
      'SELECT user_id FROM users_auth WHERE user_id = $1',
      [userId]
    );
    
    if (authCheck.rows.length === 0) {
      console.log('No auth record found, creating one...');
      await pool.query(
        'INSERT INTO users_auth (user_id, password_hash, verified) VALUES ($1, $2, true)',
        [userId, 'REQUIRES_RESET']
      );
      console.log('Created new auth record with verified=true');
    } else {
      console.log('Updating existing auth record...');
      await pool.query(
        'UPDATE users_auth SET verified = true WHERE user_id = $1',
        [userId]
      );
      console.log('Updated verification status to true');
    }
    
    // Check result
    const verificationCheck = await pool.query(
      'SELECT verified FROM users_auth WHERE user_id = $1',
      [userId]
    );
    
    if (verificationCheck.rows.length === 0) {
      console.log('ERROR: Failed to find auth record after update');
      return false;
    }
    
    console.log(`Verification status is now: ${verificationCheck.rows[0].verified}`);
    return verificationCheck.rows[0].verified;
  } catch (error) {
    console.error('Error fixing verification:', error);
    throw error;
  }
}

// Main function
async function main() {
  try {
    console.log('====== Email Verification Status Checker and Fixer ======');
    
    const email = await question('Enter email address to check: ');
    const result = await checkVerificationStatus(email);
    
    if (!result) {
      console.log('No action taken.');
      rl.close();
      return;
    }
    
    if (result.verified) {
      console.log('User is already verified, no action needed.');
      rl.close();
      return;
    }
    
    const fix = await question('User is NOT verified. Would you like to fix this? (y/n): ');
    
    if (fix.toLowerCase() === 'y') {
      const success = await fixVerification(result.user.id);
      
      if (success) {
        console.log('Verification status fixed successfully. User can now log in.');
      } else {
        console.log('Failed to fix verification status.');
      }
    } else {
      console.log('No changes made.');
    }
    
    rl.close();
  } catch (error) {
    console.error('Error in main function:', error);
    rl.close();
    process.exit(1);
  }
}

// Run the script
main().catch(err => {
  console.error('Unhandled error:', err);
  rl.close();
  process.exit(1);
});

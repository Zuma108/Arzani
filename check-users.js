import pool from './db.js';

async function checkUsers() {
  try {
    const result = await pool.query('SELECT id, username, email FROM users LIMIT 5');
    console.log('Users in database:');
    result.rows.forEach(user => {
      console.log(`ID: ${user.id}, Username: ${user.username}, Email: ${user.email}`);
    });
    
    if (result.rows.length === 0) {
      console.log('No users found. Creating a test user...');
      const createResult = await pool.query(
        'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email',
        ['testuser', 'test@example.com', 'hashedpassword123']
      );
      console.log('Created user:', createResult.rows[0]);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsers();

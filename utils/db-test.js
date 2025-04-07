import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create a pool connection using environment variables
const pool = new pg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

// Test database connection
async function testConnection() {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('Database connection successful:', res.rows[0]);
    return true;
  } catch (err) {
    console.error('Database connection error:', err);
    return false;
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the test if this file is executed directly
if (import.meta.url === new URL(import.meta.url).href) {
  testConnection()
    .then(success => {
      if (success) {
        console.log('Database connection test passed');
        process.exit(0);
      } else {
        console.error('Database connection test failed');
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('Test error:', err);
      process.exit(1);
    });
}

export { pool, testConnection };

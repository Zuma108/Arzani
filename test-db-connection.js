import dotenv from 'dotenv';
import pg from 'pg';

// Load environment variables
dotenv.config();

const { Pool } = pg;

// Create connection pool with your current configuration
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
    ssl: false // Disable SSL for local development
});

async function testConnection() {
    try {
        console.log('Testing database connection...');
        console.log('Connection details:', {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            database: process.env.DB_NAME,
            user: process.env.DB_USER
        });

        // Test basic connection
        const client = await pool.connect();
        console.log('✅ Successfully connected to PostgreSQL!');

        // Test a simple query
        const result = await client.query('SELECT NOW(), version()');
        console.log('✅ Database query successful!');
        console.log('Current time:', result.rows[0].now);
        console.log('PostgreSQL version:', result.rows[0].version);

        // Check if database exists
        const dbCheck = await client.query(
            "SELECT 1 FROM pg_database WHERE datname = $1",
            [process.env.DB_NAME]
        );
        
        if (dbCheck.rows.length > 0) {
            console.log('✅ Database exists!');
        } else {
            console.log('❌ Database does not exist!');
        }

        client.release();
        console.log('\n🎉 Database connection test completed successfully!');

    } catch (error) {
        console.error('❌ Database connection failed:');
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Troubleshooting tips:');
            console.log('1. Make sure PostgreSQL service is running');
            console.log('2. Check if the port 5432 is correct');
            console.log('3. Verify the host is localhost');
        } else if (error.code === '28P01') {
            console.log('\n💡 Authentication failed:');
            console.log('1. Check username and password');
            console.log('2. Make sure the user exists in PostgreSQL');
        } else if (error.code === '3D000') {
            console.log('\n💡 Database does not exist:');
            console.log('1. Create the database first');
            console.log('2. Run: createdb my-marketplace');
        }
    } finally {
        await pool.end();
    }
}

// Run the test
testConnection();
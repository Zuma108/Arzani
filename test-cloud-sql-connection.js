import pkg from 'pg';
const { Pool } = pkg;

// Test connection to Cloud SQL using the proxy
const testPool = new Pool({
  user: 'marketplace_user',
  password: 'Olumide123!',
  host: 'localhost',
  port: 5433, // Using the proxy port
  database: 'arzani_marketplace',
  ssl: false
});

async function testConnection() {
  try {
    console.log('Testing connection to Cloud SQL PostgreSQL 17...');
    
    // Test basic connectivity
    const client = await testPool.connect();
    console.log('✅ Successfully connected to Cloud SQL!');
    
    // Test database info
    const result = await client.query('SELECT version(), current_database(), current_user;');
    console.log('\n📊 Database Information:');
    console.log('Version:', result.rows[0].version);
    console.log('Database:', result.rows[0].current_database);
    console.log('User:', result.rows[0].current_user);
    
    // Test tables (if any exist)
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('\n📋 Existing tables:');
    if (tables.rows.length > 0) {
      tables.rows.forEach(row => console.log(`  - ${row.table_name}`));
    } else {
      console.log('  No tables found (empty database)');
    }
    
    client.release();
    console.log('\n✅ Connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    await testPool.end();
  }
}

testConnection();

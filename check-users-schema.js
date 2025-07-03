import pool from './db.js';

async function checkUsersTable() {
  try {
    console.log('Database connected, checking users table...');
    
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('👤 Users table schema:');
    result.rows.forEach(r => {
      console.log(`  ${r.column_name}: ${r.data_type} ${r.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Try to create test user with correct column names
    console.log('\n🔧 Creating test user...');
    
    // Check specific columns we need
    const hasEmail = result.rows.some(r => r.column_name === 'email');
    const hasUsername = result.rows.some(r => r.column_name === 'username'); 
    const hasPassword = result.rows.some(r => r.column_name === 'password');
    const hasPasswordHash = result.rows.some(r => r.column_name === 'password_hash');
    
    console.log(`Has email: ${hasEmail}, username: ${hasUsername}, password: ${hasPassword}, password_hash: ${hasPasswordHash}`);
    
    // Create minimal test user based on available columns
    if (hasEmail) {
      const userInsertQuery = `
        INSERT INTO users (id, email${hasUsername ? ', username' : ''}${hasPassword ? ', password' : ''}) 
        VALUES (999, 'test@a2a.local'${hasUsername ? ', \'a2a_test_user\'' : ''}${hasPassword ? ', \'test123\'' : ''})
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email${hasUsername ? ', username = EXCLUDED.username' : ''}
        RETURNING id, email${hasUsername ? ', username' : ''}
      `;
      
      console.log('Query:', userInsertQuery);
      
      const userResult = await pool.query(userInsertQuery);
      console.log('✅ Test user created/updated:', userResult.rows[0]);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsersTable();

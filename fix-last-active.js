import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function addLastActiveColumn() {
  try {
    console.log('Checking if last_active column exists...');
    
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'last_active'
    `);
    
    if (columnCheck.rows.length === 0) {
      console.log('Adding last_active column...');
      await pool.query('ALTER TABLE users ADD COLUMN last_active TIMESTAMP');
      
      console.log('Initializing last_active for existing users...');
      await pool.query('UPDATE users SET last_active = created_at WHERE last_active IS NULL');
      
      console.log('Creating index...');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active)');
      
      console.log('✅ last_active column added successfully');
    } else {
      console.log('✅ last_active column already exists');
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addLastActiveColumn();
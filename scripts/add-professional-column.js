import pool from '../db.js';

async function addProfessionalIdColumn() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Adding professional_id column to conversations table...');
    
    // Check if professional_id column already exists
    const columnCheckResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'conversations' AND column_name = 'professional_id'
    `);
    
    if (columnCheckResult.rows.length === 0) {
      console.log('  ➤ Adding professional_id column...');
      
      // Add professional_id column
      await client.query(`
        ALTER TABLE conversations 
        ADD COLUMN professional_id INTEGER
      `);
      
      console.log('  ✓ Column added');
      
      // Add foreign key constraint
      console.log('  ➤ Adding foreign key constraint...');
      await client.query(`
        ALTER TABLE conversations 
        ADD CONSTRAINT fk_conversations_professional_id 
        FOREIGN KEY (professional_id) REFERENCES professional_profiles(id)
      `);
      
      console.log('  ✓ Foreign key constraint added');
      
      // Create index
      console.log('  ➤ Creating index...');
      await client.query(`
        CREATE INDEX idx_conversations_professional_id ON conversations(professional_id)
      `);
      
      console.log('  ✓ Index created');
      
      console.log('✅ Professional ID column successfully added to conversations table!');
    } else {
      console.log('✅ Professional ID column already exists');
    }
    
    // Verify the changes
    const verificationResult = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'conversations' AND column_name = 'professional_id'
    `);
    
    console.log('\\n📋 Verification:');
    console.table(verificationResult.rows);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addProfessionalIdColumn()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { addProfessionalIdColumn };
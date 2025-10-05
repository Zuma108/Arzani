import pool from '../db.js';

async function directMigration() {
  console.log('🔄 Starting direct migration...');
  
  try {
    // Test basic connection
    const testResult = await pool.query('SELECT NOW() as current_time');
    console.log('✓ Database connected at:', testResult.rows[0].current_time);
    
    // Check current conversations table structure
    console.log('\\n📋 Current conversations table columns:');
    const currentColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'conversations' 
      ORDER BY ordinal_position
    `);
    console.table(currentColumns.rows);
    
    // Check if professional_id column exists
    const professionalIdCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'conversations' AND column_name = 'professional_id'
    `);
    
    if (professionalIdCheck.rows.length === 0) {
      console.log('\\n🔨 Adding professional_id column...');
      
      // Add the column (without foreign key first to avoid issues)
      await pool.query(`
        ALTER TABLE conversations 
        ADD COLUMN professional_id INTEGER
      `);
      
      console.log('✓ professional_id column added');
      
      // Verify it was added
      const verifyColumn = await pool.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'conversations' AND column_name = 'professional_id'
      `);
      
      if (verifyColumn.rows.length > 0) {
        console.log('✅ Column successfully added:', verifyColumn.rows[0]);
        
        // Now add the foreign key constraint
        console.log('\\n🔗 Adding foreign key constraint...');
        try {
          await pool.query(`
            ALTER TABLE conversations 
            ADD CONSTRAINT fk_conversations_professional_id 
            FOREIGN KEY (professional_id) REFERENCES professional_profiles(id)
          `);
          console.log('✓ Foreign key constraint added');
        } catch (fkError) {
          console.log('⚠️  Foreign key constraint failed (not critical):', fkError.message);
        }
        
        // Add index
        console.log('\\n📇 Adding index...');
        try {
          await pool.query(`
            CREATE INDEX idx_conversations_professional_id ON conversations(professional_id)
          `);
          console.log('✓ Index added');
        } catch (indexError) {
          console.log('⚠️  Index creation failed (not critical):', indexError.message);
        }
        
      } else {
        console.log('❌ Column verification failed');
      }
    } else {
      console.log('\\n✅ professional_id column already exists');
    }
    
    // Final verification
    console.log('\\n🔍 Final table structure:');
    const finalColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'conversations' 
      ORDER BY ordinal_position
    `);
    console.table(finalColumns.rows);
    
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    console.error('Full error details:', error);
  } finally {
    await pool.end();
  }
}

directMigration();
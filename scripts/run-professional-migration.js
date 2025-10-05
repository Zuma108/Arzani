import pool from '../db.js';

async function runProfessionalMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Starting professional migration...');
    
    // Start transaction
    await client.query('BEGIN');
    
    // Check if professional_id column already exists
    const columnCheckResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'conversations' AND column_name = 'professional_id'
    `);
    
    if (columnCheckResult.rows.length === 0) {
      console.log('Adding professional_id column to conversations table...');
      
      // Add professional_id column
      await client.query(`
        ALTER TABLE conversations 
        ADD COLUMN professional_id INTEGER REFERENCES professional_profiles(id)
      `);
      
      console.log('✓ Professional ID column added');
    } else {
      console.log('✓ Professional ID column already exists');
    }
    
    // Check if index exists
    const indexCheckResult = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'conversations' AND indexname = 'idx_conversations_professional_id'
    `);
    
    if (indexCheckResult.rows.length === 0) {
      console.log('Creating index on professional_id...');
      
      await client.query(`
        CREATE INDEX idx_conversations_professional_id ON conversations(professional_id)
      `);
      
      console.log('✓ Index created');
    } else {
      console.log('✓ Index already exists');
    }
    
    // Check if constraint exists
    const constraintCheckResult = await client.query(`
      SELECT conname 
      FROM pg_constraint 
      WHERE conname = 'chk_conversation_context'
    `);
    
    if (constraintCheckResult.rows.length === 0) {
      console.log('Adding conversation context constraint...');
      
      await client.query(`
        ALTER TABLE conversations 
        ADD CONSTRAINT chk_conversation_context 
        CHECK (
          (business_id IS NOT NULL AND professional_id IS NULL) OR
          (business_id IS NULL AND professional_id IS NOT NULL) OR
          (business_id IS NULL AND professional_id IS NULL)
        )
      `);
      
      console.log('✓ Constraint added');
    } else {
      console.log('✓ Constraint already exists');
    }
    
    // Check if saved_professionals table exists, create if not
    const savedProfessionalsTableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'saved_professionals'
    `);
    
    if (savedProfessionalsTableCheck.rows.length === 0) {
      console.log('Creating saved_professionals table...');
      
      await client.query(`
        CREATE TABLE saved_professionals (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          professional_id INTEGER NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(user_id, professional_id)
        )
      `);
      
      await client.query(`
        CREATE INDEX idx_saved_professionals_user_id ON saved_professionals(user_id)
      `);
      
      await client.query(`
        CREATE INDEX idx_saved_professionals_professional_id ON saved_professionals(professional_id)
      `);
      
      console.log('✓ saved_professionals table created');
    } else {
      console.log('✓ saved_professionals table already exists');
    }
    
    // Check if contact_forms table has professional_id column
    const contactFormsColumnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'contact_forms' AND column_name = 'professional_id'
    `);
    
    if (contactFormsColumnCheck.rows.length === 0) {
      console.log('Adding professional_id to contact_forms table...');
      
      await client.query(`
        ALTER TABLE contact_forms 
        ADD COLUMN professional_id INTEGER REFERENCES professional_profiles(id)
      `);
      
      await client.query(`
        ALTER TABLE contact_forms 
        ADD COLUMN form_type VARCHAR(50) DEFAULT 'business_inquiry'
      `);
      
      console.log('✓ contact_forms table updated');
    } else {
      console.log('✓ contact_forms already has professional support');
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('✅ Professional migration completed successfully!');
    
    // Verify the changes
    const verificationResult = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'conversations' 
      ORDER BY ordinal_position
    `);
    
    console.log('\\n📋 Current conversations table structure:');
    console.table(verificationResult.rows);
    
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runProfessionalMigration()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

export { runProfessionalMigration };

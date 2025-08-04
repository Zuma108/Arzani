import { fileURLToPath } from 'url';
import pool from '../db.js';

/**
 * Migration to fix verification columns - adds missing verification_notes column
 * to professional_verification_requests table
 */
async function fixVerificationColumns() {
  try {
    console.log('Running verification columns fix migration...');

    // Add missing verification_notes column to professional_verification_requests table
    await pool.query(`
      ALTER TABLE professional_verification_requests 
      ADD COLUMN IF NOT EXISTS verification_notes TEXT;
    `);
    
    // Second fix: Add verification_documents JSONB column if missing (replacing documents if needed)
    await pool.query(`
      DO $$ 
      BEGIN
        -- Check if column exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'professional_verification_requests' 
                       AND column_name = 'verification_documents') THEN
          -- Add the column
          ALTER TABLE professional_verification_requests 
          ADD COLUMN verification_documents JSONB;
          
          -- If we have a documents column, migrate data (safely)
          IF EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'professional_verification_requests' 
                    AND column_name = 'documents') THEN
            UPDATE professional_verification_requests 
            SET verification_documents = documents;
          END IF;
        END IF;
      END $$;
    `);

    console.log('✅ Verification columns fix completed successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Error fixing verification columns:', error);
    return { success: false, error: error.message };
  }
}

// Execute if run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fixVerificationColumns()
    .then(result => {
      if (result.success) {
        console.log('Migration completed successfully');
        process.exit(0);
      } else {
        console.error('Migration failed:', result.error);
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('Unhandled error during migration:', err);
      process.exit(1);
    });
}

// Export for importing elsewhere
export default fixVerificationColumns;
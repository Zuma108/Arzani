import { up } from '../../db/migrations/create_a2a_tables.js';

async function runMigration() {
  try {
    console.log('Running A2A database migration...');
    await up();
    console.log('✅ A2A migration completed successfully!');
  } catch (error) {
    console.error('❌ A2A migration failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runMigration();

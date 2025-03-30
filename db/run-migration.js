import { promises as fs } from 'fs';
import path from 'path';
import pool from '../db.js';

async function runMigration(migrationFile) {
  try {
    console.log(`Running migration: ${migrationFile}`);
    const filePath = path.join(process.cwd(), 'db', 'migrations', migrationFile);
    const sql = await fs.readFile(filePath, 'utf8');
    
    await pool.query(sql);
    console.log(`Migration ${migrationFile} completed successfully`);
    return true;
  } catch (error) {
    console.error(`Error running migration ${migrationFile}:`, error);
    return false;
  }
}

async function main() {
  if (process.argv.length < 3) {
    console.error('Please provide a migration file name');
    process.exit(1);
  }

  const migrationFile = process.argv[2];
  const success = await runMigration(migrationFile);
  
  if (success) {
    console.log('Migration completed successfully');
  } else {
    console.error('Migration failed');
    process.exit(1);
  }
  
  // Close the pool
  await pool.end();
}

main();

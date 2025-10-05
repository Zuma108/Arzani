#!/usr/bin/env node

import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use postgres user for the migration
const pool = new Pool({
    connectionString: 'postgresql://postgres:Olumide123!@localhost:5432/my-marketplace'
});

async function runMigration() {
    try {
        console.log('🚀 Starting token system migration with postgres user...');
        
        // Read the fixed migration file
        const migrationPath = path.join(__dirname, 'migrations', 'freemium_token_system_migration_fixed.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('📂 Migration file loaded successfully');
        
        // Execute the migration
        console.log('⚡ Executing migration...');
        const result = await pool.query(migrationSQL);
        
        console.log('✅ Migration completed successfully!');
        console.log('📊 Result:', result);
        
        // Verify some key tables were created
        console.log('\n🔍 Verifying migration results...');
        
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('user_tokens', 'token_transactions', 'contact_limitations', 'token_packages')
            ORDER BY table_name
        `);
        
        console.log('✅ Created tables:', tables.rows.map(r => r.table_name));
        
        // Check token packages
        const packages = await pool.query('SELECT name, token_amount, price_gbp FROM token_packages ORDER BY display_order');
        console.log('💎 Token packages:', packages.rows);
        
        // Test the helper functions
        console.log('\n🧪 Testing helper functions...');
        const balanceTest = await pool.query('SELECT get_user_token_balance(1) as balance');
        console.log('📊 Balance function test:', balanceTest.rows[0]);
        
        console.log('\n🎉 Token system migration completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run the migration
runMigration().catch(console.error);
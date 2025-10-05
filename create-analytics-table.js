#!/usr/bin/env node

import pkg from 'pg';
const { Pool } = pkg;

// Use postgres user for the migration
const pool = new Pool({
    connectionString: 'postgresql://postgres:Olumide123!@localhost:5432/my-marketplace'
});

async function createAnalyticsTable() {
    try {
        console.log('🚀 Creating purchase_analytics table...');
        
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS purchase_analytics (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                package_id INTEGER,
                amount_paid INTEGER NOT NULL,
                tokens_received INTEGER NOT NULL,
                stripe_session_id VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX IF NOT EXISTS idx_purchase_analytics_user ON purchase_analytics(user_id);
            CREATE INDEX IF NOT EXISTS idx_purchase_analytics_created ON purchase_analytics(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_purchase_analytics_session ON purchase_analytics(stripe_session_id) WHERE stripe_session_id IS NOT NULL;
        `;
        
        // Execute the migration
        await pool.query(createTableSQL);
        
        console.log('✅ purchase_analytics table created successfully!');
        
    } catch (error) {
        console.error('❌ Table creation failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run the migration
createAnalyticsTable().catch(console.error);
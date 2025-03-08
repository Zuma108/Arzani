import pool from '../db.js';

export async function createSubscriptionsTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS subscriptions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                subscription_type VARCHAR(50) NOT NULL,
                status VARCHAR(20) DEFAULT 'active',
                start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                end_date TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unique_user_subscription UNIQUE(user_id)
            );

            -- Add subscription columns to users table if they don't exist
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'users' AND column_name = 'subscription_type') THEN
                    ALTER TABLE users 
                    ADD COLUMN subscription_type VARCHAR(50),
                    ADD COLUMN subscription_end TIMESTAMP,
                    ADD COLUMN api_calls_count INTEGER DEFAULT 0;
                END IF;
            END $$;
        `);
        console.log('Subscriptions table created successfully');
    } catch (error) {
        console.error('Error creating subscriptions table:', error);
        throw error;
    }
}

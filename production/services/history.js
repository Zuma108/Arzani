import pool from '../db.js';

// Create business_history table if it doesn't exist
export async function createBusinessHistoryTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS business_history (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
                action_type TEXT,
                viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                metadata JSONB DEFAULT '{}',
                CONSTRAINT unique_recent_view UNIQUE (user_id, business_id, viewed_at)
            );

            CREATE INDEX IF NOT EXISTS idx_business_history_user ON business_history(user_id);
            CREATE INDEX IF NOT EXISTS idx_business_history_business ON business_history(business_id);
            CREATE INDEX IF NOT EXISTS idx_business_history_viewed_at ON business_history(viewed_at);
        `);
        console.log('Business history table verified');
    } catch (error) {
        console.error('Error creating business history table:', error);
        throw error;
    }
}

export async function addHistoryRecord(userId, businessId, actionType, metadata = {}) {
    const query = `
        INSERT INTO business_history (
            user_id, 
            business_id, 
            action_type, 
            metadata
        ) 
        VALUES (
            $1, 
            $2, 
            NULLIF($3, '')::TEXT, 
            COALESCE($4::JSONB, '{}'::JSONB)
        )
        ON CONFLICT (user_id, business_id, viewed_at) 
        DO UPDATE SET 
            viewed_at = CURRENT_TIMESTAMP,
            metadata = EXCLUDED.metadata
        RETURNING id, viewed_at;
    `;

    try {
        const result = await pool.query(query, [
            userId,
            businessId,
            actionType,
            JSON.stringify(metadata)
        ]);
        return result.rows[0];
    } catch (error) {
        console.error('Error adding history record:', error);
        throw error;
    }
}

export async function getHistoryForUser(userId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const query = `
        SELECT 
            h.id,
            h.action_type,
            h.viewed_at,
            h.metadata,
            h.business_id,    /* Explicitly include business_id */
            b.business_name,
            b.industry,
            b.price::TEXT as price
        FROM business_history h
        JOIN businesses b ON h.business_id = b.id
        WHERE h.user_id = $1
        ORDER BY h.viewed_at DESC
        LIMIT $2 OFFSET $3;
    `;

    const countQuery = `
        SELECT COUNT(*) 
        FROM business_history 
        WHERE user_id = $1;
    `;

    try {
        const [records, countResult] = await Promise.all([
            pool.query(query, [userId, limit, offset]),
            pool.query(countQuery, [userId])
        ]);

        const totalRecords = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(totalRecords / limit);

        return {
            history: records.rows,
            pagination: {
                currentPage: page,
                totalPages,
                totalRecords,
                hasMore: page < totalPages
            }
        };
    } catch (error) {
        console.error('Error retrieving history:', error);
        throw error;
    }
}

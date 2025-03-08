import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env with explicit path
dotenv.config({ path: path.join(__dirname, '.env') });

const { Pool } = pg;

const isProduction = process.env.NODE_ENV === 'production';

const connectionString = isProduction
  ? process.env.DATABASE_URL
  : `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

const pool = new Pool({
  connectionString,
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => {
  console.log('Database connected');
});

pool.on('error', (err) => {
  console.error('Database connection error:', err);
  process.exit(1);
});

export default pool;

// Add this function to create market trends materialized view
export async function createMarketTrendsView() {
    try {
        await pool.query(`
            CREATE MATERIALIZED VIEW IF NOT EXISTS market_trends_mv AS
            WITH daily_metrics AS (
                SELECT 
                    DATE_TRUNC('day', date_listed) as date,
                    industry,
                    location,
                    AVG(price::numeric) as avg_price,
                    COUNT(*) as listings_count,
                    AVG(CASE 
                        WHEN gross_revenue::numeric > 0 
                        THEN price::numeric / gross_revenue::numeric 
                        ELSE NULL 
                    END) as avg_multiple
                FROM businesses
                WHERE date_listed IS NOT NULL
                GROUP BY DATE_TRUNC('day', date_listed), industry, location
            )
            SELECT * FROM daily_metrics
            ORDER BY date DESC;

            CREATE UNIQUE INDEX IF NOT EXISTS market_trends_mv_idx 
            ON market_trends_mv (date, industry, location);
        `);
        
        console.log('Market trends materialized view created successfully');
    } catch (error) {
        console.error('Error creating market trends view:', error);
        throw error;
    }
}
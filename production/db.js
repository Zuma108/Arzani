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

// Create connection configuration
const connectionConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432
};

// Check explicit SSL setting before using production check
if (process.env.DB_SSL && process.env.DB_SSL.toLowerCase() === 'true') {
  console.log('Enabling SSL for database connection (from DB_SSL env var)');
  connectionConfig.ssl = { rejectUnauthorized: false };
} else if (process.env.DB_SSL && process.env.DB_SSL.toLowerCase() === 'false') {
  console.log('Explicitly disabling SSL for database connection (from DB_SSL env var)');
  // SSL explicitly disabled, don't add the ssl property
} else if (isProduction) {
  // Default behavior for production if DB_SSL not specified
  console.log('Enabling SSL for database connection (production environment)');
  connectionConfig.ssl = { rejectUnauthorized: false };
} else {
  console.log('SSL disabled for database connection (development environment)');
}

// Create the pool with the appropriate config
const pool = new Pool(connectionConfig);

pool.on('connect', () => {
  console.log('Database connected');
});

pool.on('error', (err) => {
  console.error('Database connection error:', err);
  if (!isProduction) {
    console.log('Database connection details:', {
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      ssl: connectionConfig.ssl ? 'enabled' : 'disabled'
    });
  }
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to the database:', err);
  } else {
    console.log('Database connected successfully at:', res.rows[0].now);
  }
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
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

// Function to determine if SSL should be enabled
function shouldUseSSL() {
  // First check for explicit boolean settings
  if (process.env.ENABLE_SSL === 'false' || process.env.DB_SSL === 'false' || process.env.DATABASE_SSL === 'false') {
    console.log('SSL explicitly disabled via environment variables');
    return false;
  }
  
  if (process.env.ENABLE_SSL === 'true' || process.env.DB_SSL === 'true' || process.env.DATABASE_SSL === 'true') {
    console.log('SSL explicitly enabled via environment variables');
    return true;
  }
  
  // Automatically disable SSL for localhost connections
  if (process.env.DATABASE_URL && (process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1'))) {
    console.log('Localhost detected in DATABASE_URL, disabling SSL');
    return false;
  }
  
  // Disable SSL for Google Cloud SQL connections (they use Cloud SQL proxy)
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('/cloudsql/')) {
    console.log('Google Cloud SQL proxy detected, disabling SSL');
    return false;
  }
  
  // Check for DATABASE_URL patterns that typically require SSL
  if (process.env.DATABASE_URL) {
    if (process.env.DATABASE_URL.includes('azure.com') || 
        process.env.DATABASE_URL.includes('rds.amazonaws.com')) {
      console.log('Cloud database detected, enabling SSL by default');
      return true;
    }
  }
  
  // Default to SSL in production only
  if (isProduction) {
    console.log('Production environment detected, enabling SSL by default');
    return true;
  }
  
  // Disable SSL by default in development
  console.log('Development environment detected, disabling SSL by default');
  return false;
}

// Create connection configuration
let connectionConfig;

// Check for DATABASE_URL first (Cloud SQL proxy format)
if (process.env.DATABASE_URL) {
  console.log('Using DATABASE_URL for connection');
  const useSSL = shouldUseSSL();
  console.log(`Database SSL setting: ${useSSL ? 'Enabled' : 'Disabled'}`);
  
  connectionConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: useSSL ? { rejectUnauthorized: false } : false
  };
} else {
  // Fall back to individual parameters
  console.log('Using individual parameters for connection');
  const useSSL = shouldUseSSL();
  console.log(`Database SSL setting: ${useSSL ? 'Enabled' : 'Disabled'}`);
  
  connectionConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
    ssl: useSSL ? { rejectUnauthorized: false } : false
  };
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
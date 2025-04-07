import pg from 'pg';

// Create a pool connection using environment variables
const pool = new pg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

/**
 * Ensure that all required tables for valuation exist in the database
 */
async function ensureValuationTables() {
  try {
    // Check if business_valuations table exists
    const valuationsTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'business_valuations'
      );
    `);
    
    const valuationsTableExists = valuationsTableCheck.rows[0].exists;
    
    if (!valuationsTableExists) {
      console.log('Creating business_valuations table...');
      await pool.query(`
        CREATE TABLE business_valuations (
          id SERIAL PRIMARY KEY,
          business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
          valuation_min NUMERIC NOT NULL,
          valuation_max NUMERIC NOT NULL,
          estimated_value NUMERIC NOT NULL,
          confidence INTEGER NOT NULL,
          multiple NUMERIC NOT NULL,
          multiple_type VARCHAR(50) NOT NULL,
          summary TEXT,
          factors JSONB,
          market_comparables JSONB,
          recommendations JSONB,
          data_used JSONB,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
        );
        
        CREATE INDEX ON business_valuations (business_id);
        CREATE INDEX ON business_valuations (user_id);
        CREATE INDEX ON business_valuations (created_at);
      `);
    }
    
    // Check if businesses table needs valuation columns
    const businessesColumnsCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'businesses' 
        AND column_name = 'valuation_min'
      );
    `);
    
    const valuationColumnsExist = businessesColumnsCheck.rows[0].exists;
    
    if (!valuationColumnsExist) {
      console.log('Adding valuation columns to businesses table...');
      await pool.query(`
        ALTER TABLE businesses
        ADD COLUMN valuation_min NUMERIC,
        ADD COLUMN valuation_max NUMERIC,
        ADD COLUMN valuation_confidence INTEGER,
        ADD COLUMN valuation_date TIMESTAMP WITH TIME ZONE,
        ADD COLUMN valuation_multiple NUMERIC,
        ADD COLUMN valuation_multiple_type VARCHAR(50),
        ADD COLUMN valuation_summary TEXT;
      `);
    }
    
    // Check if questionnaire_submissions table exists
    const questionnaireTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'questionnaire_submissions'
      );
    `);
    
    const questionnaireTableExists = questionnaireTableCheck.rows[0].exists;
    
    if (!questionnaireTableExists) {
      console.log('Creating questionnaire_submissions table...');
      await pool.query(`
        CREATE TABLE questionnaire_submissions (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255),
          business_name VARCHAR(255),
          industry VARCHAR(100),
          description TEXT,
          year_established INTEGER,
          years_in_operation INTEGER,
          contact_name VARCHAR(255),
          contact_phone VARCHAR(50),
          revenue NUMERIC,
          revenue_prev_year NUMERIC,
          revenue_2_years_ago NUMERIC,
          ebitda NUMERIC,
          ebitda_prev_year NUMERIC,
          ebitda_2_years_ago NUMERIC,
          cash_on_cash NUMERIC,
          ffe_value NUMERIC,
          ffe_items TEXT,
          growth_rate NUMERIC,
          growth_areas TEXT,
          growth_challenges TEXT,
          scalability VARCHAR(50),
          total_debt_amount NUMERIC,
          debt_transferable VARCHAR(50),
          debt_notes TEXT,
          debt_items JSONB,
          valuation_data JSONB,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          converted_to_business BOOLEAN DEFAULT FALSE,
          business_id INTEGER REFERENCES businesses(id) ON DELETE SET NULL,
          user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          anonymous_id TEXT UNIQUE
        );
        
        CREATE INDEX ON questionnaire_submissions (email);
        CREATE INDEX ON questionnaire_submissions (created_at);
        CREATE INDEX ON questionnaire_submissions (business_id);
        CREATE INDEX ON questionnaire_submissions (user_id);
        CREATE INDEX ON questionnaire_submissions (converted_to_business);
        CREATE INDEX ON questionnaire_submissions (anonymous_id);
      `);
    } else {
      // Check if anonymous_id column exists in questionnaire_submissions
      const anonymousIdCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'questionnaire_submissions' 
          AND column_name = 'anonymous_id'
        );
      `);
      
      const anonymousIdExists = anonymousIdCheck.rows[0].exists;
      
      if (!anonymousIdExists) {
        console.log('Adding anonymous_id column to questionnaire_submissions table...');
        await pool.query(`
          ALTER TABLE questionnaire_submissions
          ADD COLUMN anonymous_id TEXT UNIQUE;
          
          CREATE INDEX ON questionnaire_submissions (anonymous_id);
        `);
      }
    }
    
    console.log('Database tables for valuation are ready');
  } catch (error) {
    console.error('Error ensuring valuation tables:', error);
  }
}

export default ensureValuationTables;

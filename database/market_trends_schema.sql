
-- Check if the businesses table has all required columns
DO $$ 
BEGIN
    -- Add the column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='date_listed') THEN
        ALTER TABLE businesses ADD COLUMN date_listed TIMESTAMP DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='industry') THEN
        ALTER TABLE businesses ADD COLUMN industry VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='location') THEN
        ALTER TABLE businesses ADD COLUMN location VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='price') THEN
        ALTER TABLE businesses ADD COLUMN price VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='gross_revenue') THEN
        ALTER TABLE businesses ADD COLUMN gross_revenue VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='ebitda') THEN
        ALTER TABLE businesses ADD COLUMN ebitda VARCHAR(50);
    END IF;
    
    -- Create indexes on frequently queried columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='businesses' AND indexname='idx_businesses_industry') THEN
        CREATE INDEX idx_businesses_industry ON businesses(industry);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='businesses' AND indexname='idx_businesses_location') THEN
        CREATE INDEX idx_businesses_location ON businesses(location);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='businesses' AND indexname='idx_businesses_date_listed') THEN
        CREATE INDEX idx_businesses_date_listed ON businesses(date_listed);
    END IF;
END $$;

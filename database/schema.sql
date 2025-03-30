-- Check if the businesses table needs to be altered
DO $$ 
BEGIN
    -- Check if the images column exists and is of the right type
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'businesses' AND column_name = 'images'
    ) THEN
        -- Alter the column type if it's not text[]
        IF (
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_name = 'businesses' AND column_name = 'images'
        ) != 'ARRAY' THEN
            -- First try to cast any existing data to text[]
            BEGIN
                ALTER TABLE businesses 
                ALTER COLUMN images TYPE text[] USING 
                    CASE
                        WHEN images IS NULL THEN '{}'::text[]
                        WHEN images::text = '{}' THEN '{}'::text[]
                        -- Try to parse JSON if it's in JSON format
                        WHEN jsonb_typeof(images::jsonb) = 'array' THEN 
                            (SELECT array_agg(jsonb_array_elements_text(images::jsonb)))
                        ELSE ARRAY[images::text]
                    END;
                
                RAISE NOTICE 'Converted images column to text[] successfully';
            EXCEPTION WHEN OTHERS THEN
                -- If conversion fails, create a backup and reset
                RAISE NOTICE 'Conversion failed, creating backup and resetting column';
                ALTER TABLE businesses RENAME TO businesses_backup;
                
                -- Create businesses table with correct column types
                CREATE TABLE businesses (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    business_name VARCHAR(255) NOT NULL,
                    industry VARCHAR(100),
                    price NUMERIC,
                    description TEXT,
                    cash_flow NUMERIC,
                    gross_revenue NUMERIC,
                    ebitda NUMERIC,
                    inventory NUMERIC,
                    sales_multiple NUMERIC,
                    profit_margin NUMERIC,
                    debt_service NUMERIC,
                    cash_on_cash NUMERIC,
                    down_payment NUMERIC,
                    location VARCHAR(255),
                    ffe NUMERIC,
                    employees INTEGER,
                    reason_for_selling TEXT,
                    images TEXT[] DEFAULT '{}'::text[],
                    years_in_operation INTEGER,
                    recurring_revenue_percentage NUMERIC,
                    growth_rate NUMERIC,
                    intellectual_property TEXT[],
                    website_traffic INTEGER,
                    social_media_followers INTEGER,
                    is_active BOOLEAN DEFAULT TRUE,
                    date_listed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT check_images_length CHECK (array_length(images, 1) <= 5),
                    CONSTRAINT positive_price CHECK (price >= 0 OR price IS NULL)
                );
                
                -- Copy non-image data from backup
                INSERT INTO businesses (
                    user_id, business_name, industry, price, description, 
                    cash_flow, gross_revenue, ebitda, inventory, sales_multiple,
                    profit_margin, debt_service, cash_on_cash, down_payment, location,
                    ffe, employees, reason_for_selling, years_in_operation, date_listed,
                    created_at, updated_at
                )
                SELECT 
                    user_id, business_name, industry, price, description,
                    cash_flow, gross_revenue, ebitda, inventory, sales_multiple,
                    profit_margin, debt_service, cash_on_cash, down_payment, location,
                    ffe, employees, reason_for_selling, years_in_operation, date_listed,
                    created_at, updated_at
                FROM businesses_backup;
                
                RAISE NOTICE 'Created new businesses table with correct column types';
            END;
        END IF;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_businesses_user_id ON businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_businesses_industry ON businesses(industry);
CREATE INDEX IF NOT EXISTS idx_businesses_location ON businesses(location);
CREATE INDEX IF NOT EXISTS idx_businesses_price ON businesses(price);

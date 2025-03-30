-- Create business_inquiries table to store contact form submissions

-- Business inquiries table
CREATE TABLE IF NOT EXISTS business_inquiries (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id) ON DELETE SET NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255) NOT NULL,
    timeframe VARCHAR(100),
    message TEXT,
    newsletter BOOLEAN DEFAULT FALSE,
    user_email VARCHAR(255), -- The business owner's email
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'new'
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_business_inquiries_business_id ON business_inquiries(business_id);
CREATE INDEX IF NOT EXISTS idx_business_inquiries_created_at ON business_inquiries(created_at);
CREATE INDEX IF NOT EXISTS idx_business_inquiries_status ON business_inquiries(status);

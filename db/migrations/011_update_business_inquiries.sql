-- Add conversation_id to business_inquiries table

-- Check if conversation_id column already exists before adding it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'business_inquiries' AND column_name = 'conversation_id'
    ) THEN
        ALTER TABLE business_inquiries ADD COLUMN conversation_id INTEGER REFERENCES conversations(id) ON DELETE SET NULL;
    END IF;
END
$$;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_business_inquiries_conversation_id ON business_inquiries(conversation_id);

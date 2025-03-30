-- Create contact_forms table to store seller contact form data

-- Contact forms table
CREATE TABLE IF NOT EXISTS contact_forms (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_id INTEGER REFERENCES businesses(id) ON DELETE SET NULL,
    seller_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    interest_level VARCHAR(50),
    purchase_timeline VARCHAR(50),
    message TEXT,
    questions TEXT,
    contact_consent BOOLEAN DEFAULT FALSE,
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending'
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contact_forms_user_id ON contact_forms(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_forms_business_id ON contact_forms(business_id);
CREATE INDEX IF NOT EXISTS idx_contact_forms_conversation_id ON contact_forms(conversation_id);
CREATE INDEX IF NOT EXISTS idx_contact_forms_created_at ON contact_forms(created_at);

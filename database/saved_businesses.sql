CREATE TABLE IF NOT EXISTS saved_businesses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, business_id)
);

CREATE INDEX idx_saved_businesses_user ON saved_businesses(user_id);
CREATE INDEX idx_saved_businesses_business ON saved_businesses(business_id);

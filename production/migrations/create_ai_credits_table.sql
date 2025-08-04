-- Migration to create AI credits usage table

CREATE TABLE IF NOT EXISTS ai_credits_usage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    request_id VARCHAR(50) NOT NULL UNIQUE,
    request_type VARCHAR(20) NOT NULL, -- 'chat', 'image', etc.
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    status VARCHAR(10) NOT NULL, -- 'pending', 'completed', 'failed'
    error_message VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
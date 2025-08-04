-- Migration to create chat-related tables

-- Create the conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    type VARCHAR(20) NOT NULL DEFAULT 'direct',  -- 'direct' or 'group'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_archived BOOLEAN DEFAULT FALSE
);

-- Create the conversation_participants table
CREATE TABLE IF NOT EXISTS conversation_participants (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'participant',  -- 'owner', 'participant', 'admin'
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_read_message_id INTEGER DEFAULT 0,
    UNIQUE(conversation_id, user_id)
);

-- Create the messages table
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_system_message BOOLEAN DEFAULT FALSE
);

-- Create the attachments table
CREATE TABLE IF NOT EXISTS attachments (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    size INTEGER NOT NULL,
    type VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create the meetings table
CREATE TABLE IF NOT EXISTS meetings (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    organizer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    duration INTEGER NOT NULL,  -- in minutes
    video_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add last_active column to users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'last_active'
    ) THEN
        ALTER TABLE users ADD COLUMN last_active TIMESTAMPTZ;
    END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_attachments_conversation_id ON attachments(conversation_id);
CREATE INDEX IF NOT EXISTS idx_meetings_conversation_id ON meetings(conversation_id);
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active);
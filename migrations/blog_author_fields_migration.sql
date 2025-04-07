-- Migration to make blog posts work without requiring user profiles
-- This adds direct author fields to the blog_posts table

-- Add author fields directly to blog_posts table
DO $$
BEGIN
    -- Add author_name if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'blog_posts' AND column_name = 'author_name'
    ) THEN
        ALTER TABLE blog_posts ADD COLUMN author_name VARCHAR(255);
        RAISE NOTICE 'Added author_name column to blog_posts table';
    END IF;

    -- Add author_image if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'blog_posts' AND column_name = 'author_image'
    ) THEN
        ALTER TABLE blog_posts ADD COLUMN author_image VARCHAR(255);
        RAISE NOTICE 'Added author_image column to blog_posts table';
    END IF;

    -- Add author_bio if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'blog_posts' AND column_name = 'author_bio'
    ) THEN
        ALTER TABLE blog_posts ADD COLUMN author_bio TEXT;
        RAISE NOTICE 'Added author_bio column to blog_posts table';
    END IF;
END $$;

-- Copy data from users table to blog_posts for existing posts
DO $$
BEGIN
    -- Only attempt if we have existing posts linked to users
    IF EXISTS (
        SELECT 1 
        FROM blog_posts 
        WHERE author_id IS NOT NULL 
        AND author_name IS NULL
    ) THEN
        -- Update blog_posts with user data
        UPDATE blog_posts bp
        SET 
            author_name = u.username, 
            author_image = COALESCE(u.profile_picture, '/figma design exports/images.webp/arzani-icon-nobackground.png'),
            author_bio = COALESCE(u.bio, 'Arzani contributor')
        FROM users u
        WHERE bp.author_id = u.id
        AND bp.author_name IS NULL;
        
        RAISE NOTICE 'Migrated author data from users to blog_posts';
    END IF;
END $$;

-- Set default values for posts without author information
UPDATE blog_posts
SET 
    author_name = 'Arzani Team',
    author_image = '/figma design exports/images.webp/arzani-icon-nobackground.png',
    author_bio = 'The Arzani team provides expert insights on business valuation, market trends, and growth strategies for UK small businesses.'
WHERE 
    (author_name IS NULL OR author_name = '') 
    AND (author_id IS NULL OR NOT EXISTS (SELECT 1 FROM users WHERE id = blog_posts.author_id));

-- Make author_id nullable (if it's not already)
DO $$
BEGIN
    -- Check if author_id is NOT NULL
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'blog_posts' 
        AND column_name = 'author_id'
        AND is_nullable = 'NO'
    ) THEN
        -- Make it nullable
        ALTER TABLE blog_posts ALTER COLUMN author_id DROP NOT NULL;
        RAISE NOTICE 'Made author_id nullable in blog_posts table';
    END IF;
END $$;

-- Add an index on author_name for performance
CREATE INDEX IF NOT EXISTS idx_blog_posts_author_name ON blog_posts(author_name);

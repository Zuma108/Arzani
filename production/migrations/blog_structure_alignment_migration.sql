-- Blog Structure Alignment Migration
-- This migration aligns the blog_posts table structure with the programmatic content scripts

DO $$
BEGIN
    -- Add summary column if it doesn't exist (as an alias for excerpt)
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'blog_posts' AND column_name = 'summary'
    ) THEN
        ALTER TABLE blog_posts ADD COLUMN summary TEXT;
        
        -- Update existing records to use excerpt as summary if available
        UPDATE blog_posts 
        SET summary = excerpt 
        WHERE excerpt IS NOT NULL AND summary IS NULL;
    END IF;

    -- Add category column if it doesn't exist (as an alias for content_category)
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'blog_posts' AND column_name = 'category'
    ) THEN
        ALTER TABLE blog_posts ADD COLUMN category VARCHAR(255);
        
        -- Update existing records to use content_category as category if available
        UPDATE blog_posts 
        SET category = content_category 
        WHERE content_category IS NOT NULL AND category IS NULL;
    END IF;

    -- Add keywords column if it doesn't exist (as an alias for seo_keywords)
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'blog_posts' AND column_name = 'keywords'
    ) THEN
        ALTER TABLE blog_posts ADD COLUMN keywords TEXT;
        
        -- Update existing records to use seo_keywords as keywords if available
        UPDATE blog_posts 
        SET keywords = seo_keywords 
        WHERE seo_keywords IS NOT NULL AND keywords IS NULL;
    END IF;

    -- Add read_time column if it doesn't exist (as an alias for reading_time)
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'blog_posts' AND column_name = 'read_time'
    ) THEN
        ALTER TABLE blog_posts ADD COLUMN read_time INTEGER;
        
        -- Update existing records to use reading_time as read_time if available
        UPDATE blog_posts 
        SET read_time = reading_time 
        WHERE reading_time IS NOT NULL AND read_time IS NULL;
    END IF;

    -- Add published_date column if it doesn't exist (as an alias for publish_date)
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'blog_posts' AND column_name = 'published_date'
    ) THEN
        ALTER TABLE blog_posts ADD COLUMN published_date TIMESTAMP WITH TIME ZONE;
        
        -- Update existing records to use publish_date as published_date if available
        UPDATE blog_posts 
        SET published_date = publish_date 
        WHERE publish_date IS NOT NULL AND published_date IS NULL;
    END IF;

    -- Add author_avatar column if it doesn't exist (as an alias for author_image)
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'blog_posts' AND column_name = 'author_avatar'
    ) THEN
        ALTER TABLE blog_posts ADD COLUMN author_avatar VARCHAR(255);
        
        -- Update existing records to use author_image as author_avatar if available
        UPDATE blog_posts 
        SET author_avatar = author_image 
        WHERE author_image IS NOT NULL AND author_avatar IS NULL;
    END IF;
END $$;

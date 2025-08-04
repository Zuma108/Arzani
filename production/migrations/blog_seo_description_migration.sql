-- Blog SEO Description Migration
-- This migration adds the seo_description field to the blog_posts table

-- Add seo_description field to blog_posts table
DO $$
BEGIN
    -- Add seo_description if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'blog_posts' AND column_name = 'seo_description'
    ) THEN
        ALTER TABLE blog_posts ADD COLUMN seo_description TEXT;
        
        -- Update existing records to use meta_description as seo_description if available
        UPDATE blog_posts 
        SET seo_description = meta_description 
        WHERE meta_description IS NOT NULL AND seo_description IS NULL;
    END IF;
END $$;

-- Create index for SEO-related columns
CREATE INDEX IF NOT EXISTS blog_posts_seo_title_idx ON blog_posts(seo_title);
CREATE INDEX IF NOT EXISTS blog_posts_seo_keywords_idx ON blog_posts(seo_keywords);

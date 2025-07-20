-- Blog URL Structure Migration
-- This migration adds support for the new URL structure: /blog/[category]/[article-slug]

-- Add fields to support new URL structure
DO $$
BEGIN
    -- Add url_path if it doesn't exist (for storing the full path: /blog/category/slug)
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'blog_posts' AND column_name = 'url_path'
    ) THEN
        ALTER TABLE blog_posts ADD COLUMN url_path VARCHAR(255);
    END IF;
    
    -- Add canonical_url if it doesn't exist (for SEO canonical URL)
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'blog_posts' AND column_name = 'canonical_url'
    ) THEN
        ALTER TABLE blog_posts ADD COLUMN canonical_url VARCHAR(255);
    END IF;
    
    -- Add og_image if it doesn't exist (for social sharing)
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'blog_posts' AND column_name = 'og_image'
    ) THEN
        ALTER TABLE blog_posts ADD COLUMN og_image VARCHAR(255);
    END IF;
    
    -- Add og_description if it doesn't exist (for social sharing)
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'blog_posts' AND column_name = 'og_description'
    ) THEN
        ALTER TABLE blog_posts ADD COLUMN og_description VARCHAR(500);
    END IF;
END $$;

-- Create a function to generate URL paths for blog posts
CREATE OR REPLACE FUNCTION generate_blog_url_path()
RETURNS TRIGGER AS $$
DECLARE
    category_slug VARCHAR;
BEGIN
    -- Get the primary category for this post
    SELECT c.slug INTO category_slug
    FROM blog_categories c
    JOIN blog_post_categories pc ON c.id = pc.category_id
    WHERE pc.post_id = NEW.id
    LIMIT 1;
    
    -- If no category is found, use a default
    IF category_slug IS NULL THEN
        -- Check if content_category is set
        IF NEW.content_category IS NOT NULL THEN
            category_slug := NEW.content_category;
        ELSE
            category_slug := 'uncategorized';
        END IF;
    END IF;
    
    -- Generate the URL path
    NEW.url_path := '/blog/' || category_slug || '/' || NEW.slug;
    
    -- Generate canonical URL
    NEW.canonical_url := 'https://arzani.co.uk' || NEW.url_path;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically generate URL paths for new posts
DO $$
BEGIN
    -- Drop the trigger if it exists
    DROP TRIGGER IF EXISTS blog_post_url_path_trigger ON blog_posts;
    
    -- Create the trigger
    CREATE TRIGGER blog_post_url_path_trigger
    BEFORE INSERT OR UPDATE OF slug, content_category ON blog_posts
    FOR EACH ROW
    EXECUTE FUNCTION generate_blog_url_path();
END $$;

-- Update existing blog posts with URL paths
UPDATE blog_posts bp
SET url_path = '/blog/' || COALESCE(
    (SELECT c.slug 
     FROM blog_categories c
     JOIN blog_post_categories pc ON c.id = pc.category_id
     WHERE pc.post_id = bp.id
     LIMIT 1),
    COALESCE(bp.content_category, 'uncategorized')
) || '/' || bp.slug
WHERE bp.url_path IS NULL;

-- Update canonical URLs for existing posts
UPDATE blog_posts
SET canonical_url = 'https://arzani.co.uk' || url_path
WHERE canonical_url IS NULL AND url_path IS NOT NULL;

-- Create index on url_path for faster lookups
CREATE INDEX IF NOT EXISTS blog_posts_url_path_idx ON blog_posts(url_path);

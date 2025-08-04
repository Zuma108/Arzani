-- Blog Content Relationships Migration
-- This migration adds support for content clusters with pillar and supporting content

-- Create a table to track relationships between pillar and supporting content
CREATE TABLE IF NOT EXISTS blog_content_relationships (
    id SERIAL PRIMARY KEY,
    pillar_post_id INTEGER REFERENCES blog_posts(id) ON DELETE CASCADE,
    supporting_post_id INTEGER REFERENCES blog_posts(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) DEFAULT 'supporting',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_content_relationship UNIQUE (pillar_post_id, supporting_post_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS blog_pillar_post_idx ON blog_content_relationships(pillar_post_id);
CREATE INDEX IF NOT EXISTS blog_supporting_post_idx ON blog_content_relationships(supporting_post_id);

-- Add fields to support programmatic SEO
DO $$
BEGIN
    -- Add seo_title if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'blog_posts' AND column_name = 'seo_title'
    ) THEN
        ALTER TABLE blog_posts ADD COLUMN seo_title VARCHAR(255);
    END IF;

    -- Add seo_keywords if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'blog_posts' AND column_name = 'seo_keywords'
    ) THEN
        ALTER TABLE blog_posts ADD COLUMN seo_keywords VARCHAR(255);
    END IF;
    
    -- Add schema_markup if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'blog_posts' AND column_name = 'schema_markup'
    ) THEN
        ALTER TABLE blog_posts ADD COLUMN schema_markup TEXT;
    END IF;
    
    -- Add is_pillar flag if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'blog_posts' AND column_name = 'is_pillar'
    ) THEN
        ALTER TABLE blog_posts ADD COLUMN is_pillar BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add content_category if it doesn't exist (for programmatic categories)
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'blog_posts' AND column_name = 'content_category'
    ) THEN
        ALTER TABLE blog_posts ADD COLUMN content_category VARCHAR(100);
    END IF;
    
    -- Add target_keyword if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'blog_posts' AND column_name = 'target_keyword'
    ) THEN
        ALTER TABLE blog_posts ADD COLUMN target_keyword VARCHAR(255);
    END IF;
    
    -- Add secondary_keywords if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'blog_posts' AND column_name = 'secondary_keywords'
    ) THEN
        ALTER TABLE blog_posts ADD COLUMN secondary_keywords TEXT;
    END IF;
    
    -- Add buying_stage if it doesn't exist (awareness, consideration, decision)
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'blog_posts' AND column_name = 'buying_stage'
    ) THEN
        ALTER TABLE blog_posts ADD COLUMN buying_stage VARCHAR(50);
    END IF;
    
    -- Add cta_type if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'blog_posts' AND column_name = 'cta_type'
    ) THEN
        ALTER TABLE blog_posts ADD COLUMN cta_type VARCHAR(50);
    END IF;
    
    -- Add cta_text if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'blog_posts' AND column_name = 'cta_text'
    ) THEN
        ALTER TABLE blog_posts ADD COLUMN cta_text VARCHAR(255);
    END IF;
    
    -- Add cta_link if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'blog_posts' AND column_name = 'cta_link'
    ) THEN
        ALTER TABLE blog_posts ADD COLUMN cta_link VARCHAR(255);
    END IF;
    
    -- Add cta_conversion_count if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'blog_posts' AND column_name = 'cta_conversion_count'
    ) THEN
        ALTER TABLE blog_posts ADD COLUMN cta_conversion_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Set up the 6 main blog categories from the PRD
INSERT INTO blog_categories (name, slug, description)
VALUES 
    ('Business Acquisition', 'buying-a-business', 'Tips and guides for buying a business in the UK market'),
    ('Business Selling', 'selling-a-business', 'Expert advice on selling your business for maximum value'),
    ('Business Valuation', 'business-valuation', 'Learn how to accurately value your business using AI and traditional methods'),
    ('Industry Analysis', 'industry-analysis', 'Deep insights into various industry sectors and market trends'),
    ('AI in Business', 'ai-business-tools', 'How AI is transforming business buying, selling, and valuation'),
    ('Geographic Markets', 'location-guides', 'Location-specific business insights across the UK')
ON CONFLICT (slug) DO UPDATE
SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description;

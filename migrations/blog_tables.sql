-- Blog Database Tables Migration

-- Table for blog categories
CREATE TABLE IF NOT EXISTS blog_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for blog tags
CREATE TABLE IF NOT EXISTS blog_tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for blog posts
CREATE TABLE IF NOT EXISTS blog_posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    content TEXT NOT NULL,
    excerpt TEXT,
    meta_description VARCHAR(255),
    hero_image VARCHAR(255),
    author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Draft',
    is_featured BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    reading_time INTEGER DEFAULT 5,
    publish_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on slug for faster lookups
CREATE INDEX IF NOT EXISTS blog_posts_slug_idx ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS blog_posts_status_idx ON blog_posts(status);
CREATE INDEX IF NOT EXISTS blog_posts_publish_date_idx ON blog_posts(publish_date);

-- Junction table for posts and categories
CREATE TABLE IF NOT EXISTS blog_post_categories (
    post_id INTEGER REFERENCES blog_posts(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES blog_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, category_id)
);

-- Junction table for posts and tags
CREATE TABLE IF NOT EXISTS blog_post_tags (
    post_id INTEGER REFERENCES blog_posts(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES blog_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
);

-- Insert some default categories
INSERT INTO blog_categories (name, slug, description)
VALUES 
    ('Business Valuation', 'business-valuation', 'Learn how to accurately value your business in the UK market'),
    ('Market Trends', 'market-trends', 'Stay updated with the latest UK small business market trends'),
    ('Growth Strategies', 'growth-strategies', 'Effective strategies to grow your business value before selling'),
    ('Selling Advice', 'selling-advice', 'Expert advice on selling your business for maximum value'),
    ('Buying Advice', 'buying-advice', 'Tips and guidance for purchasing an existing business'),
    ('Funding', 'funding', 'Information about funding options for business acquisition')
ON CONFLICT (slug) DO NOTHING;

-- Insert some default tags
INSERT INTO blog_tags (name, slug)
VALUES 
    ('SME', 'sme'),
    ('Startups', 'startups'),
    ('Exit Strategy', 'exit-strategy'),
    ('Due Diligence', 'due-diligence'),
    ('Valuation', 'valuation'),
    ('UK Market', 'uk-market'),
    ('eCommerce', 'ecommerce'),
    ('Service Business', 'service-business'),
    ('Retail', 'retail'),
    ('Tech', 'tech')
ON CONFLICT (slug) DO NOTHING;

-- Create a sample blog post without requiring author
INSERT INTO blog_posts (
    title, 
    slug, 
    content, 
    excerpt, 
    meta_description, 
    hero_image, 
    status, 
    is_featured,
    reading_time,
    publish_date
) 
VALUES (
    'How to Value Your UK Small Business in 2025',
    'how-to-value-your-uk-small-business-in-2025',
    '<h2>Understanding Business Valuation</h2><p>Valuing a business accurately is crucial before selling. This comprehensive guide walks you through the process step by step...</p><h3>Multiple-Based Valuation Method</h3><p>One of the most common approaches is using earnings multiples. Typically, UK small businesses sell for 3-5 times their adjusted annual profit...</p><h3>Asset-Based Valuation</h3><p>Another approach focuses on the tangible and intangible assets of your business...</p><h2>Market Factors Affecting UK Business Values</h2><p>The current economic climate plays a significant role in determining your business value...</p>',
    'Understanding your business''s true market value is the critical first step in any exit strategy. Learn the proven methods UK professionals use to determine accurate business valuations in 2025.',
    'Discover how to accurately value your UK small business in 2025 with this comprehensive guide to valuation methods, market factors, and professional approaches.',
    'https://arzani-images1.s3.eu-west-2.amazonaws.com/blogs/business-valuation-hero.jpg',
    'Published',
    TRUE,
    8,
    NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- Get the sample post ID
DO $$
DECLARE
    sample_post_id INTEGER;
BEGIN
    -- Get the post ID
    SELECT id INTO sample_post_id FROM blog_posts WHERE slug = 'how-to-value-your-uk-small-business-in-2025' LIMIT 1;
    
    -- If post exists, add categories and tags
    IF sample_post_id IS NOT NULL THEN
        -- Link post to categories
        INSERT INTO blog_post_categories (post_id, category_id)
        SELECT sample_post_id, c.id 
        FROM blog_categories c 
        WHERE c.slug IN ('business-valuation', 'selling-advice')
        ON CONFLICT DO NOTHING;
        
        -- Link post to tags
        INSERT INTO blog_post_tags (post_id, tag_id)
        SELECT sample_post_id, t.id 
        FROM blog_tags t 
        WHERE t.slug IN ('valuation', 'sme', 'exit-strategy')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

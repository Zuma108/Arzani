-- Migration to fix blog hero image URLs that are stored in S3

-- Step 1: Create a backup of current hero images
CREATE TABLE IF NOT EXISTS blog_hero_image_backups (
    blog_id INTEGER NOT NULL,
    blog_slug VARCHAR(255) NOT NULL,
    old_hero_image VARCHAR(500),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert current values into backup table before updating
INSERT INTO blog_hero_image_backups (blog_id, blog_slug, old_hero_image)
SELECT 
    id, 
    slug, 
    hero_image
FROM blog_posts
WHERE hero_image IS NOT NULL;

-- Step 2: Update hero images that are relative paths to full S3 URLs
UPDATE blog_posts
SET 
    hero_image = CONCAT('https://arzani-images1.s3.eu-west-2.amazonaws.com', hero_image),
    updated_at = NOW()
WHERE 
    hero_image LIKE '/blogs/%' OR
    hero_image LIKE '/uploads/blogs/%';

-- Step 3: Fix URLs that have duplicated domains
UPDATE blog_posts
SET 
    hero_image = REGEXP_REPLACE(hero_image, 
        'https://arzani-images1.s3.eu-west-2.amazonaws.com/https://arzani-images1.s3.eu-west-2.amazonaws.com', 
        'https://arzani-images1.s3.eu-west-2.amazonaws.com'),
    updated_at = NOW()
WHERE 
    hero_image LIKE '%https://arzani-images1.s3.eu-west-2.amazonaws.com/https://arzani-images1.s3.eu-west-2.amazonaws.com%';

-- Step 4: Fix default hero image paths
UPDATE blog_posts
SET 
    hero_image = 'https://arzani-images1.s3.eu-west-2.amazonaws.com/blogs/default-blog-hero.jpg',
    updated_at = NOW()
WHERE 
    hero_image = '/figma design exports/images/default-blog-hero.jpg' OR
    hero_image = '/figma design exports/default-blog-hero.jpg' OR
    hero_image IS NULL OR
    hero_image = '';

-- Step 5: Log how many records were updated
DO $$
DECLARE
    relative_paths_count INTEGER;
    duplicate_domains_count INTEGER;
    default_images_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO relative_paths_count 
    FROM blog_hero_image_backups
    WHERE old_hero_image LIKE '/blogs/%' OR old_hero_image LIKE '/uploads/blogs/%';
    
    SELECT COUNT(*) INTO duplicate_domains_count 
    FROM blog_hero_image_backups
    WHERE old_hero_image LIKE '%https://arzani-images1.s3.eu-west-2.amazonaws.com/https://arzani-images1.s3.eu-west-2.amazonaws.com%';
    
    SELECT COUNT(*) INTO default_images_count 
    FROM blog_hero_image_backups
    WHERE old_hero_image = '/figma design exports/images/default-blog-hero.jpg' 
       OR old_hero_image = '/figma design exports/default-blog-hero.jpg'
       OR old_hero_image IS NULL
       OR old_hero_image = '';
    
    RAISE NOTICE 'Fixed % relative paths, % duplicate domains, and % default images', 
        relative_paths_count, duplicate_domains_count, default_images_count;
END $$;

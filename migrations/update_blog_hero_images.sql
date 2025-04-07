-- Migration script to update blog hero images from Excel spreadsheet data
-- This will replace "/figma design exports/images/default-blog-hero.jpg" with custom image paths

-- Step 1: Create a temporary table to hold spreadsheet data
DROP TABLE IF EXISTS temp_blog_image_mappings;

CREATE TEMPORARY TABLE temp_blog_image_mappings (
    blog_slug VARCHAR(255) NOT NULL,
    hero_image_path VARCHAR(500) NOT NULL,
    imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Import data from spreadsheet
-- IMPORTANT: Before running this migration, export your Excel spreadsheet to CSV
-- Then use the COPY command below or pgAdmin's import feature to populate the temp table
-- Example of how to import using psql COPY (adjust file path as needed):
/*
\COPY temp_blog_image_mappings(blog_slug, hero_image_path) FROM 'C:/path/to/your/exported/spreadsheet.csv' DELIMITER ',' CSV HEADER;
*/

-- MANUAL IMPORT OPTION: If you prefer, you can manually insert records like this:
-- Uncomment and customize these insert statements with your actual data from the spreadsheet
/*
INSERT INTO temp_blog_image_mappings (blog_slug, hero_image_path) VALUES
('how-to-value-your-uk-small-business-in-2025', '/uploads/blog/business-valuation-hero-2025.jpg'),
('marketing-strategies-for-small-businesses', '/uploads/blog/marketing-strategies-hero.jpg'),
('financing-options-for-business-acquisition', '/uploads/blog/financing-options-hero.jpg');
-- Add more rows here from your spreadsheet
*/

-- Step 3: Validation - Count records in the temporary table
DO $$
DECLARE
    import_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO import_count FROM temp_blog_image_mappings;
    
    IF import_count = 0 THEN
        RAISE EXCEPTION 'No records were imported into temp_blog_image_mappings. Please import your spreadsheet data first.';
    END IF;
    
    RAISE NOTICE 'Successfully imported % records from spreadsheet', import_count;
END $$;

-- Step 4: Check how many blog posts will be updated
DO $$
DECLARE
    update_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO update_count
    FROM blog_posts bp
    JOIN temp_blog_image_mappings tim ON bp.slug = tim.blog_slug
    WHERE bp.hero_image = '/figma design exports/images/default-blog-hero.jpg' 
       OR bp.hero_image IS NULL;
    
    RAISE NOTICE 'Will update % blog posts with new hero images', update_count;
END $$;

-- Step 5: Create a backup of current hero images
CREATE TABLE IF NOT EXISTS blog_hero_image_backups (
    blog_id INTEGER NOT NULL,
    blog_slug VARCHAR(255) NOT NULL,
    old_hero_image VARCHAR(500),
    new_hero_image VARCHAR(500),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert current values into backup table before updating
INSERT INTO blog_hero_image_backups (blog_id, blog_slug, old_hero_image, new_hero_image)
SELECT 
    bp.id, 
    bp.slug, 
    bp.hero_image,
    tim.hero_image_path
FROM blog_posts bp
JOIN temp_blog_image_mappings tim ON bp.slug = tim.blog_slug;

-- Step 6: Update the blog_posts with new hero images from the spreadsheet
UPDATE blog_posts bp
SET 
    hero_image = tim.hero_image_path,
    updated_at = NOW()
FROM temp_blog_image_mappings tim
WHERE bp.slug = tim.blog_slug
AND (bp.hero_image = '/figma design exports/images/default-blog-hero.jpg' 
     OR bp.hero_image IS NULL 
     OR bp.hero_image = '');

-- Step 7: Check and report how many records were updated
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count
    FROM blog_hero_image_backups
    WHERE updated_at > NOW() - INTERVAL '5 minutes';
    
    RAISE NOTICE 'Successfully updated % blog posts with new hero images', updated_count;
    
    -- List the updated blog posts
    RAISE NOTICE 'Updated the following posts:';
    FOR i IN (
        SELECT blog_slug, old_hero_image, new_hero_image 
        FROM blog_hero_image_backups
        WHERE updated_at > NOW() - INTERVAL '5 minutes'
        ORDER BY blog_slug
    ) LOOP
        RAISE NOTICE 'Blog: % | Old Image: % | New Image: %', 
                     i.blog_slug, 
                     COALESCE(i.old_hero_image, '[NULL]'), 
                     i.new_hero_image;
    END LOOP;
END $$;

-- Step 8: Clean up (drop the temporary table)
DROP TABLE temp_blog_image_mappings;

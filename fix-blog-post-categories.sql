-- SQL script to fix blog post content_category issues
-- Run this script to update posts with missing categories

-- Update "Should I sell my business? -UK" with appropriate category
UPDATE blog_posts
SET content_category = 'Selling A Business'
WHERE id = 9 AND content_category IS NULL;

-- Update "How to Value Your UK Small Business in 2025" with appropriate category
UPDATE blog_posts
SET content_category = 'Business Valuation'
WHERE id = 3 AND content_category IS NULL;

-- Normalize URL paths for all blog posts to ensure consistent format
UPDATE blog_posts
SET url_path = CONCAT('/blog/', 
                    REPLACE(LOWER(content_category), ' ', '-'), 
                    '/', 
                    slug)
WHERE content_category IS NOT NULL;

-- Set a default category for any remaining NULL content_category values
UPDATE blog_posts
SET content_category = 'Uncategorized'
WHERE content_category IS NULL;

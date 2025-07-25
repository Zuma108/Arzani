-- Additional HTML cleanup for remaining posts
-- This script removes various HTML tags from blog content

DO $$
DECLARE
    post_record RECORD;
    updated_content TEXT;
    cleanup_count INTEGER := 0;
BEGIN
    -- Process each post that contains HTML tags
    FOR post_record IN 
        SELECT id, content 
        FROM blog_posts 
        WHERE content ~ '<[^>]+>'  -- Regex to match any HTML tag
    LOOP
        -- Clean the content
        updated_content := post_record.content;
        
        -- Remove common HTML tags while preserving content
        updated_content := regexp_replace(updated_content, '</?html[^>]*>', '', 'gi');
        updated_content := regexp_replace(updated_content, '</?body[^>]*>', '', 'gi');
        updated_content := regexp_replace(updated_content, '</?head[^>]*>', '', 'gi');
        updated_content := regexp_replace(updated_content, '</?header[^>]*>', '', 'gi');
        updated_content := regexp_replace(updated_content, '</?footer[^>]*>', '', 'gi');
        updated_content := regexp_replace(updated_content, '</?main[^>]*>', '', 'gi');
        updated_content := regexp_replace(updated_content, '</?section[^>]*>', '', 'gi');
        updated_content := regexp_replace(updated_content, '</?article[^>]*>', '', 'gi');
        updated_content := regexp_replace(updated_content, '</?div[^>]*>', '', 'gi');
        updated_content := regexp_replace(updated_content, '</?span[^>]*>', '', 'gi');
        
        -- Convert H1-H6 tags to markdown
        updated_content := regexp_replace(updated_content, '<h1[^>]*>(.*?)</h1>', E'\n# \\1\n', 'gis');
        updated_content := regexp_replace(updated_content, '<h2[^>]*>(.*?)</h2>', E'\n## \\1\n', 'gis');
        updated_content := regexp_replace(updated_content, '<h3[^>]*>(.*?)</h3>', E'\n### \\1\n', 'gis');
        updated_content := regexp_replace(updated_content, '<h4[^>]*>(.*?)</h4>', E'\n#### \\1\n', 'gis');
        updated_content := regexp_replace(updated_content, '<h5[^>]*>(.*?)</h5>', E'\n##### \\1\n', 'gis');
        updated_content := regexp_replace(updated_content, '<h6[^>]*>(.*?)</h6>', E'\n###### \\1\n', 'gis');
        
        -- Convert paragraphs
        updated_content := regexp_replace(updated_content, '<p[^>]*>(.*?)</p>', E'\\1\n\n', 'gis');
        
        -- Convert line breaks
        updated_content := regexp_replace(updated_content, '<br[^>]*/?>', E'\n', 'gi');
        
        -- Convert bold and italic
        updated_content := regexp_replace(updated_content, '<(strong|b)[^>]*>(.*?)</(strong|b)>', '**\\2**', 'gis');
        updated_content := regexp_replace(updated_content, '<(em|i)[^>]*>(.*?)</(em|i)>', '*\\2*', 'gis');
        
        -- Convert links (preserve existing markdown links)
        updated_content := regexp_replace(updated_content, '<a[^>]*href="([^"]*)"[^>]*>(.*?)</a>', '[\\2](\\1)', 'gis');
        updated_content := regexp_replace(updated_content, '<a[^>]*href=''([^'']*)''[^>]*>(.*?)</a>', '[\\2](\\1)', 'gis');
        
        -- Remove any remaining HTML tags
        updated_content := regexp_replace(updated_content, '<[^>]+>', '', 'g');
        
        -- Clean up extra whitespace
        updated_content := regexp_replace(updated_content, E'\n\n\n+', E'\n\n', 'g');
        updated_content := trim(updated_content);
        
        -- Update the post if content changed
        IF updated_content != post_record.content THEN
            UPDATE blog_posts 
            SET content = updated_content,
                updated_at = NOW()
            WHERE id = post_record.id;
            
            cleanup_count := cleanup_count + 1;
            RAISE NOTICE 'Cleaned HTML from post ID %: %', post_record.id, 
                (SELECT title FROM blog_posts WHERE id = post_record.id);
        END IF;
    END LOOP;
    
    RAISE NOTICE 'HTML cleanup completed. % posts updated.', cleanup_count;
END $$;

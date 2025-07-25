-- Safe Rollback Script for HTML Cleanup Changes
-- This script safely handles foreign key constraints when reverting changes

DO $$
DECLARE
    post_record RECORD;
    delete_count INTEGER := 0;
    relationship_count INTEGER := 0;
BEGIN
    -- First, let's see what we're dealing with
    RAISE NOTICE 'Analyzing posts modified in the last 2 hours...';
    
    -- Count posts that would be affected
    SELECT COUNT(*) INTO delete_count
    FROM blog_posts 
    WHERE content_links->>'automated_generation' = 'true'
    AND updated_at > NOW() - INTERVAL '2 hours';
    
    RAISE NOTICE 'Found % automated posts modified in the last 2 hours', delete_count;
    
    -- Check for relationships that would prevent deletion
    SELECT COUNT(*) INTO relationship_count
    FROM blog_post_relationships r
    JOIN blog_posts p ON (r.source_post_id = p.id OR r.target_post_id = p.id)
    WHERE p.content_links->>'automated_generation' = 'true'
    AND p.updated_at > NOW() - INTERVAL '2 hours';
    
    RAISE NOTICE 'Found % relationships involving these posts', relationship_count;
    
    IF relationship_count > 0 THEN
        RAISE NOTICE 'Deleting relationships first to avoid foreign key constraints...';
        
        -- Delete relationships involving the posts we want to delete
        DELETE FROM blog_post_relationships
        WHERE source_post_id IN (
            SELECT id FROM blog_posts 
            WHERE content_links->>'automated_generation' = 'true'
            AND updated_at > NOW() - INTERVAL '2 hours'
        )
        OR target_post_id IN (
            SELECT id FROM blog_posts 
            WHERE content_links->>'automated_generation' = 'true'
            AND updated_at > NOW() - INTERVAL '2 hours'
        );
        
        GET DIAGNOSTICS relationship_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % relationships', relationship_count;
    END IF;
    
    -- Now safely delete the posts
    RAISE NOTICE 'Deleting automated posts...';
    
    FOR post_record IN 
        SELECT id, title 
        FROM blog_posts 
        WHERE content_links->>'automated_generation' = 'true'
        AND updated_at > NOW() - INTERVAL '2 hours'
        ORDER BY id
    LOOP
        DELETE FROM blog_posts WHERE id = post_record.id;
        RAISE NOTICE 'Deleted post ID %: %', post_record.id, post_record.title;
    END LOOP;
    
    GET DIAGNOSTICS delete_count = ROW_COUNT;
    RAISE NOTICE 'Rollback completed. Deleted % posts and % relationships.', delete_count, relationship_count;
    
END $$;

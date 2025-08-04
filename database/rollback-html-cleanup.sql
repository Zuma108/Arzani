-- Rollback Script for HTML Cleanup Changes
-- This script reverts the changes made by cleanup-remaining-html.sql
-- NOTE: This can only restore the previous state if you have a backup

-- Option 1: If you have a database backup from before the cleanup
-- UNCOMMENT the lines below and replace with your backup file path
-- 
-- \echo 'Restoring from backup...'
-- DROP DATABASE IF EXISTS my_marketplace_temp;
-- CREATE DATABASE my_marketplace_temp;
-- \c my_marketplace_temp
-- \i /path/to/your/backup.sql
-- \c my_marketplace
-- 
-- -- Copy the blog_posts table back
-- DELETE FROM blog_posts;
-- INSERT INTO blog_posts SELECT * FROM my_marketplace_temp.blog_posts;
-- DROP DATABASE my_marketplace_temp;

-- Option 2: Reset updated_at timestamps to identify recently changed posts
-- This will show you which posts were modified in the last cleanup
\echo 'Identifying posts modified in the last cleanup...'

SELECT 
    id, 
    title, 
    updated_at,
    LENGTH(content) as content_length
FROM blog_posts 
WHERE updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC;

\echo ''
\echo 'Posts modified in the last hour are shown above.'
\echo ''
\echo 'ROLLBACK OPTIONS:'
\echo '=================='
\echo ''
\echo '1. DATABASE BACKUP RESTORATION (Recommended if you have a backup):'
\echo '   - Stop your application'
\echo '   - Run: pg_restore -d my_marketplace /path/to/your/backup'
\echo '   - Restart your application'
\echo ''
\echo '2. MANUAL CONTENT RESTORATION:'
\echo '   - If you have the original content saved elsewhere'
\echo '   - Update specific posts using UPDATE statements'
\echo ''
\echo '3. AUTOMATED BLOG REGENERATION:'
\echo '   - Delete the affected posts and regenerate them'
\echo '   - This will create fresh content but lose any manual edits'
\echo ''
\echo 'WARNING: There is no automatic way to perfectly revert content changes'
\echo 'without a backup. The cleanup removed HTML tags and converted them to'
\echo 'markdown, which cannot be perfectly reversed.'
\echo ''

-- Option 3: Prepare for selective rollback (if you want to delete and regenerate specific posts)
-- UNCOMMENT the lines below if you want to see which posts could be regenerated

-- \echo 'Posts that could be safely deleted and regenerated:'
-- SELECT 
--     id, 
--     title,
--     content_links->>'checklist_id' as checklist_id,
--     content_links->>'automated_generation' as was_automated
-- FROM blog_posts 
-- WHERE content_links->>'automated_generation' = 'true'
-- AND updated_at > NOW() - INTERVAL '1 hour'
-- ORDER BY id;

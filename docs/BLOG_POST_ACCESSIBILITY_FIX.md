# Blog Post Accessibility Fix

This document outlines the issues found with blog post accessibility and provides instructions for fixing them.

## Issues Identified

1. **Missing Content Categories**: Some blog posts have `NULL` content_category values, which breaks the URL pattern `/blog/[category]/[slug]`.

2. **URL Format Mismatch**: The URL paths in the database have spaces in the category names (e.g., `/blog/Business Growth/article-slug`), but the routes expect hyphenated lowercase format (e.g., `/blog/business-growth/article-slug`).

3. **Case Sensitivity**: The category values in the database don't match the expected format in the URL, causing mismatches.

## Controller Fix (Already Applied)

The following fix has been applied to the `blogController_new.js` file to normalize category strings for comparison:

```javascript
// Normalize category strings for comparison (remove spaces, lowercase)
const normalizedRequestCategory = category.toLowerCase().replace(/\s+/g, '-');
const normalizedPostCategory = post.content_category ? 
  post.content_category.toLowerCase().replace(/\s+/g, '-') : 
  'uncategorized';

// Verify that the post is in the correct category
if (normalizedPostCategory !== normalizedRequestCategory) {
  // Use the normalized version of post.content_category for the redirect
  return res.redirect(`/blog/${normalizedPostCategory}/${post.slug}`);
}
```

## Database Fix (To Be Applied)

Run the following scripts to fix the database issues:

### 1. Check Current Accessibility Issues

```bash
node check-blog-url-accessibility.js
```

This will scan all published blog posts and report any URL accessibility issues.

### 2. Fix Categories and URL Paths

```bash
node fix-blog-post-categories.js
```

This script will:
- Update posts with NULL content_category values
- Normalize URL paths for all blog posts
- Set a default category for any remaining posts with NULL categories

### 3. Verify the Fix

After running the fix script, run the check script again to verify that all issues have been resolved:

```bash
node check-blog-url-accessibility.js
```

## Manual SQL Fix (Alternative)

If you prefer to run SQL directly:

```sql
-- Run this script in your database client
\i fix-blog-post-categories.sql
```

## Additional Notes

- The controller modification provides a fallback that will handle URL normalization, even if the database values aren't perfectly formatted.
- This fix preserves all existing content while ensuring URLs work correctly.
- For future blog posts, make sure to consistently assign appropriate content_category values.

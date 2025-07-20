import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../db.js';
import { create } from 'xmlbuilder2';
import fs from 'fs';
import { requireWebhookAuth } from '../middleware/webhookAuth.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fetch blog data from the database - expanded to include all published posts
async function getBlogData() {
  try {
    // Get categories
    const categoriesResult = await db.query(
      'SELECT * FROM blog_categories ORDER BY name'
    );
    
    // Get tags
    const tagsResult = await db.query(
      'SELECT * FROM blog_tags ORDER BY name'
    );
    
    // Get ALL published posts - not limited anymore, include url_path for programmatic SEO
    const postsResult = await db.query(
      'SELECT id, title, slug, publish_date, updated_at, url_path FROM blog_posts ' +
      'WHERE status = $1 ORDER BY publish_date DESC',
      ['Published']
    );
    
    return {
      categories: categoriesResult.rows,
      tags: tagsResult.rows,
      posts: postsResult.rows
    };
  } catch (error) {
    console.error('Error fetching blog data for sitemap:', error);
    return {
      categories: [],
      tags: [],
      posts: []
    };
  }
}

// Generate XML sitemap dynamically
async function generateXmlSitemap() {
  try {
    const { categories, tags, posts } = await getBlogData();
    
    const root = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('urlset', { xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9' });
    
    // Add homepage
    root.ele('url')
      .ele('loc').txt('https://www.arzani.co.uk/').up()
      .ele('lastmod').txt(new Date().toISOString().split('T')[0]).up()
      .ele('changefreq').txt('weekly').up()
      .ele('priority').txt('1.0').up();
    
    // Add main product pages from sitemap.xml
    const mainPages = [
      { url: 'homepage', changefreq: 'monthly', priority: '0.9' },
      { url: 'marketplace-landing', changefreq: 'monthly', priority: '0.9' },
      { url: 'seller-questionnaire', changefreq: 'monthly', priority: '0.9' },
      { url: 'marketplace2', changefreq: 'daily', priority: '0.9' },
      { url: 'faq', changefreq: 'monthly', priority: '0.7' },
      { url: 'login', changefreq: 'monthly', priority: '0.6' },
      { url: 'signup', changefreq: 'monthly', priority: '0.6' },
      { url: 'pricing', changefreq: 'monthly', priority: '0.8' },
      { url: 'terms', changefreq: 'yearly', priority: '0.4' },
      { url: 'privacy', changefreq: 'yearly', priority: '0.4' },
      { url: 'cookies', changefreq: 'yearly', priority: '0.4' },
      { url: 'sitemap', changefreq: 'monthly', priority: '0.3' }
    ];
    
    mainPages.forEach(page => {
      root.ele('url')
        .ele('loc').txt(`https://www.arzani.co.uk/${page.url}`).up()
        .ele('lastmod').txt(new Date().toISOString().split('T')[0]).up()
        .ele('changefreq').txt(page.changefreq).up()
        .ele('priority').txt(page.priority).up();
    });
    
    // Add blog main page
    root.ele('url')
      .ele('loc').txt('https://www.arzani.co.uk/blog').up()
      .ele('lastmod').txt(new Date().toISOString().split('T')[0]).up()
      .ele('changefreq').txt('daily').up()
      .ele('priority').txt('0.8').up();
    
    // Add category pages
    categories.forEach(category => {
      root.ele('url')
        .ele('loc').txt(`https://www.arzani.co.uk/blog/category/${category.slug}`).up()
        .ele('lastmod').txt(new Date().toISOString().split('T')[0]).up()
        .ele('changefreq').txt('weekly').up()
        .ele('priority').txt('0.7').up();
    });
    
    // Add tag pages
    tags.forEach(tag => {
      root.ele('url')
        .ele('loc').txt(`https://www.arzani.co.uk/blog/tag/${tag.slug}`).up()
        .ele('lastmod').txt(new Date().toISOString().split('T')[0]).up()
        .ele('changefreq').txt('weekly').up()
        .ele('priority').txt('0.6').up();
    });
    
    // Add individual blog posts - note that we use either updated_at or publish_date
    // for the lastmod value to ensure the most recent date is used
    posts.forEach(post => {
      const lastmod = post.updated_at && new Date(post.updated_at) > new Date(post.publish_date) 
        ? new Date(post.updated_at).toISOString().split('T')[0] 
        : new Date(post.publish_date).toISOString().split('T')[0];
      
      // Check if the post has a custom url_path field (for programmatic SEO)
      const postUrl = post.url_path 
        ? `https://www.arzani.co.uk${post.url_path}`
        : `https://www.arzani.co.uk/blog/${post.slug}`;
      
      root.ele('url')
        .ele('loc').txt(postUrl).up()
        .ele('lastmod').txt(lastmod).up()
        .ele('changefreq').txt('monthly').up()
        .ele('priority').txt('0.7').up();
    });
    
    const xml = root.end({ prettyPrint: true });
    
    // Write to file
    const sitemapPath = path.join(__dirname, '../public/sitemap.xml');
    fs.writeFileSync(sitemapPath, xml);
    
    console.log(`Sitemap generated with ${posts.length} blog posts, ${categories.length} categories, and ${tags.length} tags`);
    
    return xml;
  } catch (error) {
    console.error('Error generating XML sitemap:', error);
    throw error;
  }
}

// Make the generateXmlSitemap function available for direct import
export { generateXmlSitemap };

// Route for HTML sitemap
router.get('/sitemap', async (req, res) => {
  try {
    const blogData = await getBlogData();
    
    res.render('sitemap', {
      blogCategories: blogData.categories,
      blogTags: blogData.tags,
      recentBlogPosts: blogData.posts.slice(0, 20) // Limit to 20 posts for HTML sitemap
    });
  } catch (error) {
    console.error('Error rendering HTML sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

// Serve the XML sitemap - dynamic generation option
router.get('/sitemap.xml', async (req, res) => {
  try {
    // Always generate fresh sitemap to ensure new n8n-created content is included
    const xml = await generateXmlSitemap();
    res.header('Content-Type', 'application/xml');
    return res.send(xml);
  } catch (error) {
    console.error('Error serving XML sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

// Trigger regeneration of the sitemap (admin endpoint)
router.post('/admin/regenerate-sitemap', async (req, res) => {
  try {
    await generateXmlSitemap();
    res.json({ success: true, message: 'Sitemap regenerated successfully' });
  } catch (error) {
    console.error('Error regenerating sitemap:', error);
    res.status(500).json({ success: false, error: 'Failed to regenerate sitemap' });
  }
});

// n8n webhook endpoint to regenerate sitemap when content is published
// This endpoint is designed to work with the n8n workflow
router.post('/webhooks/n8n/update-sitemap', requireWebhookAuth, async (req, res) => {
  try {
    console.log('Received webhook from n8n to update sitemap:', req.body);
    
    // Extract slug information if available (for logging/debugging)
    const postSlug = req.body.postSlug || 'unknown';
    const source = req.body.source || 'n8n';
    
    console.log(`Regenerating sitemap due to update from ${source}, post: ${postSlug}`);
    
    // Generate the sitemap
    await generateXmlSitemap();
    
    // Respond with success
    res.json({ 
      success: true, 
      message: 'Sitemap regenerated successfully via n8n webhook',
      timestamp: new Date().toISOString(),
      postProcessed: postSlug
    });
  } catch (error) {
    console.error('Error regenerating sitemap via n8n webhook:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to regenerate sitemap',
      message: error.message
    });
  }
});

// Ping route to check if the sitemap service is running
router.get('/sitemap/status', async (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'sitemap',
    timestamp: new Date().toISOString()
  });
});

export default router;

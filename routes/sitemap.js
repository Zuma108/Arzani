import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../db.js';
import { create } from 'xmlbuilder2';
import fs from 'fs';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fetch blog data from the database
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
    
    // Get recent posts (limit to 10)
    const postsResult = await db.query(
      'SELECT id, title, slug, publish_date FROM blog_posts ' +
      'WHERE status = $1 ORDER BY publish_date DESC LIMIT 10',
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
    
    // Add individual blog posts
    posts.forEach(post => {
      const lastmod = post.publish_date ? new Date(post.publish_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      
      root.ele('url')
        .ele('loc').txt(`https://www.arzani.co.uk/blog/${post.slug}`).up()
        .ele('lastmod').txt(lastmod).up()
        .ele('changefreq').txt('monthly').up()
        .ele('priority').txt('0.7').up();
    });
    
    // Add other static pages (abbreviated)
    // ...
    
    const xml = root.end({ prettyPrint: true });
    
    // Write to file
    const sitemapPath = path.join(__dirname, '../public/sitemap.xml');
    fs.writeFileSync(sitemapPath, xml);
    
    return xml;
  } catch (error) {
    console.error('Error generating XML sitemap:', error);
    throw error;
  }
}

// Route for HTML sitemap
router.get('/sitemap', async (req, res) => {
  try {
    const blogData = await getBlogData();
    
    res.render('sitemap', {
      blogCategories: blogData.categories,
      blogTags: blogData.tags,
      recentBlogPosts: blogData.posts
    });
  } catch (error) {
    console.error('Error rendering HTML sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

// Serve the XML sitemap - dynamic generation option
router.get('/sitemap.xml', async (req, res) => {
  try {
    // Dynamically generate the sitemap (uncomment to use dynamic generation)
    // const xml = await generateXmlSitemap();
    // res.header('Content-Type', 'application/xml');
    // return res.send(xml);
    
    // Serve the static file (default)
    res.header('Content-Type', 'application/xml');
    res.sendFile('sitemap.xml', { root: './public' });
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

export default router;

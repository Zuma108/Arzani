/**
 * Database Setup Script
 * This script sets up and ensures all required database tables exist
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../db.js';

// Get current directory name (for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Set up blog database tables if they don't exist
 */
async function setupBlogDatabase() {
  try {
    console.log('Checking blog database tables...');
    
    // Check if blog tables exist
    const checkQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'blog_posts'
      )
    `;
    const { rows } = await db.query(checkQuery);
    const blogTablesExist = rows[0].exists;
    
    if (blogTablesExist) {
      console.log('Blog tables already exist. Skipping setup.');
      return true;
    }
    
    console.log('Blog tables do not exist. Creating them...');
    
    // Read the SQL file content
    const sqlFilePath = path.join(__dirname, '..', 'migrations', 'blog_tables.sql');
    
    if (!fs.existsSync(sqlFilePath)) {
      console.error(`Error: SQL file not found at ${sqlFilePath}`);
      console.error('Creating migrations directory...');
      
      // Create migrations directory if it doesn't exist
      const migrationsDir = path.join(__dirname, '..', 'migrations');
      if (!fs.existsSync(migrationsDir)) {
        fs.mkdirSync(migrationsDir, { recursive: true });
      }
      
      // Create a basic blog_tables.sql file
      const basicSqlContent = `
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
      `;
      
      fs.writeFileSync(sqlFilePath, basicSqlContent);
      console.log(`Created basic blog_tables.sql file at ${sqlFilePath}`);
    }
    
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Execute the SQL commands
    await db.query(sqlContent);
    
    console.log('Blog database tables created successfully!');
    return true;
  } catch (error) {
    console.error('Error setting up blog database tables:', error);
    console.error('Error details:', error.stack);
    return false;
  }
}

/**
 * Create Default Blog Assets
 * Ensures all the default images and assets for blogs exist
 */
async function ensureDefaultBlogAssets() {
  try {
    console.log('Checking default blog assets...');
    
    const publicDir = path.join(__dirname, '..', 'public');
    const figmaDir = path.join(publicDir, 'figma design exports');
    const imagesDir = path.join(figmaDir, 'images');
    
    // Create directories if they don't exist
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    if (!fs.existsSync(figmaDir)) {
      fs.mkdirSync(figmaDir, { recursive: true });
    }
    
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }
    
    // Check for default avatar
    const defaultAvatarPath = path.join(imagesDir, 'default-avatar.png');
    if (!fs.existsSync(defaultAvatarPath)) {
      console.log('Default avatar image not found at:', defaultAvatarPath);
      console.log('Please add a default avatar image at this location');
    }
    
    // Check for default blog hero image
    const defaultHeroPath = path.join(imagesDir, 'default-blog-hero.jpg');
    if (!fs.existsSync(defaultHeroPath)) {
      console.log('Default blog hero image not found at:', defaultHeroPath);
      console.log('Please add a default blog hero image at this location');
    }
    
    return true;
  } catch (error) {
    console.error('Error ensuring default blog assets:', error);
    return false;
  }
}

/**
 * Run all database migrations and setup
 */
async function runAllMigrations() {
  try {
    await setupBlogDatabase();
    await ensureDefaultBlogAssets();
    console.log('All migrations completed successfully.');
  } catch (error) {
    console.error('Migration error:', error);
  }
}

// Run migrations when this script is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('Running database setup script...');
  runAllMigrations().then(() => {
    console.log('Database setup complete. Exiting.');
    process.exit(0);
  }).catch((error) => {
    console.error('Database setup failed:', error);
    process.exit(1);
  });
}

export { setupBlogDatabase, ensureDefaultBlogAssets, runAllMigrations };

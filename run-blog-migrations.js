/**
 * Run Blog Migration Scripts
 * 
 * This script runs all the necessary SQL migrations for the programmatic blog system
 * to ensure the database has the correct schema before populating it with content.
 */

import db from './db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runBlogMigrations() {
  console.log('Running blog migration scripts...');
  
  try {
    // Get all SQL files from the migrations directory
    const migrationsDir = path.join(__dirname, 'migrations');
    const blogMigrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.startsWith('blog_') && file.endsWith('.sql'));
    
    console.log(`Found ${blogMigrationFiles.length} blog migration files:`);
    blogMigrationFiles.forEach(file => console.log(`- ${file}`));
    
    // Run each migration file
    for (const file of blogMigrationFiles) {
      console.log(`\nRunning migration: ${file}`);
      const sqlPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(sqlPath, 'utf8');
      
      // Execute the SQL
      await db.query(sql);
      console.log(`✓ Successfully applied migration: ${file}`);
    }
    
    // Additional critical migrations for the populate script
    console.log('\nRunning additional critical migrations...');
    
    // 1. Ensure summary column exists
    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'blog_posts' AND column_name = 'summary'
        ) THEN
          ALTER TABLE blog_posts ADD COLUMN summary TEXT;
          UPDATE blog_posts SET summary = excerpt WHERE excerpt IS NOT NULL AND summary IS NULL;
        END IF;
      END $$;
    `);
    
    // 2. Ensure category column exists
    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'blog_posts' AND column_name = 'category'
        ) THEN
          ALTER TABLE blog_posts ADD COLUMN category VARCHAR(255);
          UPDATE blog_posts SET category = content_category WHERE content_category IS NOT NULL AND category IS NULL;
        END IF;
      END $$;
    `);
    
    // 3. Ensure keywords column exists
    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'blog_posts' AND column_name = 'keywords'
        ) THEN
          ALTER TABLE blog_posts ADD COLUMN keywords TEXT;
          UPDATE blog_posts SET keywords = seo_keywords WHERE seo_keywords IS NOT NULL AND keywords IS NULL;
        END IF;
      END $$;
    `);
    
    // 4. Ensure read_time column exists
    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'blog_posts' AND column_name = 'read_time'
        ) THEN
          ALTER TABLE blog_posts ADD COLUMN read_time INTEGER;
          UPDATE blog_posts SET read_time = reading_time WHERE reading_time IS NOT NULL AND read_time IS NULL;
        END IF;
      END $$;
    `);
    
    // 5. Ensure published_date column exists
    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'blog_posts' AND column_name = 'published_date'
        ) THEN
          ALTER TABLE blog_posts ADD COLUMN published_date TIMESTAMP WITH TIME ZONE;
          UPDATE blog_posts SET published_date = publish_date WHERE publish_date IS NOT NULL AND published_date IS NULL;
        END IF;
      END $$;
    `);
    
    // 6. Ensure author_avatar column exists
    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'blog_posts' AND column_name = 'author_avatar'
        ) THEN
          ALTER TABLE blog_posts ADD COLUMN author_avatar VARCHAR(255);
          UPDATE blog_posts SET author_avatar = author_image WHERE author_image IS NOT NULL AND author_avatar IS NULL;
        END IF;
      END $$;
    `);
    
    // 7. Ensure blog_content_relationships table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS blog_content_relationships (
        id SERIAL PRIMARY KEY,
        pillar_post_id VARCHAR(255) NOT NULL,
        supporting_post_id VARCHAR(255) NOT NULL,
        relationship_type VARCHAR(50) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(pillar_post_id, supporting_post_id)
      );
    `);
    
    console.log('✓ Successfully applied all migrations');
    
    // Verify the database schema
    console.log('\nVerifying database schema...');
    
    const blogPostsColumns = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'blog_posts'
      ORDER BY ordinal_position;
    `);
    
    console.log(`blog_posts table has ${blogPostsColumns.rows.length} columns:`);
    blogPostsColumns.rows.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type})`);
    });
    
    const contentRelationshipsExists = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'blog_content_relationships'
      );
    `);
    
    console.log(`\nblog_content_relationships table exists: ${contentRelationshipsExists.rows[0].exists ? 'Yes' : 'No'}`);
    
    if (contentRelationshipsExists.rows[0].exists) {
      const relationshipsColumns = await db.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'blog_content_relationships'
        ORDER BY ordinal_position;
      `);
      
      console.log(`blog_content_relationships table has ${relationshipsColumns.rows.length} columns:`);
      relationshipsColumns.rows.forEach(col => {
        console.log(`- ${col.column_name} (${col.data_type})`);
      });
    }
    
    console.log('\nAll blog migrations completed successfully!');
    
  } catch (error) {
    console.error('Error running blog migrations:', error);
  } finally {
    await db.end();
  }
}

runBlogMigrations();

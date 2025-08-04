-- Enhanced Blog Interlinking System Database Migration
-- This migration adds tables and columns needed for the advanced interlinking features

-- Create blog post relationships table for semantic connections
CREATE TABLE IF NOT EXISTS blog_post_relationships (
  source_post_id INT REFERENCES blog_posts(id),
  target_post_id INT REFERENCES blog_posts(id),
  relationship_type VARCHAR(50), -- 'semantic', 'keyword', 'topic', 'continuation', etc.
  relationship_strength INT, -- 1-10 scale for prioritization
  shared_keywords TEXT[], -- Array of keywords shared between posts
  primary_keywords TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (source_post_id, target_post_id)
);

-- Create metrics table for tracking link equity
CREATE TABLE IF NOT EXISTS blog_post_link_metrics (
  post_id INT REFERENCES blog_posts(id) PRIMARY KEY,
  inbound_link_count INT DEFAULT 0,
  outbound_link_count INT DEFAULT 0,
  link_equity_score FLOAT DEFAULT 0,
  orphan_status BOOLEAN DEFAULT FALSE,
  last_analysis TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add columns to blog_posts table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'blog_posts' AND column_name = 'content_links') THEN
    ALTER TABLE blog_posts ADD COLUMN content_links JSONB;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'blog_posts' AND column_name = 'semantic_relationships') THEN
    ALTER TABLE blog_posts ADD COLUMN semantic_relationships JSONB;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'blog_posts' AND column_name = 'user_journey_position') THEN
    ALTER TABLE blog_posts ADD COLUMN user_journey_position VARCHAR(50);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'blog_posts' AND column_name = 'next_in_journey') THEN
    ALTER TABLE blog_posts ADD COLUMN next_in_journey VARCHAR(255);
  END IF;
  
  -- Adding the missing column 'primary_keywords' to the blog_posts table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'blog_posts' AND column_name = 'primary_keywords') THEN
    ALTER TABLE blog_posts ADD COLUMN primary_keywords TEXT;
  END IF;
END $$;

-- Create index for faster relationship queries
CREATE INDEX IF NOT EXISTS idx_blog_post_relationships_source ON blog_post_relationships(source_post_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_relationships_target ON blog_post_relationships(target_post_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_relationships_type ON blog_post_relationships(relationship_type);

-- Create index for faster link equity queries
CREATE INDEX IF NOT EXISTS idx_blog_post_link_metrics_orphan ON blog_post_link_metrics(orphan_status);
CREATE INDEX IF NOT EXISTS idx_blog_post_link_metrics_equity ON blog_post_link_metrics(link_equity_score);

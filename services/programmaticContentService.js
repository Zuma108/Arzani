/**
 * Programmatic Content Service
 * Handles generation and management of programmatic blog content
 */

import blogModel from '../models/blogModel.js';
import db from '../db.js';
import slugify from 'slugify';

class ProgrammaticContentService {
  /**
   * Generate a pillar post and its supporting content based on a template
   */
  async generateContentCluster(pillarData, supportingPostsData) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      // 1. Create the pillar post
      pillarData.is_pillar = true;
      pillarData.status = pillarData.status || 'Published';
      
      if (!pillarData.slug) {
        pillarData.slug = slugify(pillarData.title, {
          lower: true,
          strict: true,
          remove: /[*+~.()'"!:@]/g
        });
      }
      
      // Add schema markup for BlogPosting
      if (!pillarData.schema_markup) {
        pillarData.schema_markup = JSON.stringify({
          "@type": "BlogPosting",
          "headline": pillarData.title,
          "description": pillarData.meta_description || pillarData.excerpt,
          "author": {
            "@type": "Person",
            "name": pillarData.author_name || "Arzani Team"
          },
          "datePublished": pillarData.publish_date || new Date().toISOString(),
          "dateModified": new Date().toISOString(),
          "publisher": {
            "@type": "Organization",
            "name": "Arzani",
            "logo": {
              "@type": "ImageObject",
              "url": "https://arzani.co.uk/figma design exports/images.webp/arzani-icon-nobackground.png"
            }
          },
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": `https://arzani.co.uk/blog/${pillarData.content_category}/${pillarData.slug}/`
          }
        });
      }
      
      // Insert the pillar post
      const pillarResult = await client.query(`
        INSERT INTO blog_posts (
          title, slug, content, excerpt, meta_description, hero_image,
          author_name, author_image, author_bio, status, is_featured,
          reading_time, publish_date, is_pillar, content_category,
          target_keyword, secondary_keywords, buying_stage,
          cta_type, cta_text, cta_link, schema_markup, seo_title, seo_keywords
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
        RETURNING *
      `, [
        pillarData.title,
        pillarData.slug,
        pillarData.content,
        pillarData.excerpt || pillarData.content.substring(0, 150) + '...',
        pillarData.meta_description || pillarData.title,
        pillarData.hero_image || null,
        pillarData.author_name || 'Arzani Team',
        pillarData.author_image || null,
        pillarData.author_bio || null,
        pillarData.status,
        pillarData.is_featured || false,
        pillarData.reading_time || 15, // Pillar posts are longer
        pillarData.publish_date || new Date(),
        true, // is_pillar
        pillarData.content_category,
        pillarData.target_keyword,
        pillarData.secondary_keywords,
        pillarData.buying_stage || 'awareness',
        pillarData.cta_type || 'marketplace',
        pillarData.cta_text || 'Explore Business Listings',
        pillarData.cta_link || '/marketplace',
        pillarData.schema_markup,
        pillarData.seo_title || pillarData.title,
        pillarData.seo_keywords
      ]);
      
      const pillarPost = pillarResult.rows[0];
      
      // Add categories
      if (pillarData.categories && pillarData.categories.length > 0) {
        for (const categoryId of pillarData.categories) {
          await client.query(`
            INSERT INTO blog_post_categories (post_id, category_id)
            VALUES ($1, $2)
          `, [pillarPost.id, categoryId]);
        }
      } else {
        // Add default category based on content_category
        const categoryResult = await client.query(`
          SELECT id FROM blog_categories WHERE slug = $1
        `, [pillarData.content_category]);
        
        if (categoryResult.rows.length > 0) {
          await client.query(`
            INSERT INTO blog_post_categories (post_id, category_id)
            VALUES ($1, $2)
          `, [pillarPost.id, categoryResult.rows[0].id]);
        }
      }
      
      // Add tags
      if (pillarData.tags && pillarData.tags.length > 0) {
        for (const tagId of pillarData.tags) {
          await client.query(`
            INSERT INTO blog_post_tags (post_id, tag_id)
            VALUES ($1, $2)
          `, [pillarPost.id, tagId]);
        }
      }
      
      // 2. Create supporting posts
      const supportingPosts = [];
      
      if (supportingPostsData && supportingPostsData.length > 0) {
        for (const supportingData of supportingPostsData) {
          // Generate slug if not provided
          if (!supportingData.slug) {
            supportingData.slug = slugify(supportingData.title, {
              lower: true,
              strict: true,
              remove: /[*+~.()'"!:@]/g
            });
          }
          
          // Add schema markup for BlogPosting
          if (!supportingData.schema_markup) {
            supportingData.schema_markup = JSON.stringify({
              "@type": "BlogPosting",
              "headline": supportingData.title,
              "description": supportingData.meta_description || supportingData.excerpt,
              "author": {
                "@type": "Person",
                "name": supportingData.author_name || "Arzani Team"
              },
              "datePublished": supportingData.publish_date || new Date().toISOString(),
              "dateModified": new Date().toISOString(),
              "publisher": {
                "@type": "Organization",
                "name": "Arzani",
                "logo": {
                  "@type": "ImageObject",
                  "url": "https://arzani.co.uk/figma design exports/images.webp/arzani-icon-nobackground.png"
                }
              },
              "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": `https://arzani.co.uk/blog/${supportingData.content_category || pillarData.content_category}/${supportingData.slug}/`
              }
            });
          }
          
          // Insert supporting post
          const supportingResult = await client.query(`
            INSERT INTO blog_posts (
              title, slug, content, excerpt, meta_description, hero_image,
              author_name, author_image, author_bio, status, is_featured,
              reading_time, publish_date, is_pillar, content_category,
              target_keyword, secondary_keywords, buying_stage,
              cta_type, cta_text, cta_link, schema_markup, seo_title, seo_keywords
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
            RETURNING *
          `, [
            supportingData.title,
            supportingData.slug,
            supportingData.content,
            supportingData.excerpt || supportingData.content.substring(0, 150) + '...',
            supportingData.meta_description || supportingData.title,
            supportingData.hero_image || null,
            supportingData.author_name || pillarData.author_name || 'Arzani Team',
            supportingData.author_image || pillarData.author_image || null,
            supportingData.author_bio || pillarData.author_bio || null,
            supportingData.status || 'Published',
            supportingData.is_featured || false,
            supportingData.reading_time || 8, // Supporting posts are shorter
            supportingData.publish_date || new Date(),
            false, // is_pillar
            supportingData.content_category || pillarData.content_category,
            supportingData.target_keyword,
            supportingData.secondary_keywords,
            supportingData.buying_stage || 'consideration',
            supportingData.cta_type || 'marketplace',
            supportingData.cta_text || 'Explore Business Listings',
            supportingData.cta_link || '/marketplace',
            supportingData.schema_markup,
            supportingData.seo_title || supportingData.title,
            supportingData.seo_keywords
          ]);
          
          const supportingPost = supportingResult.rows[0];
          supportingPosts.push(supportingPost);
          
          // Add relationship to pillar post
          await client.query(`
            INSERT INTO blog_content_relationships (pillar_post_id, supporting_post_id)
            VALUES ($1, $2)
          `, [pillarPost.id, supportingPost.id]);
          
          // Add categories
          if (supportingData.categories && supportingData.categories.length > 0) {
            for (const categoryId of supportingData.categories) {
              await client.query(`
                INSERT INTO blog_post_categories (post_id, category_id)
                VALUES ($1, $2)
              `, [supportingPost.id, categoryId]);
            }
          } else {
            // Add default category based on content_category
            const categoryResult = await client.query(`
              SELECT id FROM blog_categories WHERE slug = $1
            `, [supportingData.content_category || pillarData.content_category]);
            
            if (categoryResult.rows.length > 0) {
              await client.query(`
                INSERT INTO blog_post_categories (post_id, category_id)
                VALUES ($1, $2)
              `, [supportingPost.id, categoryResult.rows[0].id]);
            }
          }
          
          // Add tags
          if (supportingData.tags && supportingData.tags.length > 0) {
            for (const tagId of supportingData.tags) {
              await client.query(`
                INSERT INTO blog_post_tags (post_id, tag_id)
                VALUES ($1, $2)
              `, [supportingPost.id, tagId]);
            }
          }
        }
      }
      
      await client.query('COMMIT');
      
      return {
        pillarPost,
        supportingPosts
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error generating content cluster:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Create a new supporting post for an existing pillar post
   */
  async addSupportingPost(pillarId, supportingData) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Check if pillar post exists
      const pillarResult = await client.query(`
        SELECT * FROM blog_posts WHERE id = $1 AND is_pillar = true
      `, [pillarId]);
      
      if (pillarResult.rows.length === 0) {
        throw new Error('Pillar post not found');
      }
      
      const pillarPost = pillarResult.rows[0];
      
      // Generate slug if not provided
      if (!supportingData.slug) {
        supportingData.slug = slugify(supportingData.title, {
          lower: true,
          strict: true,
          remove: /[*+~.()'"!:@]/g
        });
      }
      
      // Add schema markup for BlogPosting
      if (!supportingData.schema_markup) {
        supportingData.schema_markup = JSON.stringify({
          "@type": "BlogPosting",
          "headline": supportingData.title,
          "description": supportingData.meta_description || supportingData.excerpt,
          "author": {
            "@type": "Person",
            "name": supportingData.author_name || "Arzani Team"
          },
          "datePublished": supportingData.publish_date || new Date().toISOString(),
          "dateModified": new Date().toISOString(),
          "publisher": {
            "@type": "Organization",
            "name": "Arzani",
            "logo": {
              "@type": "ImageObject",
              "url": "https://arzani.co.uk/figma design exports/images.webp/arzani-icon-nobackground.png"
            }
          },
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": `https://arzani.co.uk/blog/${supportingData.content_category || pillarPost.content_category}/${supportingData.slug}/`
          }
        });
      }
      
      // Insert supporting post
      const supportingResult = await client.query(`
        INSERT INTO blog_posts (
          title, slug, content, excerpt, meta_description, hero_image,
          author_name, author_image, author_bio, status, is_featured,
          reading_time, publish_date, is_pillar, content_category,
          target_keyword, secondary_keywords, buying_stage,
          cta_type, cta_text, cta_link, schema_markup, seo_title, seo_keywords
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
        RETURNING *
      `, [
        supportingData.title,
        supportingData.slug,
        supportingData.content,
        supportingData.excerpt || supportingData.content.substring(0, 150) + '...',
        supportingData.meta_description || supportingData.title,
        supportingData.hero_image || null,
        supportingData.author_name || pillarPost.author_name || 'Arzani Team',
        supportingData.author_image || pillarPost.author_image || null,
        supportingData.author_bio || pillarPost.author_bio || null,
        supportingData.status || 'Published',
        supportingData.is_featured || false,
        supportingData.reading_time || 8, // Supporting posts are shorter
        supportingData.publish_date || new Date(),
        false, // is_pillar
        supportingData.content_category || pillarPost.content_category,
        supportingData.target_keyword,
        supportingData.secondary_keywords,
        supportingData.buying_stage || 'consideration',
        supportingData.cta_type || 'marketplace',
        supportingData.cta_text || 'Explore Business Listings',
        supportingData.cta_link || '/marketplace',
        supportingData.schema_markup,
        supportingData.seo_title || supportingData.title,
        supportingData.seo_keywords
      ]);
      
      const supportingPost = supportingResult.rows[0];
      
      // Add relationship to pillar post
      await client.query(`
        INSERT INTO blog_content_relationships (pillar_post_id, supporting_post_id)
        VALUES ($1, $2)
      `, [pillarId, supportingPost.id]);
      
      // Add categories
      if (supportingData.categories && supportingData.categories.length > 0) {
        for (const categoryId of supportingData.categories) {
          await client.query(`
            INSERT INTO blog_post_categories (post_id, category_id)
            VALUES ($1, $2)
          `, [supportingPost.id, categoryId]);
        }
      } else {
        // Add default category based on content_category
        const categoryResult = await client.query(`
          SELECT id FROM blog_categories WHERE slug = $1
        `, [supportingData.content_category || pillarPost.content_category]);
        
        if (categoryResult.rows.length > 0) {
          await client.query(`
            INSERT INTO blog_post_categories (post_id, category_id)
            VALUES ($1, $2)
          `, [supportingPost.id, categoryResult.rows[0].id]);
        }
      }
      
      // Add tags
      if (supportingData.tags && supportingData.tags.length > 0) {
        for (const tagId of supportingData.tags) {
          await client.query(`
            INSERT INTO blog_post_tags (post_id, tag_id)
            VALUES ($1, $2)
          `, [supportingPost.id, tagId]);
        }
      }
      
      await client.query('COMMIT');
      return supportingPost;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error adding supporting post:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Get a complete content cluster by pillar post ID
   */
  async getContentCluster(pillarId) {
    try {
      // Get pillar post
      const pillarResult = await db.query(`
        SELECT p.* 
        FROM blog_posts p
        WHERE p.id = $1 AND p.is_pillar = true
      `, [pillarId]);
      
      if (pillarResult.rows.length === 0) {
        return null;
      }
      
      const pillarPost = pillarResult.rows[0];
      
      // Get supporting posts
      const supportingResult = await db.query(`
        SELECT p.*
        FROM blog_posts p
        JOIN blog_content_relationships r ON p.id = r.supporting_post_id
        WHERE r.pillar_post_id = $1
        ORDER BY p.publish_date DESC
      `, [pillarId]);
      
      // Get categories for pillar
      const categoriesResult = await db.query(`
        SELECT c.* 
        FROM blog_categories c
        JOIN blog_post_categories pc ON c.id = pc.category_id
        WHERE pc.post_id = $1
      `, [pillarId]);
      
      // Get tags for pillar
      const tagsResult = await db.query(`
        SELECT t.* 
        FROM blog_tags t
        JOIN blog_post_tags pt ON t.id = pt.tag_id
        WHERE pt.post_id = $1
      `, [pillarId]);
      
      return {
        pillarPost: {
          ...pillarPost,
          categories: categoriesResult.rows || [],
          tags: tagsResult.rows || []
        },
        supportingPosts: supportingResult.rows || []
      };
    } catch (error) {
      console.error('Error getting content cluster:', error);
      throw error;
    }
  }
  
  /**
   * Track a CTA conversion
   */
  async trackCtaConversion(postId) {
    try {
      await db.query(`
        UPDATE blog_posts 
        SET cta_conversion_count = cta_conversion_count + 1 
        WHERE id = $1
      `, [postId]);
      
      return true;
    } catch (error) {
      console.error('Error tracking CTA conversion:', error);
      return false;
    }
  }
}

export default new ProgrammaticContentService();

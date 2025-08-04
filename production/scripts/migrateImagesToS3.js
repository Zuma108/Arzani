import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db.js';
import { uploadToS3 } from '../utils/s3.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');

async function migrateImagesToS3() {
  try {
    console.log('Starting image migration...');
    
    // Get all files from uploads directory
    const files = await fs.readdir(uploadsDir);
    console.log(`Found ${files.length} files to migrate`);

    // Get all business records with image references
    const { rows: businesses } = await pool.query('SELECT id, images FROM businesses WHERE images IS NOT NULL');
    
    for (const business of businesses) {
      if (!business.images) continue;

      // Convert string to array if necessary
      const imageArray = Array.isArray(business.images) ? business.images : [business.images];
      const newImageUrls = [];
      
      for (const imageName of imageArray) {
        try {
          // Handle case where imageName might be an array
          const actualImageName = Array.isArray(imageName) ? imageName[0] : imageName;
          if (!actualImageName) continue;

          const filePath = path.join(uploadsDir, actualImageName);
          
          // Check if file exists
          try {
            await fs.access(filePath);
          } catch (error) {
            console.log(`File not found: ${filePath}, skipping...`);
            continue;
          }

          const fileBuffer = await fs.readFile(filePath);
          
          // Create file object similar to multer's format
          const file = {
            buffer: fileBuffer,
            mimetype: `image/${path.extname(actualImageName).slice(1)}`,
            originalname: actualImageName
          };

          // Upload to S3 with retry logic
          let retries = 3;
          let lastError;
          
          while (retries > 0) {
            try {
              const s3Key = `businesses/${business.id}/${actualImageName}`;
              const imageUrl = await uploadToS3(file, s3Key);
              newImageUrls.push(imageUrl);
              console.log(`Successfully migrated: ${actualImageName} -> ${imageUrl}`);
              break; // Success, exit retry loop
            } catch (error) {
              lastError = error;
              retries--;
              if (retries > 0) {
                console.log(`Retrying upload for ${actualImageName}, ${retries} attempts remaining`);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s between retries
              }
            }
          }

          if (retries === 0) {
            console.error(`Failed to upload ${actualImageName} after all retries:`, lastError);
          }
          
        } catch (error) {
          console.error(`Error migrating image ${imageName}:`, error);
        }
      }

      // Update database with S3 URLs if we have any successful migrations
      if (newImageUrls.length > 0) {
        await pool.query(
          'UPDATE businesses SET images = $1 WHERE id = $2',
          [newImageUrls, business.id]
        );
        console.log(`Updated business ${business.id} with ${newImageUrls.length} new image URLs`);
      }
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateImagesToS3();

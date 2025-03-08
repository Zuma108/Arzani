import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Initialize S3 client with debug logging
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  },
  logger: console
});

async function verifyS3Upload(s3Key) {
  try {
    const command = new HeadObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: s3Key
    });
    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error('Verification failed for key:', s3Key, error);
    return false;
  }
}

async function uploadToS3(filePath, userId, filename) {
  console.log('\nUploading to S3:', {
    filePath,
    userId,
    filename,
    bucket: process.env.AWS_BUCKET_NAME,
    region: process.env.AWS_REGION
  });

  const fileContent = fs.readFileSync(filePath);
  const s3Key = `profiles/${userId}/${filename}`;

  // Get file mime type
  const mimeType = filename.toLowerCase().endsWith('.png') ? 'image/png' : 
                   filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.jpeg') ? 'image/jpeg' : 
                   'application/octet-stream';

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: s3Key,
    Body: fileContent,
    ContentType: mimeType
    // Removed ACL: 'public-read'
  });

  try {
    const result = await s3Client.send(command);
    console.log('S3 upload response:', result);

    // Verify the upload
    const verified = await verifyS3Upload(s3Key);
    if (!verified) {
      throw new Error('Upload verification failed');
    }

    const s3Url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
    console.log('Generated S3 URL:', s3Url);
    return s3Url;
  } catch (error) {
    console.error('S3 upload error:', {
      error: error.message,
      code: error.code,
      requestId: error.$metadata?.requestId
    });
    throw error;
  }
}

async function migrateProfilePictures() {
  try {
    // Log environment variables (redacted)
    console.log('Environment check:', {
      hasAwsKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasAwsSecret: !!process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
      bucket: process.env.AWS_BUCKET_NAME,
      hasAdminToken: !!process.env.ADMIN_JWT_TOKEN
    });

    const uploadsDir = path.join(__dirname, '..', 'public', 'uploads', 'profiles');
    console.log('Scanning directory:', uploadsDir);

    // Get all files
    const files = fs.readdirSync(uploadsDir).filter(f => {
      const filePath = path.join(uploadsDir, f);
      return fs.statSync(filePath).isFile() && 
             (f.toLowerCase().endsWith('.jpg') || 
              f.toLowerCase().endsWith('.jpeg') || 
              f.toLowerCase().endsWith('.png'));
    });

    console.log(`Found ${files.length} image files`);

    const stats = {
      totalFiles: files.length,
      successfulUploads: 0,
      failedUploads: 0
    };

    // Create a default profile folder in S3
    const defaultUserId = 'default';
    
    for (const file of files) {
      const filePath = path.join(uploadsDir, file);
      console.log(`\nProcessing file: ${filePath}`);

      try {
        // Upload to default profile folder in S3
        const s3Url = await uploadToS3(filePath, defaultUserId, file);
        console.log('S3 URL generated:', s3Url);

        // Update the database reference
        const response = await fetch('http://localhost:5000/api/update-profile-picture', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.ADMIN_JWT_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            profilePictureUrl: s3Url,
            originalPath: `/uploads/profiles/${file}`
          })
        });

        if (!response.ok) {
          throw new Error(`API call failed: ${response.status}`);
        }

        stats.successfulUploads++;
        console.log(`Successfully processed file: ${file}`);
      } catch (error) {
        stats.failedUploads++;
        console.error(`Failed to process file ${file}:`, error);
      }
    }

    console.log('\nMigration completed. Statistics:', stats);
  } catch (error) {
    console.error('Migration script error:', error);
    process.exit(1);
  }
}

migrateProfilePictures();

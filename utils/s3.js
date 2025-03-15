import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import dotenv from 'dotenv';
import { getS3Client } from './awsConfig.js';

dotenv.config();

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

/**
 * Upload a file to S3
 * @param {Object} file - The file object (can be from multer or a buffer)
 * @param {String} key - The S3 key to use (path + filename)
 * @returns {Promise<String>} - The URL of the uploaded file
 */
export async function uploadToS3(file, key) {
  try {
    const s3Client = getS3Client();
    
    // Log the S3 upload operation (without sensitive data)
    console.log(`Uploading to S3: ${key} to bucket ${process.env.AWS_BUCKET_NAME}`);
    
    // Handle both multer file objects and direct buffers
    const fileBuffer = file.buffer || file.buffer;
    const contentType = file.mimetype || 'application/octet-stream';

    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType
        // Removed ACL: 'public-read' as bucket doesn't support ACLs
      }
    });

    await upload.done();
    
    // Return the public URL for the object
    return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error(`Failed to upload to S3: ${error.message}`);
  }
}

/**
 * Get a signed URL for an S3 object
 * @param {String} key - S3 key
 * @param {Number} expiresIn - Expiration in seconds, default 3600 (1 hour)
 * @returns {Promise<String>} - The signed URL
 */
export async function getSignedFileUrl(key, expiresIn = 3600) {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key
  });

  return await awsGetSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Get the public URL for an S3 object
 * @param {String} key - S3 key
 * @returns {String} - The public URL
 */
export function getPublicUrl(key) {
  return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

export default { uploadToS3 };

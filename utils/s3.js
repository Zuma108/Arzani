import { Storage } from '@google-cloud/storage';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// Create and export a properly configured Google Cloud Storage client
export const gcsClient = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

// Get the configured bucket
export const gcsBucket = gcsClient.bucket(process.env.GCS_BUCKET_NAME || 'arzani-marketplace-files');

// Create a GCS client instance
function getGCSClient() {
  return new Storage({
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  });
}

/**
 * Validate bucket exists and is accessible
 * @param {String} bucketName - Bucket name to check
 * @returns {Promise<Object>} - Result with success flag
 */
export async function validateBucket(bucketName) {
  try {
    const bucket = gcsClient.bucket(bucketName || process.env.GCS_BUCKET_NAME);
    const [exists] = await bucket.exists();
    
    if (exists) {
      console.log(`✅ Bucket ${bucketName} is valid and accessible`);
      return { success: true };
    } else {
      console.error(`❌ Bucket ${bucketName} does not exist`);
      return { success: false, error: 'Bucket does not exist' };
    }
  } catch (error) {
    console.error(`Error validating bucket ${bucketName}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Upload a file to Google Cloud Storage
 * @param {Buffer|Object} fileBuffer - The file buffer to upload or file object
 * @param {string} key - The GCS object key (path)
 * @param {string} contentType - The file's mime type
 * @param {string} region - Unused (kept for compatibility)
 * @param {string} bucket - The GCS bucket name
 * @returns {Promise<string>} - URL of the uploaded file
 */
export async function uploadToS3(fileBuffer, key, contentType, region, bucket) {
  try {
    // Input validation with detailed error messages
    if (!key || typeof key !== 'string') {
      throw new Error('Invalid key provided: ' + (key === undefined ? 'undefined' : typeof key));
    }
    
    // Handle content type - detect from filename if not provided
    if (!contentType || typeof contentType !== 'string') {
      // Try to determine content type from key
      if (key) {
        const extension = key.split('.').pop().toLowerCase();
        contentType = getMimeTypeFromExtension(extension) || 'application/octet-stream';
        console.log(`No content type provided, using detected type: ${contentType}`);
      } else {
        throw new Error('Invalid content type provided: ' + (contentType === undefined ? 'undefined' : typeof contentType));
      }
    }
    
    // Process fileBuffer to ensure we have a valid buffer
    let processedBuffer;
    if (Buffer.isBuffer(fileBuffer)) {
      processedBuffer = fileBuffer;
    } else if (fileBuffer && typeof fileBuffer === 'object') {
      if (Buffer.isBuffer(fileBuffer.buffer)) {
        processedBuffer = fileBuffer.buffer;
      } else if (Buffer.isBuffer(fileBuffer.data)) {
        processedBuffer = fileBuffer.data;
      } else if (fileBuffer.path && typeof fileBuffer.path === 'string') {
        const fs = await import('fs/promises');
        processedBuffer = await fs.readFile(fileBuffer.path);
      } else {
        throw new Error('Invalid file buffer format');
      }
    } else {
      throw new Error('Invalid file buffer provided');
    }
    
    // Use configured bucket or provided bucket name
    const bucketName = bucket || process.env.GCS_BUCKET_NAME || 'arzani-marketplace-files';
    
    console.log(`GCS upload parameters: bucket=${bucketName}, key=${key}, size=${processedBuffer ? processedBuffer.length : 'unknown'} bytes`);
    
    // Get the bucket instance
    const gcsBucket = gcsClient.bucket(bucketName);
    const file = gcsBucket.file(key);
    
    // Upload the file (without setting public ACL due to uniform bucket-level access)
    await file.save(processedBuffer, {
      metadata: {
        contentType: contentType,
      },
      // Remove public: true since uniform bucket-level access is enabled
      // Files will be accessible based on bucket's IAM policies
    });
    
    console.log(`GCS upload successful: ${key}`);
    
    // Return the public URL
    return `https://storage.googleapis.com/${bucketName}/${key}`;
  } catch (error) {
    console.error('GCS upload error:', error);
    throw new Error(`GCS upload failed: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Get MIME type from file extension
 * @param {string} extension - File extension
 * @returns {string} - MIME type or undefined
 */
function getMimeTypeFromExtension(extension) {
  if (!extension) return undefined;
  
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'txt': 'text/plain',
    'json': 'application/json',
  };
  
  return mimeTypes[extension.toLowerCase()];
}

/**
 * Upload multiple business images to GCS and return formatted URL array
 * @param {Array<File>} files - Array of multer files
 * @param {String} businessId - Business ID for folder structure
 * @param {String} region - Unused (kept for compatibility)
 * @param {String} bucket - GCS bucket name (defaults to env variable)
 * @returns {Promise<Array<String>>} - Array of GCS URLs in the format needed for DB storage
 */
export async function uploadBusinessImages(files, businessId, region = null, bucket = process.env.GCS_BUCKET_NAME) {
    console.log(`Uploading ${files.length} business images for business ID: ${businessId}`);
    
    if (!files || !files.length) {
        throw new Error('No files provided for upload');
    }
    
    if (!businessId) {
        throw new Error('Business ID is required for organizing uploads');
    }
    
    // Set default bucket if not provided
    bucket = bucket || 'arzani-marketplace-files';
    
    // Create a timestamp to ensure unique folders
    const timestamp = Date.now();
    const folderPath = `businesses/${businessId}/`;
    
    try {
        // Upload all files in parallel and collect URLs
        const uploadPromises = files.map(async (file, index) => {
            // Generate sanitized filename with timestamp to avoid collisions
            const sanitizedFilename = sanitizeFilename(file.originalname);
            const key = `${folderPath}${sanitizedFilename}`;
            
            // Upload to GCS (using uploadToS3 function for compatibility)
            await uploadToS3(file, key, file.mimetype, null, bucket);
            
            // Return the full URL in the expected format
            return `https://storage.googleapis.com/${bucket}/${key}`;
        });
        
        // Wait for all uploads to complete
        const urls = await Promise.all(uploadPromises);
        
        console.log(`Successfully uploaded ${urls.length} images to GCS`);
        return urls;
    } catch (error) {
        console.error('Error uploading business images:', error);
        throw new Error(`Failed to upload business images: ${error.message}`);
    }
}

/**
 * Upload multiple business images to GCS and return formatted URL array string for PostgreSQL
 * @param {Array<File>} files - Array of multer files
 * @param {String} businessId - Business ID for folder structure
 * @param {String} region - Unused (kept for compatibility)
 * @param {String} bucket - GCS bucket name
 * @returns {Promise<String>} - PostgreSQL formatted array string {url1,url2,url3}
 */
export async function uploadBusinessImagesFormatted(files, businessId, region = null, bucket = process.env.GCS_BUCKET_NAME) {
  if (!files || !files.length) {
    return '{}'; // Empty PostgreSQL array
  }
  
  console.log(`Uploading ${files.length} business images for business ID: ${businessId}`);
  
  // Set default bucket if not provided
  bucket = bucket || 'arzani-marketplace-files';
  
  // Create timestamp-based folder
  const folderPath = `businesses/${businessId}/`;
  const urls = [];
  
  try {
    // Process files sequentially to avoid race conditions
    for (const file of files) {
      // Sanitize filename and generate GCS key
      const sanitizedFilename = sanitizeFilename(file.originalname);
      const key = `${folderPath}${sanitizedFilename}`;
      
      console.log(`Uploading file ${file.originalname} to ${key}`);
      
      // Upload to GCS and get URL
      await uploadToS3(file, key, file.mimetype, null, bucket);
      
      // Create and store the GCS URL in the expected format
      const url = `https://storage.googleapis.com/${bucket}/${key}`;
      urls.push(url);
      
      console.log(`Successfully uploaded to ${url}`);
    }
    
    // Format URLs for PostgreSQL array storage: {url1,url2,url3}
    // Note: No quotes around URLs as per the requested format
    const postgresArrayString = `{${urls.join(',')}}`;
    
    console.log(`Formatted PostgreSQL array: ${postgresArrayString}`);
    return postgresArrayString;
  } catch (error) {
    console.error('Error uploading business images:', error);
    throw new Error(`Failed to upload business images: ${error.message}`);
  }
}

/**
 * Format array of S3 URLs into PostgreSQL array format
 * @param {Array<String>} urls - Array of S3 URLs
 * @returns {String} - PostgreSQL array format: {url1,url2,url3}
 */
export function formatUrlsForPostgres(urls) {
    if (!urls || !Array.isArray(urls)) {
        return "{}"; // Empty PostgreSQL array
    }
    
    // Create PostgreSQL array format: {url1,url2,url3}
    return `{${urls.join(',')}}`;
}

/**
 * Parse PostgreSQL array format back into JavaScript array
 * @param {String} postgresArray - PostgreSQL array string: {url1,url2,url3}
 * @returns {Array<String>} - JavaScript array of URLs
 */
export function parsePostgresUrlArray(postgresArray) {
    if (!postgresArray || typeof postgresArray !== 'string') {
        return [];
    }
    
    // Remove braces and split by comma
    const arrayContent = postgresArray.slice(1, -1);
    if (!arrayContent) {
        return [];
    }
    
    return arrayContent.split(',');
}

/**
 * Get a pre-signed URL for a GCS object
 * @param {String} key - GCS object key
 * @param {Number} expiresIn - URL expiration time in seconds
 * @param {String} region - Unused (kept for compatibility)
 * @param {String} bucketName - GCS bucket name (default: from env)
 * @returns {Promise<String>} - Pre-signed URL
 */
export async function getPresignedUrl(key, expiresIn = 3600, region = null, bucketName = null) {
  try {
    const bucket = bucketName || process.env.GCS_BUCKET_NAME || 'arzani-marketplace-files';
    const gcsBucket = gcsClient.bucket(bucket);
    const file = gcsBucket.file(key);
    
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + (expiresIn * 1000), // Convert seconds to milliseconds
    });
    
    return signedUrl;
  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    throw error;
  }
}

/**
 * Get the public URL for a GCS object
 * @param {String} key - GCS object key
 * @param {String} region - Unused (kept for compatibility)
 * @param {String} bucketName - GCS bucket name (default: from env)
 * @returns {String} - Public URL
 */
export function getPublicUrl(key, region = null, bucketName = null) {
  const bucket = bucketName || process.env.GCS_BUCKET_NAME || 'arzani-marketplace-files';
  
  // Clean the key to remove any double slashes or leading slashes
  const cleanKey = key.startsWith('/') ? key.substring(1) : key;
  
  // Construct the GCS public URL
  return `https://storage.googleapis.com/${bucket}/${cleanKey}`;
}

/**
 * Generate thumbnail of varying qualities for progressive loading
 * @param {String} key - GCS object key
 * @param {String} quality - Quality level (low, medium, high)
 * @param {String} region - Unused (kept for compatibility)
 * @param {String} bucketName - GCS bucket name (default: from env)
 * @returns {Promise<Object>} - URLs for different quality versions
 */
export async function generateProgressiveImageUrls(key, region = null, bucketName = process.env.GCS_BUCKET_NAME) {
  try {
    const originalUrl = getPublicUrl(key, region, bucketName);
    
    // For now, we're just returning the original URL since we don't have image processing set up
    // In a real implementation, you would generate different sizes/qualities with GCS
    return {
      thumbnail: originalUrl,
      original: originalUrl,
      fallback: originalUrl // GCS doesn't need regional fallbacks like S3
    };
  } catch (error) {
    console.error('Error generating progressive image URLs:', error);
    throw error;
  }
}

/**
 * Get an object from GCS
 * @param {String} key - GCS object key
 * @param {Array<String>} regions - Unused (kept for compatibility)
 * @returns {Promise<Object>} - GCS object data
 */
export async function getObjectMultiRegion(key, regions = []) {
  const bucket = process.env.GCS_BUCKET_NAME || 'arzani-marketplace-files';
  
  try {
    const gcsBucket = gcsClient.bucket(bucket);
    const file = gcsBucket.file(key);
    
    const [fileData] = await file.download();
    const [metadata] = await file.getMetadata();
    
    return {
      Body: fileData,
      ContentType: metadata.contentType,
      ContentLength: metadata.size,
      LastModified: new Date(metadata.timeCreated),
      ETag: metadata.etag
    };
  } catch (error) {
    console.error(`Failed to get object from GCS:`, error);
    throw error;
  }
}

/**
 * Check if GCS connection is configured properly
 * @returns {Promise<Object>} Connection status
 */
export async function checkS3Connection() {
  const bucket = process.env.GCS_BUCKET_NAME || 'arzani-marketplace-files';
  
  const results = {
    bucket: bucket,
    success: false,
    credentials: false
  };
  
  try {
    // Check if we can list buckets (validates credentials)
    await gcsClient.getBuckets();
    results.credentials = true;
    
    // Check if specific bucket exists and is accessible
    const bucketValidation = await validateBucket(bucket);
    results.success = bucketValidation.success;
    
    return results;
  } catch (error) {
    console.error('GCS connection check failed:', error);
    results.error = error.message;
    return results;
  }
}

/**
 * Sanitize a filename for S3 storage
 * @param {String} filename - Original filename
 * @returns {String} - Sanitized filename
 */
export function sanitizeFilename(filename) {
    if (!filename) return `file_${Date.now()}`;
    
    // Remove special characters, keep alphanumeric, dash, underscore and periods
    let sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    
    // Add unique timestamp to prevent overwriting
    const extension = sanitized.includes('.') ? sanitized.substring(sanitized.lastIndexOf('.')) : '';
    const baseName = sanitized.includes('.') ? sanitized.substring(0, sanitized.lastIndexOf('.')) : sanitized;
    sanitized = `${baseName}_${Date.now()}${extension}`;
    
    return sanitized;
}

// Add a helper function to get MIME type from filename
export function getMimeTypeFromFilename(filename) {
    if (!filename) return 'application/octet-stream';
    
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.') + 1);
    
    // Common MIME types
    const mimeTypes = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
    
    return mimeTypes[extension] || 'application/octet-stream';
}

/**
 * Get the best GCS URL for an image
 * @param {String} key - GCS object key
 * @param {Array<String>} regions - Unused (kept for compatibility)
 * @param {String} bucketName - GCS bucket name
 * @returns {Promise<String>} - The GCS URL
 */
export async function getBestS3Url(key, regions = [], bucketName = null) {
  const bucket = bucketName || process.env.GCS_BUCKET_NAME || 'arzani-marketplace-files';
  
  try {
    // Check if the object exists in GCS
    const gcsBucket = gcsClient.bucket(bucket);
    const file = gcsBucket.file(key);
    const [exists] = await file.exists();
    
    if (exists) {
      return `https://storage.googleapis.com/${bucket}/${key}`;
    } else {
      // Return the URL anyway - let the browser handle the 404
      return `https://storage.googleapis.com/${bucket}/${key}`;
    }
  } catch (error) {
    console.log(`Error checking object existence: ${error.message}`);
    // Return the URL anyway
    return `https://storage.googleapis.com/${bucket}/${key}`;
  }
}

/**
 * Process a collection of business images to ensure they have correct URLs
 * @param {Array<String>} images - Array of image paths or URLs
 * @param {String} businessId - Business ID for constructing paths
 * @returns {Array<String>} - Array of processed image URLs
 */
export function processBusinessImages(images, businessId) {
  if (!images || !Array.isArray(images) || images.length === 0) {
    return [];
  }
  
  return images.map(image => {
    // If already a full URL, return it
    if (image && image.startsWith('http')) {
      return image;
    }
    
    // Default bucket
    const bucket = process.env.GCS_BUCKET_NAME || 'arzani-marketplace-files';
    
    // Construct the GCS URL
    return `https://storage.googleapis.com/${bucket}/businesses/${businessId}/${image}`;
  });
}

export default {
  uploadToS3,
  getPresignedUrl,
  getPublicUrl,
  getObjectMultiRegion,
  sanitizeFilename,
  uploadBusinessImages,
  formatUrlsForPostgres,
  parsePostgresUrlArray,
  uploadBusinessImagesFormatted,
  getGCSClient: getGCSClient // Updated from getS3Client
};

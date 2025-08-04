import { S3Client, PutObjectCommand, GetObjectCommand, ListBucketsCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// Create and export a properly configured S3 client
export const s3Client = new S3Client({
  region: process.env.AWS_REGION || "eu-west-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Create an S3 client with the specified region
function getS3Client(region = 'eu-west-2') {
  return new S3Client({
    region: region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });
}

/**
 * Validate bucket exists and is accessible
 * @param {String} bucketName - Bucket name to check
 * @param {String} region - AWS region
 * @returns {Promise<Object>} - Result with success flag and region
 */
export async function validateBucket(bucketName, region = 'eu-west-2') {
  try {
    // Ensure region is a valid string
    if (!region || typeof region !== 'string' || region.includes('/')) {
      console.warn(`Invalid region format: "${region}", using default eu-west-2`);
      region = 'eu-west-2';
    }

    const s3Client = getS3Client(region);
    await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
    console.log(`✅ Bucket ${bucketName} in region ${region} is valid and accessible`);
    return { success: true, region };
  } catch (error) {
    console.error(`Error validating bucket ${bucketName} in region ${region}:`, error);
    
    // Check if the error includes information about the correct region
    if (error.Code === 'PermanentRedirect' && error.Endpoint) {
      const correctRegion = extractRegionFromEndpoint(error.Endpoint);
      console.log(`⚠️ Bucket exists in different region: ${correctRegion}`);
      
      // Only return a different region if it's actually different
      if (correctRegion && correctRegion !== region) {
        return { success: false, region: correctRegion };
      }
    }
    
    return { success: false, region, error: error.message };
  }
}

/**
 * Extract region from S3 endpoint URL
 * @param {String} endpoint - S3 endpoint URL
 * @returns {String} - Region
 */
function extractRegionFromEndpoint(endpoint) {
  // Example: arzani-images1.s3.eu-west-2.amazonaws.com
  const match = endpoint.match(/s3\.([^\.]+)\.amazonaws\.com/);
  return match ? match[1] : 'eu-west-2'; // Default to London region if can't extract
}

/**
 * Upload a file to AWS S3
 * @param {Buffer|Object} fileBuffer - The file buffer to upload or file object
 * @param {string} key - The S3 object key (path)
 * @param {string} contentType - The file's mime type
 * @param {string} region - The AWS region
 * @param {string} bucket - The S3 bucket name
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
    
    // Ensure proper region parameter
    // CRITICAL: Properly separate and validate the region parameter
    let cleanRegion = 'eu-west-2'; // Default region
    if (region) {
      // Handle comma-separated or multiple region values
      if (typeof region === 'string') {
        // Take first value before any commas and trim whitespace
        cleanRegion = region.split(',')[0].trim();
        
        // Check if it looks like a bucket name instead of a region
        if (cleanRegion.includes('arzani') || !cleanRegion.includes('-')) {
          console.warn(`Region parameter looks like a bucket name: "${cleanRegion}", using default eu-west-2`);
          cleanRegion = 'eu-west-2';
        }
      }
    }
    
    // Ensure proper bucket parameter
    // CRITICAL: Properly separate and validate the bucket parameter
    let cleanBucket = 'arzani-images1'; // Default bucket
    if (bucket) {
      // Handle comma-separated or multiple bucket values
      if (typeof bucket === 'string') {
        // Take first value before any commas and trim whitespace
        cleanBucket = bucket.split(',')[0].trim();
        
        // Check if it looks like a region instead of a bucket name
        if (cleanBucket.includes('-') && !cleanBucket.includes('arzani')) {
          console.warn(`Bucket parameter looks like a region: "${cleanBucket}", using default arzani-images1`);
          cleanBucket = 'arzani-images1';
        }
      }
    }
    
    console.log(`S3 upload parameters: region=${cleanRegion}, bucket=${cleanBucket}, key=${key}, size=${processedBuffer ? processedBuffer.length : 'unknown'} bytes`);
    
    // Initialize S3 client with the cleaned region
    const s3Client = new S3Client({
      region: cleanRegion,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    // Upload the file
    const uploadParams = {
      Bucket: cleanBucket,
      Key: key,
      Body: processedBuffer,
      ContentType: contentType,
    };

    const data = await s3Client.send(new PutObjectCommand(uploadParams));
    
    console.log(`S3 upload successful: ${key}`);
    
    // CRITICAL: Construct the URL with the correct format - bucket first, then region
    return `https://${cleanBucket}.s3.${cleanRegion}.amazonaws.com/${key}`;
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error(`S3 upload failed: ${error.message || 'Unknown error'}`);
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
 * Upload multiple business images to S3 and return formatted URL array
 * @param {Array<File>} files - Array of multer files
 * @param {String} businessId - Business ID for folder structure
 * @param {String} region - AWS region (defaults to env variable or eu-west-2)
 * @param {String} bucket - S3 bucket name (defaults to env variable or arzani-images1)
 * @returns {Promise<Array<String>>} - Array of S3 URLs in the format needed for DB storage
 */
export async function uploadBusinessImages(files, businessId, region = process.env.AWS_REGION, bucket = process.env.AWS_BUCKET_NAME) {
    console.log(`Uploading ${files.length} business images for business ID: ${businessId}`);
    
    if (!files || !files.length) {
        throw new Error('No files provided for upload');
    }
    
    if (!businessId) {
        throw new Error('Business ID is required for organizing uploads');
    }
    
    // Set defaults if not provided
    region = region || 'eu-west-2';
    bucket = bucket || 'arzani-images1';
    
    // Create a timestamp to ensure unique folders
    const timestamp = Date.now();
    const folderPath = `businesses/${businessId}/`;
    
    try {
        // Upload all files in parallel and collect URLs
        const uploadPromises = files.map(async (file, index) => {
            // Generate sanitized filename with timestamp to avoid collisions
            const sanitizedFilename = sanitizeFilename(file.originalname);
            const key = `${folderPath}${sanitizedFilename}`;
            
            // Upload to S3
            await uploadToS3(file, key, region, bucket);
            
            // Return the full URL in the expected format
            return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
        });
        
        // Wait for all uploads to complete
        const urls = await Promise.all(uploadPromises);
        
        console.log(`Successfully uploaded ${urls.length} images to S3`);
        return urls;
    } catch (error) {
        console.error('Error uploading business images:', error);
        throw new Error(`Failed to upload business images: ${error.message}`);
    }
}

/**
 * Upload multiple business images to S3 and return formatted URL array string for PostgreSQL
 * @param {Array<File>} files - Array of multer files
 * @param {String} businessId - Business ID for folder structure
 * @param {String} region - AWS region
 * @param {String} bucket - S3 bucket name
 * @returns {Promise<String>} - PostgreSQL formatted array string {url1,url2,url3}
 */
export async function uploadBusinessImagesFormatted(files, businessId, region = process.env.AWS_REGION, bucket = process.env.AWS_BUCKET_NAME) {
  if (!files || !files.length) {
    return '{}'; // Empty PostgreSQL array
  }
  
  console.log(`Uploading ${files.length} business images for business ID: ${businessId}`);
  
  // Set defaults if not provided
  region = region || 'eu-west-2';
  bucket = bucket || 'arzani-images1';
  
  // Create timestamp-based folder
  const folderPath = `businesses/${businessId}/`;
  const urls = [];
  
  try {
    // Process files sequentially to avoid race conditions
    for (const file of files) {
      // Sanitize filename and generate S3 key
      const sanitizedFilename = sanitizeFilename(file.originalname);
      const key = `${folderPath}${sanitizedFilename}`;
      
      console.log(`Uploading file ${file.originalname} to ${key}`);
      
      // Upload to S3 and get URL
      await uploadToS3(file, key, region, bucket);
      
      // Create and store the S3 URL in the expected format
      const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
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
 * Get a pre-signed URL for an S3 object
 * @param {String} key - S3 object key
 * @param {Number} expiresIn - URL expiration time in seconds
 * @param {String} region - AWS region (default: eu-west-2)
 * @param {String} bucketName - S3 bucket name (default: from env or arzani-images1)
 * @returns {Promise<String>} - Pre-signed URL
 */
export async function getPresignedUrl(key, expiresIn = 3600, region = 'eu-west-2', bucketName = null) {
  try {
    const bucket = bucketName || process.env.AWS_BUCKET_NAME || 'arzani-images1';
    const s3Client = getS3Client(region);
    
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    });
    
    return await awsGetSignedUrl(s3Client, command, { expiresIn });
  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    throw error;
  }
}

/**
 * Get the public URL for an S3 object
 * @param {String} key - S3 object key
 * @param {String} region - AWS region (default: eu-west-2)
 * @param {String} bucketName - S3 bucket name (default: from env or arzani-images1)
 * @returns {String} - Public URL
 */
export function getPublicUrl(key, region = 'eu-west-2', bucketName = null) {
  const bucket = bucketName || process.env.AWS_BUCKET_NAME || 'arzani-images1';
  
  // Clean the key to remove any double slashes or leading slashes
  const cleanKey = key.startsWith('/') ? key.substring(1) : key;
  
  // Construct the URL properly
  return `https://${bucket}.s3.${region}.amazonaws.com/${cleanKey}`;
}

/**
 * Generate thumbnail of varying qualities for progressive loading
 * @param {String} key - S3 object key
 * @param {String} quality - Quality level (low, medium, high)
 * @param {String} region - AWS region (default: eu-west-2)
 * @param {String} bucketName - S3 bucket name (default: from env)
 * @returns {Promise<Object>} - URLs for different quality versions
 */
export async function generateProgressiveImageUrls(key, region = process.env.AWS_REGION, bucketName = process.env.AWS_BUCKET_NAME) {
  try {
    const originalUrl = getPublicUrl(key, region, bucketName);
    
    // For now, we're just returning the original URL since we don't have image processing set up
    // In a real implementation, you would generate different sizes/qualities
    return {
      thumbnail: originalUrl,
      original: originalUrl,
      fallbackRegion: region === 'eu-west-2' ? 'eu-north-1' : 'eu-west-2'
    };
  } catch (error) {
    console.error('Error generating progressive image URLs:', error);
    throw error;
  }
}

/**
 * Try to get an object from multiple regions
 * @param {String} key - S3 object key
 * @param {Array<String>} regions - Array of regions to try
 * @returns {Promise<Object>} - S3 object data
 */
export async function getObjectMultiRegion(key, regions = ['eu-west-2', 'eu-north-1']) {
  const bucket = process.env.AWS_BUCKET_NAME || 'arzani-images1';
  let lastError = null;
  
  // Try each region in order
  for (const region of regions) {
    try {
      const s3Client = getS3Client(region);
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key
      });
      
      return await s3Client.send(command);
    } catch (error) {
      console.warn(`Failed to get object from ${region}:`, error.message);
      lastError = error;
      // Continue to try the next region
    }
  }
  
  // If we get here, all regions failed
  throw lastError || new Error('Failed to retrieve object from all regions');
}

/**
 * Check if S3 connection is configured properly and validate both regions
 * @returns {Promise<Object>} Connection status for each region
 */
export async function checkS3Connection() {
  const mainRegion = 'eu-west-2';
  const fallbackRegion = 'eu-north-1';
  const bucket = process.env.AWS_BUCKET_NAME || 'arzani-images1';
  
  const results = {
    mainRegion: { region: mainRegion, success: false, bucket },
    fallbackRegion: { region: fallbackRegion, success: false, bucket },
    credentials: false
  };
  
  try {
    // First check if credentials are valid at all
    const command = new ListBucketsCommand({});
    await getS3Client(mainRegion).send(command);
    results.credentials = true;
    
    // Then check each specific bucket
    results.mainRegion.success = await validateBucket(bucket, mainRegion);
    results.fallbackRegion.success = await validateBucket(bucket, fallbackRegion);
    
    return results;
  } catch (error) {
    console.error('S3 connection check failed:', error);
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
 * Get the best S3 URL for an image, trying multiple regions if needed
 * @param {String} key - S3 object key
 * @param {Array<String>} regions - Array of regions to try
 * @param {String} bucketName - S3 bucket name
 * @returns {Promise<String>} - The best S3 URL
 */
export async function getBestS3Url(key, regions = ['eu-west-2', 'eu-north-1'], bucketName = null) {
  const bucket = bucketName || process.env.AWS_BUCKET_NAME || 'arzani-images1';
  
  // First, check if the object exists in any of the regions
  for (const region of regions) {
    try {
      const s3Client = getS3Client(region);
      const command = new HeadBucketCommand({
        Bucket: bucket
      });
      
      await s3Client.send(command);
      // If successful, return this URL
      return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    } catch (error) {
      console.log(`Object not found in ${region}, trying next region`);
      // Continue to next region
    }
  }
  
  // If we can't verify any region, return the URL for the first region
  // The browser will try to load it and our error handlers will try other regions if needed
  return `https://${bucket}.s3.${regions[0]}.amazonaws.com/${key}`;
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
    
    // Default bucket and region
    const bucket = process.env.AWS_BUCKET_NAME || 'arzani-images1';
    
    // Try to determine the best region based on the image path
    let region = 'eu-west-2'; // Default to London region
    
    if (image && typeof image === 'string') {
      if (image.includes('eu-north-1')) {
        region = 'eu-north-1';
      } else if (image.includes('eu-west-2')) {
        region = 'eu-west-2';
      }
    }
    
    // Construct the S3 URL with the best region
    return `https://${bucket}.s3.${region}.amazonaws.com/businesses/${businessId}/${image}`;
  });
}

export default {
  uploadToS3,
  getPresignedUrl,
  getPublicUrl,
  getObjectMultiRegion,
  sanitizeFilename,  // Add sanitizeFilename to the default export
  uploadBusinessImages,
  formatUrlsForPostgres,
  parsePostgresUrlArray,
  uploadBusinessImagesFormatted,
  getS3Client
};

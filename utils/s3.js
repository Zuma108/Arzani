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
 * Upload a file to S3
 * @param {Object|Buffer} fileOrBuffer - File object from multer or raw buffer
 * @param {String} key - S3 key (path + filename)
 * @param {String} region - AWS region (defaults to env variable or eu-west-2)
 * @param {String} bucket - S3 bucket name (defaults to env variable or arzani-images1)
 * @returns {Promise<String>} - URL of the uploaded file
 */
export async function uploadToS3(fileOrBuffer, key, region = process.env.AWS_REGION, bucket = process.env.AWS_BUCKET_NAME) {
    console.log('uploadToS3 called with:', {
        fileType: fileOrBuffer ? (typeof fileOrBuffer === 'object' ? 'object' : 'buffer') : 'null',
        key,
        region,
        bucket
    });

    // Validate parameters
    if (!fileOrBuffer) {
        throw new Error('No file or buffer provided for upload');
    }
    
    if (!key) {
        throw new Error('No key provided for S3 upload');
    }

    // Set defaults if not provided
    region = region || 'eu-west-2';
    bucket = bucket || 'arzani-images1';
    
    // Validate region format to avoid common errors
    if (region && (region.includes('/') || region.startsWith('image/'))) {
        console.warn(`Invalid region format detected: "${region}". Using default region.`);
        region = 'eu-west-2';
    }

    // Handle different input types
    let buffer;
    let mimetype;

    if (Buffer.isBuffer(fileOrBuffer)) {
        // Input is a raw buffer
        buffer = fileOrBuffer;
        mimetype = 'application/octet-stream';
    } else if (fileOrBuffer && fileOrBuffer.buffer && Buffer.isBuffer(fileOrBuffer.buffer)) {
        // Input is a multer file object
        buffer = fileOrBuffer.buffer;
        mimetype = fileOrBuffer.mimetype || 'application/octet-stream';
    } else if (fileOrBuffer && typeof fileOrBuffer === 'object') {
        // Try to handle other file-like objects
        if (fileOrBuffer.data && Buffer.isBuffer(fileOrBuffer.data)) {
            buffer = fileOrBuffer.data;
            mimetype = fileOrBuffer.mimetype || 'application/octet-stream';
        } else {
            buffer = Buffer.from(fileOrBuffer);
            mimetype = 'application/octet-stream';
        }
    } else {
        throw new Error('Invalid file input: Expected buffer or file object');
    }

    // First verify the bucket and get the correct region if needed
    try {
        const bucketValidation = await validateBucket(bucket, region);
        if (!bucketValidation.success && bucketValidation.region && bucketValidation.region !== region) {
            // Only switch regions if truly different to avoid infinite loops
            console.log(`Switching to correct region: ${bucketValidation.region} (from ${region})`);
            region = bucketValidation.region;
        }
    } catch (error) {
        console.error(`Bucket validation error: ${error.message}. Continuing with provided region ${region}.`);
        // Continue with the provided region
    }

    // Initialize S3 client with potentially updated region
    const s3Client = new S3Client({
        region,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
    });

    // Prepare upload parameters
    const uploadParams = {
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: mimetype
    };

    try {
        console.log(`Starting S3 upload to ${region}/${bucket}/${key}`);
        // Upload to S3
        await s3Client.send(new PutObjectCommand(uploadParams));
        
        // Construct the URL
        const s3Url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
        console.log(`S3 upload successful. URL: ${s3Url}`);
        return s3Url;
    } catch (error) {
        console.error('S3 upload error:', error);
        
        // Check for bucket in different region
        if (error.Code === 'PermanentRedirect' && error.Endpoint) {
            const correctRegion = extractRegionFromEndpoint(error.Endpoint);
            // Only throw if regions are actually different
            if (correctRegion && correctRegion !== region) {
                throw new Error(`Bucket is in ${correctRegion} region, not ${region}. Please use the correct region.`);
            }
        }
        
        throw new Error(`S3 upload failed: ${error.message}`);
    }
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
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
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
 * Generate a sanitized filename suitable for S3
 * @param {String} filename - Original filename
 * @returns {String} - Sanitized filename
 */
export function sanitizeFilename(filename) {
  // Remove any path components (slashes)
  let sanitized = filename.replace(/^.*[\\\/]/, '');
  
  // Replace spaces and special characters with underscores
  sanitized = sanitized.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  // Add timestamp for uniqueness
  const timestamp = Date.now();
  const ext = path.extname(sanitized);
  const basename = path.basename(sanitized, ext);
  
  return `${basename}-${timestamp}${ext}`;
}

export default {
  uploadToS3,
  getPresignedUrl,
  getPublicUrl,
  getObjectMultiRegion,
  sanitizeFilename  // Add sanitizeFilename to the default export
};

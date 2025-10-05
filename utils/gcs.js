import { Storage } from '@google-cloud/storage';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// Initialize Google Cloud Storage client
let storage;
try {
  storage = new Storage({
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS, // Path to service account key
  });
  console.log('✅ Google Cloud Storage initialized successfully');
} catch (error) {
  console.warn('⚠️ Google Cloud Storage initialization failed, using local storage fallback:', error.message);
  storage = null;
}

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'arzani-marketplace-files';

/**
 * Upload a file to Google Cloud Storage
 * @param {Buffer|Object} fileBuffer - The file buffer to upload or file object
 * @param {string} key - The GCS object key (path)
 * @param {string} contentType - The file's mime type
 * @returns {Promise<string>} - URL of the uploaded file
 */
export async function uploadToGCS(fileBuffer, key, contentType) {
  try {
    // If GCS is not initialized, use local storage fallback
    if (!storage) {
      return await uploadToLocal(fileBuffer, key, contentType);
    }

    // Input validation
    if (!key || typeof key !== 'string') {
      throw new Error('Invalid key provided: ' + (key === undefined ? 'undefined' : typeof key));
    }
    
    // Handle content type - detect from filename if not provided
    if (!contentType || typeof contentType !== 'string') {
      if (key) {
        const extension = key.split('.').pop().toLowerCase();
        contentType = getMimeTypeFromExtension(extension) || 'application/octet-stream';
        console.log(`No content type provided, using detected type: ${contentType}`);
      } else {
        throw new Error('Invalid content type provided');
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

    console.log(`GCS upload parameters: bucket=${BUCKET_NAME}, key=${key}, size=${processedBuffer ? processedBuffer.length : 'unknown'} bytes`);
    
    // Get bucket reference
    const bucket = storage.bucket(BUCKET_NAME);
    const file = bucket.file(key);

    // Upload the file
    const stream = file.createWriteStream({
      metadata: {
        contentType: contentType,
      },
      // Don't set public: true here because uniform bucket-level access is enabled
      // Public access is managed at the bucket level via IAM policies
    });

    return new Promise((resolve, reject) => {
      stream.on('error', (error) => {
        console.error('GCS upload error:', error);
        reject(new Error(`GCS upload failed: ${error.message}`));
      });

      stream.on('finish', () => {
        // Construct the public URL
        const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${key}`;
        console.log(`GCS upload successful: ${key}`);
        resolve(publicUrl);
      });

      stream.end(processedBuffer);
    });
  } catch (error) {
    console.error('GCS upload error:', error);
    
    // Fallback to local storage if GCS fails
    console.log('Falling back to local storage...');
    return await uploadToLocal(fileBuffer, key, contentType);
  }
}

/**
 * Local storage fallback function
 * @param {Buffer|Object} fileBuffer - The file buffer
 * @param {string} key - The file key/path
 * @param {string} contentType - The file's mime type
 * @returns {Promise<string>} - Local URL of the uploaded file
 */
async function uploadToLocal(fileBuffer, key, contentType) {
  try {
    const fs = await import('fs/promises');
    const pathModule = await import('path');
    
    // Process fileBuffer to ensure we have a valid buffer
    let processedBuffer;
    if (Buffer.isBuffer(fileBuffer)) {
      processedBuffer = fileBuffer;
    } else if (fileBuffer && typeof fileBuffer === 'object') {
      if (Buffer.isBuffer(fileBuffer.buffer)) {
        processedBuffer = fileBuffer.buffer;
      } else if (Buffer.isBuffer(fileBuffer.data)) {
        processedBuffer = fileBuffer.data;
      } else {
        throw new Error('Invalid file buffer format for local storage');
      }
    } else {
      throw new Error('Invalid file buffer provided for local storage');
    }

    // Create local uploads directory
    const uploadsDir = pathModule.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });
    
    // Generate local file path
    const fileName = pathModule.basename(key);
    const filePath = pathModule.join(uploadsDir, fileName);
    
    // Save file to local storage
    await fs.writeFile(filePath, processedBuffer);
    
    // Return local URL
    const localUrl = `/uploads/${fileName}`;
    console.log(`Local storage upload successful: ${localUrl}`);
    return localUrl;
  } catch (error) {
    console.error('Local storage upload error:', error);
    throw new Error(`Local storage upload failed: ${error.message}`);
  }
}

/**
 * Upload profile picture specifically
 * @param {Object} file - Multer file object
 * @param {string} userId - User ID for organizing files
 * @returns {Promise<string>} - URL of the uploaded profile picture
 */
export async function uploadProfilePicture(file, userId) {
  try {
    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const fileName = `profiles/${userId}_${Date.now()}${fileExtension}`;
    
    // Upload to GCS or local storage
    const url = await uploadToGCS(file, fileName, file.mimetype);
    
    console.log(`Profile picture uploaded successfully for user ${userId}: ${url}`);
    return url;
  } catch (error) {
    console.error('Profile picture upload error:', error);
    throw error;
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
 * Create GCS bucket if it doesn't exist
 * @returns {Promise<boolean>} - Success status
 */
export async function createBucketIfNotExists() {
  if (!storage) {
    console.log('GCS not initialized, skipping bucket creation');
    return false;
  }

  try {
    const bucket = storage.bucket(BUCKET_NAME);
    const [exists] = await bucket.exists();
    
    if (!exists) {
      console.log(`Creating GCS bucket: ${BUCKET_NAME}`);
      await storage.createBucket(BUCKET_NAME, {
        location: 'EUROPE-WEST2', // London region
        storageClass: 'STANDARD',
      });
      console.log(`✅ Bucket ${BUCKET_NAME} created successfully`);
    } else {
      console.log(`✅ Bucket ${BUCKET_NAME} already exists`);
    }
    
    return true;
  } catch (error) {
    console.error('Error creating bucket:', error);
    return false;
  }
}

/**
 * Check GCS connection and bucket status
 * @returns {Promise<Object>} - Connection status
 */
export async function checkGCSConnection() {
  const result = {
    initialized: !!storage,
    bucket: BUCKET_NAME,
    success: false,
    error: null
  };

  if (!storage) {
    result.error = 'GCS not initialized - missing credentials or project ID';
    return result;
  }

  try {
    const bucket = storage.bucket(BUCKET_NAME);
    const [exists] = await bucket.exists();
    
    result.success = true;
    result.bucketExists = exists;
    
    if (!exists) {
      result.message = 'Bucket does not exist but connection is working';
    } else {
      result.message = 'Bucket exists and is accessible';
    }
    
    return result;
  } catch (error) {
    result.error = error.message;
    return result;
  }
}

/**
 * Sanitize a filename for GCS storage
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

export default {
  uploadToGCS,
  uploadProfilePicture,
  createBucketIfNotExists,
  checkGCSConnection,
  sanitizeFilename
};
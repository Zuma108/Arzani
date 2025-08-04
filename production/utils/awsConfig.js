import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';

// Fix dirname not defined error
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); // <-- Fix: use path.dirname instead of undefined dirname

// Load environment variables in order of precedence
function loadEnvironment() {
  // Try loading from .env.local first (highest precedence)
  dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
  
  // Then from environment-specific file
  const nodeEnv = process.env.NODE_ENV || 'development';
  dotenv.config({ path: path.join(__dirname, '..', `.env.${nodeEnv}`) });
  
  // Finally from .env (lowest precedence)
  dotenv.config({ path: path.join(__dirname, '..', '.env') });
}

// Validate AWS credentials 
async function validateAwsCredentials() {
  const credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    bucketName: process.env.AWS_BUCKET_NAME
  };

  console.log("Validating AWS credentials:", {
    accessKeyId: credentials.accessKeyId ? `${credentials.accessKeyId.substring(0, 5)}...` : 'undefined',
    secretAccessKey: credentials.secretAccessKey ? '***' : 'undefined', 
    region: credentials.region,
    bucketName: credentials.bucketName
  });

  // Check if any credentials are missing
  const missingCredentials = [];
  if (!credentials.accessKeyId) missingCredentials.push('AWS_ACCESS_KEY_ID');
  if (!credentials.secretAccessKey) missingCredentials.push('AWS_SECRET_ACCESS_KEY');
  if (!credentials.region) missingCredentials.push('AWS_REGION');
  if (!credentials.bucketName) missingCredentials.push('AWS_BUCKET_NAME');

  if (missingCredentials.length > 0) {
    throw new Error(`Missing AWS credentials: ${missingCredentials.join(', ')}`);
  }

  // Verify the credentials actually work
  try {
    const s3Client = new S3Client({
      region: credentials.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey
      }
    });

    await s3Client.send(new ListBucketsCommand({}));
    console.log('✅ Successfully validated AWS credentials');
    return credentials;
  } catch (error) {
    console.error('❌ AWS credential validation failed:', error);
    throw error;
  }
}

// Get a properly configured S3 client
function getS3Client() {
  return new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });
}

// Initialize AWS configurations
export async function initializeAws() {
  loadEnvironment();
  await validateAwsCredentials();
  return {
    getS3Client,
    region: process.env.AWS_REGION,
    bucketName: process.env.AWS_BUCKET_NAME
  };
}

export { getS3Client };

import { up as createMessageAttachmentsTable } from '../../db/migrations/create_message_attachments_table.js';
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Function to test S3 connection
async function testS3Connection() {
  try {
    console.log('Testing S3 connection with credentials:');
    console.log('  Region:', process.env.AWS_REGION || 'not set');
    console.log('  Bucket:', process.env.AWS_BUCKET_NAME || 'not set');
    console.log('  Access Key ID:', process.env.AWS_ACCESS_KEY_ID ? 'set (hidden)' : 'not set');
    console.log('  Secret Access Key:', process.env.AWS_SECRET_ACCESS_KEY ? 'set (hidden)' : 'not set');
    
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.error('❌ AWS credentials not properly configured in .env file');
      return false;
    }
    
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'eu-west-2',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
    
    // Attempt to list buckets to verify credentials
    await s3Client.send(new ListBucketsCommand({}));
    console.log('✅ S3 connection successful');
    return true;
  } catch (error) {
    console.error('❌ S3 connection failed:', error.message);
    return false;
  }
}

async function runMigrations() {
  try {
    // Test S3 connection first
    console.log('Checking S3 connection...');
    const s3Connected = await testS3Connection();
    
    if (!s3Connected) {
      console.warn('⚠️ Warning: S3 connection failed. File uploads may not work correctly.');
      console.warn('Please check your AWS credentials in the .env file.');
    }
    
    // Run database migrations
    console.log('Running message attachments migration...');
    const result = await createMessageAttachmentsTable();
    
    if (result) {
      console.log('✅ Migration completed successfully!');
    } else {
      console.error('❌ Migration failed!');
    }
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    process.exit();
  }
}

runMigrations();

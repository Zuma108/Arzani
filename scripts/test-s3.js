import { checkS3Connection, uploadToS3, validateBucket } from '../utils/s3.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runTests() {
  console.log('\n🔍 RUNNING S3 CONNECTION TESTS');
  console.log('===============================\n');
  
  // Test 1: Check environment variables
  console.log('📋 Checking environment variables:');
  console.log('AWS_REGION:', process.env.AWS_REGION || '❌ Not set');
  console.log('AWS_BUCKET_NAME:', process.env.AWS_BUCKET_NAME || '❌ Not set');
  console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '✅ Set' : '❌ Not set');
  console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '✅ Set' : '❌ Not set');
  console.log();
  
  // Test 2: Check S3 connection
  console.log('🔌 Testing S3 connection...');
  try {
    const connectionResults = await checkS3Connection();
    console.log('Connection results:', connectionResults);
    
    if (connectionResults.credentials) {
      console.log('✅ AWS credentials are valid');
    } else {
      console.log('❌ AWS credentials are invalid');
    }
    
    if (connectionResults.mainRegion?.success) {
      console.log(`✅ Connected to main region (${connectionResults.mainRegion.region})`);
    } else {
      console.log(`❌ Failed to connect to main region (${connectionResults.mainRegion?.region || 'unknown'})`);
    }
    
    if (connectionResults.fallbackRegion?.success) {
      console.log(`✅ Connected to fallback region (${connectionResults.fallbackRegion.region})`);
    } else {
      console.log(`❌ Failed to connect to fallback region (${connectionResults.fallbackRegion?.region || 'unknown'})`);
    }
  } catch (error) {
    console.error('❌ Connection test failed:', error);
  }
  console.log();
  
  // Test 3: Test upload
  console.log('📤 Testing file upload...');
  try {
    // Create a simple test file
    const testDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    const testFilePath = path.join(testDir, 'test-file.txt');
    fs.writeFileSync(testFilePath, 'This is a test file for S3 upload.');
    
    const fileBuffer = fs.readFileSync(testFilePath);
    const testKey = `test-uploads/test-${Date.now()}.txt`;
    
    console.log(`Uploading test file to ${process.env.AWS_REGION || 'eu-west-2'}/${process.env.AWS_BUCKET_NAME || 'arzani-images1'}...`);
    
    const url = await uploadToS3(
      fileBuffer,
      testKey,
      process.env.AWS_REGION || 'eu-west-2',
      process.env.AWS_BUCKET_NAME || 'arzani-images1'
    );
    
    console.log('✅ Upload successful!');
    console.log('📄 File URL:', url);
    
    // Clean up the test file
    fs.unlinkSync(testFilePath);
    
  } catch (error) {
    console.error('❌ Upload test failed:', error);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Tests failed with error:', error);
  process.exit(1);
});

import dotenv from 'dotenv';
import { checkS3Connection, uploadToS3, validateBucket } from './utils/s3.js';
import fs from 'fs/promises';
import path from 'path';

dotenv.config();

async function testGCSUpload() {
  console.log('🧪 Testing Google Cloud Storage Upload...\n');
  
  try {
    // Test 1: Check GCS connection
    console.log('1. Checking GCS connection...');
    const connectionStatus = await checkS3Connection();
    console.log('Connection Status:', connectionStatus);
    
    if (!connectionStatus.success) {
      console.error('❌ GCS connection failed. Please check your credentials and bucket configuration.');
      return;
    }
    
    console.log('✅ GCS connection successful!\n');
    
    // Test 2: Validate bucket
    console.log('2. Validating bucket...');
    const bucketValidation = await validateBucket(process.env.GCS_BUCKET_NAME);
    console.log('Bucket Validation:', bucketValidation);
    
    if (!bucketValidation.success) {
      console.error('❌ Bucket validation failed.');
      return;
    }
    
    console.log('✅ Bucket validation successful!\n');
    
    // Test 3: Create a test file and upload it
    console.log('3. Creating test file...');
    const testContent = `Test file created at ${new Date().toISOString()}`;
    const testFileName = `test-${Date.now()}.txt`;
    const testFilePath = path.join(process.cwd(), testFileName);
    
    await fs.writeFile(testFilePath, testContent);
    console.log(`✅ Test file created: ${testFileName}\n`);
    
    // Test 4: Upload the file
    console.log('4. Uploading test file to GCS...');
    const testBuffer = Buffer.from(testContent);
    const uploadKey = `verification-docs/test/${testFileName}`;
    
    const uploadUrl = await uploadToS3(
      testBuffer,
      uploadKey,
      'text/plain',
      null, // region (unused for GCS)
      process.env.GCS_BUCKET_NAME
    );
    
    console.log('✅ Upload successful!');
    console.log('📁 Upload URL:', uploadUrl);
    
    // Clean up test file
    await fs.unlink(testFilePath);
    console.log('🧹 Test file cleaned up\n');
    
    // Test 5: Test with a fake image file (similar to verification docs)
    console.log('5. Testing image upload simulation...');
    const fakeImageBuffer = Buffer.from('fake-image-data-for-testing');
    const imageKey = `verification-docs/7/${Date.now()}_test-image.png`;
    
    const imageUrl = await uploadToS3(
      fakeImageBuffer,
      imageKey,
      'image/png',
      null,
      process.env.GCS_BUCKET_NAME
    );
    
    console.log('✅ Image upload simulation successful!');
    console.log('🖼️ Image URL:', imageUrl);
    
    console.log('\n🎉 All GCS tests passed! Your Google Cloud Storage is properly configured.');
    
  } catch (error) {
    console.error('❌ GCS test failed:', error);
    console.error('Error details:', error.message);
    
    if (error.message.includes('credentials')) {
      console.log('\n💡 Credential troubleshooting:');
      console.log('1. Check if GOOGLE_APPLICATION_CREDENTIALS path is correct:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
      console.log('2. Verify the service account key file exists');
      console.log('3. Ensure the service account has Storage Admin permissions');
    }
    
    if (error.message.includes('bucket')) {
      console.log('\n💡 Bucket troubleshooting:');
      console.log('1. Check if GCS_BUCKET_NAME is correct:', process.env.GCS_BUCKET_NAME);
      console.log('2. Verify the bucket exists in your GCP project');
      console.log('3. Ensure the bucket has public access configured if needed');
    }
  }
}

// Run the test
testGCSUpload().catch(console.error);
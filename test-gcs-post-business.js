import FormData from 'form-data';
import fs from 'fs';
import fetch from 'node-fetch';

async function testGCSUpload() {
  console.log('Testing GCS upload functionality for post-business...');

  // Create a test image buffer
  const testImagePath = './test-image.png';
  let testImageBuffer;
  
  try {
    // Try to read existing test image, or create a simple one
    if (fs.existsSync(testImagePath)) {
      testImageBuffer = fs.readFileSync(testImagePath);
    } else {
      // Create a simple test image (1x1 PNG)
      testImageBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x01, 0x00, 0x00, 0x00, 0x00, 0x37, 0x6E, 0xF9, 0x24, 0x00, 0x00, 0x00,
        0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x62, 0x00, 0x00, 0x00, 0x02,
        0x00, 0x01, 0xE5, 0x27, 0xDE, 0xFC, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
        0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
      ]);
    }
  } catch (error) {
    console.error('Error creating test image:', error);
    return;
  }

  // Test data
  const testData = {
    authToken: 'test-token', // This should be a real token for testing
    userId: 'test-user',
    fileName: 'test-business-image.png',
    fileSize: testImageBuffer.length
  };

  console.log('Test data:', testData);

  try {
    // Test 1: Upload image via GCS endpoint
    console.log('\n1. Testing GCS upload endpoint...');
    
    const formData = new FormData();
    formData.append('file', testImageBuffer, {
      filename: testData.fileName,
      contentType: 'image/png'
    });

    const uploadResponse = await fetch('http://localhost:5000/api/s3-upload', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${testData.authToken}`,
        'X-GCS-Bucket': 'arzani-marketplace-files',
        ...formData.getHeaders()
      }
    });

    if (uploadResponse.ok) {
      const uploadResult = await uploadResponse.json();
      console.log('✅ GCS upload successful:', uploadResult);
      
      // Verify the URL format
      if (uploadResult.url && uploadResult.url.includes('storage.googleapis.com')) {
        console.log('✅ URL format is correct for GCS');
      } else {
        console.log('❌ URL format might be incorrect:', uploadResult.url);
      }
    } else {
      const errorText = await uploadResponse.text();
      console.log('❌ GCS upload failed:', uploadResponse.status, errorText);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  // Test 2: Check GCS configuration
  console.log('\n2. Testing GCS configuration...');
  try {
    const { gcsClient, gcsBucket } = await import('./utils/s3.js');
    console.log('✅ GCS client imported successfully');
    console.log('✅ GCS bucket:', gcsBucket.name);
  } catch (error) {
    console.error('❌ GCS configuration error:', error.message);
  }

  // Test 3: Verify environment variables
  console.log('\n3. Checking environment variables...');
  console.log('GCS_BUCKET_NAME:', process.env.GCS_BUCKET_NAME || 'Not set');
  console.log('GOOGLE_CLOUD_PROJECT_ID:', process.env.GOOGLE_CLOUD_PROJECT_ID || 'Not set');
  console.log('GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS || 'Not set');

  if (process.env.GCS_BUCKET_NAME && process.env.GOOGLE_CLOUD_PROJECT_ID) {
    console.log('✅ Required GCS environment variables are set');
  } else {
    console.log('❌ Missing required GCS environment variables');
  }
}

// Run the test
testGCSUpload().catch(console.error);
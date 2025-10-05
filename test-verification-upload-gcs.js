import dotenv from 'dotenv';
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

dotenv.config();

async function testVerificationUpload() {
  console.log('🧪 Testing Verification Upload with GCS...\n');
  
  try {
    // Create a test image file
    const testImageContent = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');
    const testFileName = `test-verification-${Date.now()}.png`;
    const testFilePath = path.join(process.cwd(), testFileName);
    
    fs.writeFileSync(testFilePath, testImageContent);
    console.log(`✅ Test image created: ${testFileName}`);
    
    // Create form data
    const form = new FormData();
    form.append('businessRegistration', fs.createReadStream(testFilePath), {
      filename: testFileName,
      contentType: 'image/png'
    });
    form.append('userId', '7'); // Test user ID
    
    console.log('📤 Sending upload request...');
    
    // Make the upload request
    const response = await fetch('http://localhost:5000/api/verification/upload', {
      method: 'POST',
      body: form,
      headers: {
        'Authorization': `Bearer ${process.env.ADMIN_JWT_TOKEN}`,
        ...form.getHeaders()
      }
    });
    
    const result = await response.json();
    
    console.log('📊 Response Status:', response.status);
    console.log('📋 Response Body:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Verification upload test successful!');
      if (result.documents && result.documents.length > 0) {
        console.log('📁 Uploaded file URL:', result.documents[0].url);
      }
    } else {
      console.log('❌ Verification upload test failed');
    }
    
    // Clean up test file
    fs.unlinkSync(testFilePath);
    console.log('🧹 Test file cleaned up');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', error.message);
  }
}

// Run the test if server is running
testVerificationUpload().catch(console.error);
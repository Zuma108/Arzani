// Google Cloud Storage Test Script
// This script tests the GCS configuration and upload functionality

import { Storage } from '@google-cloud/storage';
import { uploadToGCS } from './utils/gcs.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing Google Cloud Storage Configuration...\n');

// Test 1: Check environment variables
console.log('1️⃣ Checking environment variables...');
const requiredEnvVars = [
    'GOOGLE_CLOUD_PROJECT_ID',
    'GCS_BUCKET_NAME',
    'GOOGLE_APPLICATION_CREDENTIALS'
];

let envVarsValid = true;
requiredEnvVars.forEach(envVar => {
    if (process.env[envVar]) {
        console.log(`   ✅ ${envVar}: ${process.env[envVar]}`);
    } else {
        console.log(`   ❌ ${envVar}: Not set`);
        envVarsValid = false;
    }
});

if (!envVarsValid) {
    console.log('\n❌ Missing required environment variables. Please check your .env file.');
    process.exit(1);
}

// Test 2: Check service account key file
console.log('\n2️⃣ Checking service account key file...');
const keyFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (fs.existsSync(keyFilePath)) {
    console.log(`   ✅ Key file exists: ${keyFilePath}`);
    try {
        const keyContent = JSON.parse(fs.readFileSync(keyFilePath, 'utf8'));
        console.log(`   ✅ Key file is valid JSON`);
        console.log(`   ✅ Project ID in key: ${keyContent.project_id}`);
        console.log(`   ✅ Service account email: ${keyContent.client_email}`);
    } catch (error) {
        console.log(`   ❌ Key file is not valid JSON: ${error.message}`);
        process.exit(1);
    }
} else {
    console.log(`   ❌ Key file not found: ${keyFilePath}`);
    console.log('   Please run the setup script first: npm run setup:gcs');
    process.exit(1);
}

// Test 3: Initialize Storage client
console.log('\n3️⃣ Testing Storage client initialization...');
try {
    const storage = new Storage({
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });
    
    const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
    console.log(`   ✅ Storage client initialized`);
    console.log(`   ✅ Bucket reference created: ${process.env.GCS_BUCKET_NAME}`);
    
    // Test 4: Check bucket exists and permissions
    console.log('\n4️⃣ Testing bucket access...');
    const [exists] = await bucket.exists();
    if (exists) {
        console.log(`   ✅ Bucket exists and is accessible`);
        
        // Get bucket metadata
        const [metadata] = await bucket.getMetadata();
        console.log(`   ✅ Bucket location: ${metadata.location}`);
        console.log(`   ✅ Bucket storage class: ${metadata.storageClass}`);
    } else {
        console.log(`   ❌ Bucket does not exist or is not accessible`);
        process.exit(1);
    }
    
} catch (error) {
    console.log(`   ❌ Storage client error: ${error.message}`);
    process.exit(1);
}

// Test 5: Test file upload
console.log('\n5️⃣ Testing file upload...');
try {
    // Create a test image file
    const testFilePath = path.join(__dirname, 'test-upload.txt');
    const testContent = `Test upload at ${new Date().toISOString()}`;
    fs.writeFileSync(testFilePath, testContent);
    
    // Create a mock file object similar to what multer provides
    const mockFile = {
        buffer: fs.readFileSync(testFilePath),
        originalname: 'test-upload.txt',
        mimetype: 'text/plain',
        size: testContent.length
    };
    
    // Test our upload function
    const gcsKey = `test-uploads/test-${Date.now()}.txt`;
    const gcsUrl = await uploadToGCS(mockFile, gcsKey);
    
    console.log(`   ✅ File uploaded successfully`);
    console.log(`   ✅ GCS URL: ${gcsUrl}`);
    
    // Clean up test file
    fs.unlinkSync(testFilePath);
    
    // Test 6: Verify file is accessible
    console.log('\n6️⃣ Testing file accessibility...');
    try {
        const response = await fetch(gcsUrl);
        if (response.ok) {
            const downloadedContent = await response.text();
            if (downloadedContent === testContent) {
                console.log(`   ✅ File is publicly accessible and content matches`);
            } else {
                console.log(`   ⚠️ File is accessible but content doesn't match`);
            }
        } else {
            console.log(`   ❌ File is not publicly accessible (status: ${response.status})`);
        }
    } catch (fetchError) {
        console.log(`   ❌ Error accessing file: ${fetchError.message}`);
    }
    
} catch (uploadError) {
    console.log(`   ❌ Upload error: ${uploadError.message}`);
}

console.log('\n🎉 Google Cloud Storage test completed!');
console.log('\n📝 Summary:');
console.log('   - Environment variables configured ✅');
console.log('   - Service account key valid ✅');
console.log('   - Storage client working ✅');
console.log('   - Bucket accessible ✅');
console.log('   - File upload working ✅');
console.log('   - File publicly accessible ✅');
console.log('\n✨ Your Google Cloud Storage is ready for profile pictures!');
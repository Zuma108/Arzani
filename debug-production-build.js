#!/usr/bin/env node

/**
 * Debug script to test production build locally
 * This simulates what GitHub Actions does
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing production build process locally...\n');

// Clean up any existing test-production directory
const testProdDir = path.join(__dirname, 'test-production');
if (fs.existsSync(testProdDir)) {
  console.log('🗑️ Cleaning up existing test-production directory...');
  fs.rmSync(testProdDir, { recursive: true, force: true });
}

// Create production directory (simulating GitHub Actions)
console.log('📁 Creating test-production directory...');
fs.mkdirSync(testProdDir);

// Copy essential files
console.log('📋 Copying essential files...');
const essentialFiles = ['package.json', 'server.js'];
essentialFiles.forEach(file => {
  if (fs.existsSync(path.join(__dirname, file))) {
    fs.copyFileSync(
      path.join(__dirname, file), 
      path.join(testProdDir, file)
    );
    console.log(`✅ Copied ${file}`);
  } else {
    console.log(`❌ Missing ${file}`);
  }
});

// Copy critical directories (simulating GitHub Actions)
const criticalDirs = ['api', 'views', 'public', 'routes', 'middleware', 'services', 'libs', 'utils', 'migrations', 'socket'];

criticalDirs.forEach(dir => {
  const srcDir = path.join(__dirname, dir);
  const destDir = path.join(testProdDir, dir);
  
  if (fs.existsSync(srcDir)) {
    console.log(`📁 Copying ${dir} directory...`);
    
    // Copy directory recursively
    fs.cpSync(srcDir, destDir, { recursive: true });
    
    // Verify the copy worked
    if (fs.existsSync(destDir)) {
      const files = fs.readdirSync(destDir, { recursive: true });
      console.log(`✅ ${dir} copied successfully (${files.length} items)`);
      
      // Special verification for api directory
      if (dir === 'api') {
        console.log('🔍 Verifying api directory contents:');
        const apiFiles = fs.readdirSync(destDir);
        apiFiles.forEach(file => {
          console.log(`   📄 ${file}`);
        });
        
        // Check specific files
        const requiredApiFiles = ['valuation.js', 'public-valuation.js'];
        requiredApiFiles.forEach(file => {
          const filePath = path.join(destDir, file);
          if (fs.existsSync(filePath)) {
            console.log(`✅ ${file} found in production build`);
          } else {
            console.log(`❌ ${file} missing in production build`);
          }
        });
      }
    } else {
      console.log(`❌ Failed to copy ${dir} directory`);
    }
  } else {
    console.log(`⚠️ ${dir} directory not found, skipping`);
  }
});

// Summary
console.log('\n📊 Test Production Build Summary:');
if (fs.existsSync(path.join(testProdDir, 'api', 'valuation.js')) && 
    fs.existsSync(path.join(testProdDir, 'api', 'public-valuation.js'))) {
  console.log('✅ All critical API files present in production build');
  console.log('🎯 Local build process works correctly');
  console.log('🚨 Issue is likely in GitHub Actions environment or caching');
} else {
  console.log('❌ Critical API files missing in production build');
  console.log('🔧 Local build process needs fixing');
}

console.log('\n🧹 Cleaning up test directory...');
fs.rmSync(testProdDir, { recursive: true, force: true });
console.log('✅ Cleanup complete');

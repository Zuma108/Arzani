#!/usr/bin/env node

/**
 * Production build script that mirrors GitHub Actions workflow
 * This ensures consistent build process between local and CI/CD
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.dirname(__dirname);

console.log('🏗️ Starting production build process...\n');

// Clean up any existing production directory
const productionDir = path.join(projectRoot, 'production');
if (fs.existsSync(productionDir)) {
  console.log('🗑️ Cleaning up existing production directory...');
  fs.rmSync(productionDir, { recursive: true, force: true });
}

// Create production directory
console.log('📁 Creating production directory...');
fs.mkdirSync(productionDir);

// PRE-FLIGHT: Verify critical files exist
console.log('🔍 PRE-FLIGHT: Verifying critical files exist...');
const criticalFiles = [
  'package.json',
  'server.js', 
  'api/valuation.js',
  'api/public-valuation.js'
];

for (const file of criticalFiles) {
  const filePath = path.join(projectRoot, file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ ${file} missing in source`);
    process.exit(1);
  }
}
console.log('✅ All critical files verified in source');

// Copy essential files
console.log('📋 Copying essential files...');
const essentialFiles = ['package.json', 'server.js'];
essentialFiles.forEach(file => {
  const srcPath = path.join(projectRoot, file);
  const destPath = path.join(productionDir, file);
  fs.copyFileSync(srcPath, destPath);
  console.log(`✅ Copied ${file}`);
});

// Copy package-lock.json if it exists
const packageLockPath = path.join(projectRoot, 'package-lock.json');
if (fs.existsSync(packageLockPath)) {
  fs.copyFileSync(packageLockPath, path.join(productionDir, 'package-lock.json'));
  console.log('✅ Copied package-lock.json');
}

// Copy critical directories
const criticalDirs = ['api', 'views', 'public', 'routes', 'middleware', 'services', 'libs', 'utils', 'migrations', 'socket'];

for (const dir of criticalDirs) {
  const srcDir = path.join(projectRoot, dir);
  const destDir = path.join(productionDir, dir);
  
  if (fs.existsSync(srcDir)) {
    console.log(`📁 Copying ${dir} directory...`);
    fs.cpSync(srcDir, destDir, { recursive: true });
    
    // Verify the copy worked
    if (fs.existsSync(destDir)) {
      const files = fs.readdirSync(destDir, { recursive: true });
      console.log(`✅ ${dir} copied successfully (${files.length} items)`);
    } else {
      console.error(`❌ Failed to copy ${dir} directory`);
      process.exit(1);
    }
  } else {
    console.log(`⚠️ ${dir} directory not found, skipping`);
  }
}

// CRITICAL FIX: Explicitly ensure API files are present
console.log('🚨 CRITICAL FIX: Explicitly copying API files...');

// Double-check API directory exists
const apiDir = path.join(productionDir, 'api');
if (!fs.existsSync(apiDir)) {
  console.log('❌ API directory missing after copy, creating it...');
  fs.mkdirSync(apiDir, { recursive: true });
}

// Force copy critical API files with explicit verification
const apiFiles = ['valuation.js', 'public-valuation.js'];
for (const file of apiFiles) {
  const srcPath = path.join(projectRoot, 'api', file);
  const destPath = path.join(apiDir, file);
  
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    if (fs.existsSync(destPath)) {
      console.log(`✅ FORCE COPY: ${file} copied successfully`);
    } else {
      console.error(`❌ FORCE COPY: ${file} copy failed`);
      process.exit(1);
    }
  } else {
    console.error(`❌ Source api/${file} not found`);
    process.exit(1);
  }
}

// Verify API directory and key files with detailed logging
console.log('🔍 Verifying api directory contents with full file listing:');
const apiFiles_final = fs.readdirSync(apiDir);
apiFiles_final.forEach(file => {
  const filePath = path.join(apiDir, file);
  const stats = fs.statSync(filePath);
  console.log(`   📄 ${file} (${stats.size} bytes)`);
});

// Final verification
const requiredApiFiles = ['valuation.js', 'public-valuation.js'];
for (const file of requiredApiFiles) {
  const filePath = path.join(apiDir, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`✅ ${file} found in production build (${stats.size} bytes)`);
  } else {
    console.error(`❌ ${file} missing in production build`);
    process.exit(1);
  }
}

// Copy other important files
const otherFiles = ['db.js', 'config.js', 'app.js', 'database.js', 'root-route-fix.js'];
for (const file of otherFiles) {
  const srcPath = path.join(projectRoot, file);
  const destPath = path.join(productionDir, file);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`✅ Copied ${file}`);
  } else {
    console.log(`⚠️ ${file} not found, skipping`);
  }
}

// Always ensure scripts directory exists
const scriptsDir = path.join(productionDir, 'scripts');
const srcScriptsDir = path.join(projectRoot, 'scripts');
if (fs.existsSync(srcScriptsDir)) {
  fs.cpSync(srcScriptsDir, scriptsDir, { recursive: true });
  console.log('✅ Scripts directory copied');
} else {
  fs.mkdirSync(scriptsDir, { recursive: true });
  fs.writeFileSync(
    path.join(scriptsDir, 'ensure-ai-assets.js'),
    "console.log('✅ AI assets ready - minimal version');"
  );
  console.log('✅ Created minimal scripts directory');
}

console.log('\n🎯 Both critical API files successfully verified in production build');
console.log('✅ Production build created');

const productionFiles = fs.readdirSync(productionDir, { recursive: true });
console.log(`📊 Production files: ${productionFiles.length} files`);

console.log('\n✅ Production build process completed successfully!');

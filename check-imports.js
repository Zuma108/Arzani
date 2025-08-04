#!/usr/bin/env node

/**
 * Diagnostic script to check all imports in server.js
 * and verify that the referenced files exist
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Checking server.js imports for missing files...\n');

// Read server.js content
const serverJsPath = path.join(__dirname, 'server.js');
const serverContent = fs.readFileSync(serverJsPath, 'utf8');

// Extract import statements (excluding commented lines)
console.log('🔍 Searching for import statements...');

// Split content into lines and process each line
const lines = serverContent.split('\n');
const imports = [];

lines.forEach((line, index) => {
  // Skip commented lines
  const trimmedLine = line.trim();
  if (trimmedLine.startsWith('//') || trimmedLine.startsWith('/*')) {
    return;
  }
  
  // Check for import statements in non-commented lines
  const importRegex = /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)?\s*from\s+['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = importRegex.exec(line)) !== null) {
    imports.push(match[1]);
    // Debug: Show imports that contain 'dev-auth'
    if (match[1].includes('dev-auth')) {
      console.log('🚨 Found dev-auth import on line', index + 1, ':', match[0]);
      console.log('   Full line:', line);
    }
  }
});

console.log(`Found ${imports.length} import statements\n`);

// Check each import
const missingFiles = [];
const foundFiles = [];

imports.forEach(importPath => {
  // Skip node_modules imports
  if (!importPath.startsWith('./') && !importPath.startsWith('../')) {
    return;
  }

  // Resolve the full path
  let fullPath = path.resolve(__dirname, importPath);
  
  // Add .js extension if not present
  if (!path.extname(fullPath)) {
    fullPath += '.js';
  }

  // Check if file exists
  if (fs.existsSync(fullPath)) {
    foundFiles.push({ importPath, fullPath, status: '✅' });
  } else {
    missingFiles.push({ importPath, fullPath, status: '❌' });
  }
});

// Display results
console.log('📋 Import Analysis Results:\n');

foundFiles.forEach(file => {
  console.log(`${file.status} ${file.importPath}`);
});

if (missingFiles.length > 0) {
  console.log('\n🚨 MISSING FILES DETECTED:\n');
  missingFiles.forEach(file => {
    console.log(`${file.status} ${file.importPath}`);
    console.log(`   Expected at: ${file.fullPath}`);
    
    // Check if file might be in public/js
    const publicJsPath = path.join(__dirname, 'public', 'js', path.basename(file.fullPath));
    if (fs.existsSync(publicJsPath)) {
      console.log(`   🔍 Found in: public/js/${path.basename(file.fullPath)}`);
    }
    
    // Check if file might be in deploy folder
    const deployPath = path.join(__dirname, 'deploy', path.basename(file.fullPath));
    if (fs.existsSync(deployPath)) {
      console.log(`   🔍 Found in: deploy/${path.basename(file.fullPath)}`);
    }
    
    console.log('');
  });

  console.log('💡 SUGGESTED FIXES:');
  console.log('1. Update import paths in server.js to point to new locations');
  console.log('2. Move files back to expected locations');
  console.log('3. Ensure GitHub Actions workflow copies all required files\n');
} else {
  console.log('\n✅ All imports are valid - no missing files detected!\n');
}

console.log('🔧 Production build verification:');
console.log('Make sure these files are included in the GitHub Actions workflow:');
missingFiles.forEach(file => {
  console.log(`- ${path.basename(file.fullPath)}`);
});

if (missingFiles.length === 0) {
  console.log('✅ No additional files needed in production build');
}

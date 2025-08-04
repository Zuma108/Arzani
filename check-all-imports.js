#!/usr/bin/env node

/**
 * Comprehensive import checker that follows the dependency chain
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Checking entire import dependency chain...\n');

const checkedFiles = new Set();
const missingFiles = new Set();
const importGraph = new Map();

function extractImports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const imports = [];

    lines.forEach((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('//') || trimmedLine.startsWith('/*')) {
        return;
      }
      
      const importRegex = /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)?\s*from\s+['"]([^'"]+)['"]/g;
      let match;
      
      while ((match = importRegex.exec(line)) !== null) {
        const importPath = match[1];
        if (importPath.startsWith('./') || importPath.startsWith('../')) {
          imports.push(importPath);
        }
      }
    });

    return imports;
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return [];
  }
}

function resolveImportPath(currentFile, importPath) {
  const currentDir = path.dirname(currentFile);
  let resolvedPath = path.resolve(currentDir, importPath);
  
  if (!path.extname(resolvedPath)) {
    resolvedPath += '.js';
  }
  
  return resolvedPath;
}

function checkFileRecursively(filePath) {
  if (checkedFiles.has(filePath)) return;
  checkedFiles.add(filePath);
  
  if (!fs.existsSync(filePath)) {
    missingFiles.add(filePath);
    console.log(`❌ Missing: ${path.relative(__dirname, filePath)}`);
    return;
  }
  
  console.log(`✅ Found: ${path.relative(__dirname, filePath)}`);
  
  const imports = extractImports(filePath);
  importGraph.set(filePath, imports);
  
  imports.forEach(importPath => {
    const resolvedPath = resolveImportPath(filePath, importPath);
    checkFileRecursively(resolvedPath);
  });
}

// Start with server.js
const serverPath = path.join(__dirname, 'server.js');
console.log('Starting dependency check from server.js...\n');
checkFileRecursively(serverPath);

console.log('\n📊 Summary:');
console.log(`Total files checked: ${checkedFiles.size}`);
console.log(`Missing files: ${missingFiles.size}`);

if (missingFiles.size > 0) {
  console.log('\n🚨 Missing files that will cause container startup failure:');
  missingFiles.forEach(file => {
    console.log(`  - ${path.relative(__dirname, file)}`);
  });
} else {
  console.log('\n✅ All dependency files are present!');
}

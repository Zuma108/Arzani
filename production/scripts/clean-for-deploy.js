import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Directories to remove before deployment
const dirsToRemove = [
  '.git',
  'logs',
  'tmp',
  'coverage',
  '.cache',
  'dist/dev',
  'build/temp'
];

// Add uploads to directories that should be backed up but not deployed
const uploadDir = 'public/uploads';

// File patterns to remove
const filePatterns = [
  '*.log',
  '*.bak',
  '.DS_Store',
  'npm-debug.log*',
  'yarn-debug.log*',
  'yarn-error.log*'
];

console.log('Cleaning project for deployment...');

// Check if uploads directory exists and handle it specially
const uploadsPath = path.join(rootDir, uploadDir);
if (fs.existsSync(uploadsPath)) {
  console.log(`\nWARNING: Upload directory found (${uploadDir})`);
  console.log('This directory likely contains user-generated content.');
  console.log('Options:');
  console.log('1. Back up this directory to external storage before removing');
  console.log('2. Use a cloud storage solution for uploads instead of local files');
  console.log(`3. Run: mkdir -p "${uploadsPath}" in your deployment environment\n`);
}

// Actually remove directories
dirsToRemove.forEach(dir => {
  const dirPath = path.join(rootDir, dir);
  if (fs.existsSync(dirPath)) {
    console.log(`Removing: ${dir}`);
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`✅ Removed: ${dir}`);
    } catch (err) {
      console.error(`❌ Failed to remove ${dir}: ${err.message}`);
    }
  }
});

console.log('\nDeployment preparation complete!');

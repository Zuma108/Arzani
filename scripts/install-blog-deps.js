/**
 * Script to install all blog-related dependencies
 */

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// List of required packages for the blog system
const requiredPackages = [
  'sanitize-html',
  'showdown',
  'reading-time',
  'slugify',
  'multer',
  'axios'
];

// Check if package.json exists
const packageJsonPath = path.join(rootDir, 'package.json');
let packageJson = {};

if (fs.existsSync(packageJsonPath)) {
  try {
    const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
    packageJson = JSON.parse(packageJsonContent);
  } catch (error) {
    console.error('Error reading package.json:', error);
    process.exit(1);
  }
} else {
  console.error('package.json not found in project root!');
  process.exit(1);
}

// Check which packages are already installed
const installedPackages = packageJson.dependencies || {};
const packagesToInstall = requiredPackages.filter(pkg => !installedPackages[pkg]);

if (packagesToInstall.length === 0) {
  console.log('All required blog packages are already installed!');
  process.exit(0);
}

console.log(`Installing missing blog packages: ${packagesToInstall.join(', ')}`);

// Install missing packages
const installCommand = `npm install ${packagesToInstall.join(' ')}`;
exec(installCommand, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error installing packages: ${error.message}`);
    process.exit(1);
  }
  
  console.log(stdout);
  
  if (stderr) {
    console.error(stderr);
  }
  
  console.log('Blog packages installed successfully!');
});

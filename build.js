const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Create the css directory if it doesn't exist
const cssDir = path.join(__dirname, 'public', 'css');
if (!fs.existsSync(cssDir)) {
  fs.mkdirSync(cssDir, { recursive: true });
  console.log('Created CSS directory');
}

// Build Tailwind CSS for production
console.log('Building Tailwind CSS for production...');
try {
  execSync('npm run build:css', { stdio: 'inherit' });
  console.log('Tailwind CSS built successfully');
} catch (error) {
  console.error('Error building Tailwind CSS:', error.message);
  process.exit(1);
}

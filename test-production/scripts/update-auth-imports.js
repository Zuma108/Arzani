const fs = require('fs').promises;
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// Old import patterns to find
const oldImportPatterns = [
  /import\s+.*\s+from\s+['"]\.\.\/auth\/login2\.js['"]/,
  /import\s+.*\s+from\s+['"]\.\.\/routes\/authRoutes\.js['"]/,
  /import\s+.*\s+from\s+['"]\.\.\/auth\.js['"]/,
  /import\s+.*\s+from\s+['"]\.\.\/public\/auth\/auth\.js['"]/
];

// New import to replace with
const newAuthImport = "import { authenticateUser, populateUser } from '../middleware/auth.js';";
const newRoutesImport = "import authRoutes from '../routes/auth.js';";

// Middleware replacement patterns
const oldMiddlewarePatterns = [
  /authenticateToken/g,
  /auth\.authenticateToken/g
];
const newMiddleware = "authenticateUser";

// Function to recursively process files
async function processDirectory(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    
    // Skip node_modules, .git and other non-relevant directories
    if (entry.isDirectory()) {
      if (!['node_modules', '.git', 'public/css', 'public/images'].includes(entry.name)) {
        await processDirectory(fullPath);
      }
      continue;
    }
    
    // Only process JavaScript files
    if (!entry.name.endsWith('.js')) continue;
    
    // Skip the files we're deleting
    if ([
      'auth/login2.js',
      'auth.js',
      'public/auth/auth.js',
      'routes/authRoutes.js'
    ].includes(path.relative(rootDir, fullPath).replace(/\\/g, '/'))) {
      continue;
    }

    try {
      let content = await fs.readFile(fullPath, 'utf8');
      let modified = false;
      
      // Check for old import patterns
      for (const pattern of oldImportPatterns) {
        if (pattern.test(content)) {
          content = content.replace(pattern, (match) => {
            if (match.includes('authRoutes')) {
              return newRoutesImport;
            } else {
              return newAuthImport;
            }
          });
          modified = true;
        }
      }
      
      // Replace middleware usages
      for (const pattern of oldMiddlewarePatterns) {
        if (pattern.test(content)) {
          content = content.replace(pattern, newMiddleware);
          modified = true;
        }
      }
      
      // Save changes if the file was modified
      if (modified) {
        console.log(`Updated imports in: ${path.relative(rootDir, fullPath)}`);
        await fs.writeFile(fullPath, content, 'utf8');
      }
    } catch (error) {
      console.error(`Error processing ${fullPath}: ${error.message}`);
    }
  }
}

// Main function
async function main() {
  try {
    console.log('Starting auth import updates...');
    await processDirectory(rootDir);
    console.log('Auth import updates complete!');
  } catch (error) {
    console.error('Error:', error);
  }
}

main();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('=== Azure Module Debug ===');

// Check package.json for type field
const packageJsonPath = path.join(rootDir, 'package.json');
try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  console.log(`Package name: ${packageJson.name}`);
  console.log(`Package type: ${packageJson.type || 'not set (default: commonjs)'}`);
  console.log(`Dependencies: ${Object.keys(packageJson.dependencies || {}).length}`);
  console.log(`Dev Dependencies: ${Object.keys(packageJson.devDependencies || {}).length}`);
  
  if (packageJson.type === 'module' || packageJson.main?.endsWith('.mjs')) {
    console.log('ESM mode detected. Checking for common ESM issues...');
  }
} catch (err) {
  console.error(`Error reading package.json: ${err.message}`);
}

// Check if server.js exists
const serverJsPath = path.join(rootDir, 'server.js');
if (!fs.existsSync(serverJsPath)) {
  console.error('server.js not found in root directory!');
  process.exit(1);
}

// Read server.js to identify imports
try {
  const serverCode = fs.readFileSync(serverJsPath, 'utf8');
  console.log('\nAnalyzing imports in server.js:');
  
  // Extract import statements (simple regex, not perfect but helpful)
  const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  
  const imports = new Set();
  let match;
  
  // Find ESM imports
  while ((match = importRegex.exec(serverCode)) !== null) {
    imports.add(match[1]);
  }
  
  // Find CommonJS requires
  while ((match = requireRegex.exec(serverCode)) !== null) {
    imports.add(match[1]);
  }
  
  console.log(`Found ${imports.size} imports/requires.`);
  
  // Test each import
  console.log('\nTesting each module:');
  for (const importPath of imports) {
    try {
      // Check if it's a relative path or package
      if (importPath.startsWith('./') || importPath.startsWith('../')) {
        const resolvedPath = path.resolve(path.dirname(serverJsPath), importPath);
        console.log(`- ${importPath} (${fs.existsSync(resolvedPath) ? 'exists' : 'MISSING!'})`);
      } else {
        try {
          // For non-relative imports, check if we can import them
          const modulePath = require.resolve(importPath, { paths: [rootDir] });
          console.log(`- ${importPath} (resolved to ${modulePath})`);
        } catch (err) {
          console.error(`- ${importPath} (ERROR: ${err.code} - ${err.message})`);
        }
      }
    } catch (err) {
      console.error(`- Error checking ${importPath}: ${err.message}`);
    }
  }

  // Look for dynamic imports
  const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  const dynamicImports = new Set();
  
  while ((match = dynamicImportRegex.exec(serverCode)) !== null) {
    dynamicImports.add(match[1]);
  }
  
  if (dynamicImports.size > 0) {
    console.log('\nDynamic imports found:');
    for (const importPath of dynamicImports) {
      console.log(`- ${importPath}`);
    }
  }
  
} catch (err) {
  console.error(`Error analyzing server.js: ${err.message}`);
}

console.log('\n=== Debug Complete ===');

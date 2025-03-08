import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=== Azure Module Debug ===');
console.log('Running in ES modules mode');

// Define packageJson at the top level so it's available throughout the script
let packageJson;

// Check package.json for type field
const packageJsonPath = path.join(rootDir, 'package.json');
try {
  packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  console.log(`Package name: ${packageJson.name}`);
  console.log(`Package type: ${packageJson.type || 'not set (default: commonjs)'}`);
  console.log(`Dependencies: ${Object.keys(packageJson.dependencies || {}).length}`);
  console.log(`Dev Dependencies: ${Object.keys(packageJson.devDependencies || {}).length}`);
  
  if (packageJson.type !== 'module') {
    console.log('WARNING: "type" is not "module" but code appears to use ES modules');
  }
} catch (err) {
  console.error(`Error reading package.json: ${err.message}`);
  process.exit(1);
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
  
  // Extract import statements
  const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  
  const imports = new Set();
  let match;
  
  // Find ES Module imports
  let importCount = 0;
  while ((match = importRegex.exec(serverCode)) !== null) {
    imports.add(match[1]);
    importCount++;
  }
  
  // Find CommonJS requires
  let requireCount = 0;
  while ((match = requireRegex.exec(serverCode)) !== null) {
    imports.add(match[1]);
    requireCount++;
  }
  
  console.log(`Found ${imports.size} total modules (${importCount} ESM imports, ${requireCount} CommonJS requires)`);
  
  if (importCount > 0 && requireCount > 0) {
    console.log('WARNING: Mixed use of import and require detected in server.js');
    console.log('This can cause problems in ES modules mode');
  }
  
  if (requireCount > 0 && importCount === 0 && packageJson.type === 'module') {
    console.log('CRITICAL ISSUE: Your code uses CommonJS require() but package.json has "type": "module"');
    console.log('This is likely causing your deployment failures on Azure');
  }
  
  // Check for package existence
  console.log('\nChecking for missing packages:');
  
  const dependencies = Object.keys(packageJson.dependencies || {});
  const devDependencies = Object.keys(packageJson.devDependencies || {});
  const allDependencies = [...dependencies, ...devDependencies];
  
  let missingDependencies = 0;
  
  for (const importPath of imports) {
    // Skip relative imports
    if (importPath.startsWith('./') || importPath.startsWith('../')) continue;
    
    // Extract the package name (e.g., @aws-sdk/client-s3 -> @aws-sdk/client-s3)
    const pkgName = importPath.split('/')[0].startsWith('@') 
      ? `${importPath.split('/')[0]}/${importPath.split('/')[1]}`
      : importPath.split('/')[0];
    
    if (!allDependencies.includes(pkgName)) {
      missingDependencies++;
      console.log(`⚠️ Module "${pkgName}" is required but not in package.json dependencies!`);
    }
  }
  
  if (missingDependencies === 0) {
    console.log('✅ All required packages are in package.json');
  }
  
} catch (err) {
  console.error(`Error analyzing server.js: ${err.message}`);
}

console.log('\n=== Debug Complete ===');

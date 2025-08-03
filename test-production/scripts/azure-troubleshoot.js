import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('Azure App Service Deployment Troubleshooting\n');

// Check if server.js exists in the root
if (fs.existsSync(path.join(rootDir, 'server.js'))) {
  console.log('✅ server.js found in project root');
} else {
  console.log('❌ ERROR: server.js not found in project root');
}

// Check web.config
if (fs.existsSync(path.join(rootDir, 'web.config'))) {
  console.log('✅ web.config found');
  const webConfig = fs.readFileSync(path.join(rootDir, 'web.config'), 'utf8');
  if (webConfig.includes('<add name="iisnode" path="server.js"')) {
    console.log('✅ web.config appears to have correct iisnode configuration');
  } else {
    console.log('❌ WARNING: web.config may have incorrect iisnode configuration');
  }
} else {
  console.log('❌ ERROR: web.config not found');
}

// Check .deployment file
if (fs.existsSync(path.join(rootDir, '.deployment'))) {
  console.log('✅ .deployment file found');
} else {
  console.log('❌ WARNING: .deployment file not found');
}

// Check nested applications
const chatboxPath = path.join(rootDir, 'chatbox-app');
if (fs.existsSync(chatboxPath)) {
  console.log('⚠️ WARNING: Found nested application "chatbox-app"');
  console.log('   - Nested apps can cause deployment conflicts');
  console.log('   - Consider moving it out of the main project or excluding from deployment');
}

// Check package size when zipped
console.log('\nChecking potential deployment package size:');
try {
  // Count files that would be included
  let totalFiles = 0;
  let nodeModulesFiles = 0;
  
  function countFiles(dir, isNodeModule = false) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        if (file === 'node_modules') {
          countFiles(filePath, true);
        } else {
          countFiles(filePath, isNodeModule);
        }
      } else {
        totalFiles++;
        if (isNodeModule) nodeModulesFiles++;
      }
    }
  }
  
  countFiles(rootDir);
  
  console.log(`Total files in project: ${totalFiles}`);
  console.log(`Files in node_modules: ${nodeModulesFiles}`);
  console.log(`Files excluding node_modules: ${totalFiles - nodeModulesFiles}`);
  
  if (nodeModulesFiles > 10000) {
    console.log('\n❌ CRITICAL: Your node_modules directory is extremely large');
    console.log('   - This will cause deployment failures');
    console.log('   - Use azure-package.json with minimal dependencies');
    console.log('   - Let Azure install dependencies during deployment');
  }
  
} catch (err) {
  console.log(`Error analyzing files: ${err.message}`);
}

console.log('\nRecommended Azure deployment method:');
console.log('1. Run: ./deploy-azure.sh');
console.log('2. Deploy the zip file using Azure CLI or Portal');
console.log('3. Check logs using: az webapp log tail --name arzani --resource-group my-marketplace');

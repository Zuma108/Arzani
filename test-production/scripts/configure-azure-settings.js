import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Load .env file if it exists
const envPath = path.join(rootDir, '.env');
let envConfig = {};

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^['"]|['"]$/g, '');
      if (key && value) {
        envConfig[key] = value;
      }
    }
  });
}

// Required environment variables for the app
const requiredVars = [
  'NODE_ENV',
  'PORT',
  'DATABASE_URL',
  'SESSION_SECRET',
  'JWT_SECRET',
  'STORAGE_TYPE' // e.g., 'azure-blob', 'aws-s3', 'local'
];

console.log('Azure App Service Configuration Helper');
console.log('=====================================');

// Check for missing required variables
const missingVars = requiredVars.filter(v => !envConfig[v]);
if (missingVars.length > 0) {
  console.log('❌ WARNING: The following required environment variables are missing:');
  missingVars.forEach(v => console.log(`   - ${v}`));
  console.log('\nYou will need to set these in Azure App Service Configuration.');
} else {
  console.log('✅ All required environment variables found in .env file');
}

// Generate Azure CLI commands to set app settings
console.log('\nAzure CLI commands to set app settings:');
console.log('\naz webapp config appsettings set --resource-group my-marketplace --name arzani \\');

const settingsArray = [];
for (const [key, value] of Object.entries(envConfig)) {
  // Skip comments and empty lines
  if (key.startsWith('#') || !key.trim()) continue;
  
  // Escape quotes in values
  const escapedValue = value.replace(/"/g, '\\"');
  settingsArray.push(`--settings "${key}=${escapedValue}"`);
}

// Add Azure-specific settings
settingsArray.push('--settings "WEBSITE_NODE_DEFAULT_VERSION=~18.19.0"');
settingsArray.push('--settings "SCM_DO_BUILD_DURING_DEPLOYMENT=true"');

console.log(settingsArray.join(' \\\n'));

console.log('\nRun these commands to configure your Azure App Service.');

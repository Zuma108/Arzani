#!/usr/bin/env node

/**
 * Check Environment Variables Script
 * 
 * This script verifies that all required environment variables are present
 * for production deployment without requiring a .env.production file.
 * Environment variables should be set via GitHub Secrets and Cloud Run.
 */

const requiredEnvVars = [
  'NODE_ENV',
  'PORT',
  'DATABASE_URL',
  'JWT_SECRET',
  'STRIPE_SECRET_KEY',
  'OPENAI_API_KEY'
];

const optionalEnvVars = [
  'A2A_AUTH_ENABLED',
  'DATABASE_SSL',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'SENDGRID_API_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET'
];

console.log('🔍 Checking environment variables...\n');

let missingRequired = [];
let presentOptional = [];
let missingOptional = [];

// Check required variables
requiredEnvVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`✅ ${varName}: Present`);
  } else {
    console.log(`❌ ${varName}: Missing (REQUIRED)`);
    missingRequired.push(varName);
  }
});

console.log('\n📋 Optional environment variables:');

// Check optional variables
optionalEnvVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`✅ ${varName}: Present`);
    presentOptional.push(varName);
  } else {
    console.log(`⚠️  ${varName}: Missing (optional)`);
    missingOptional.push(varName);
  }
});

console.log('\n📊 Summary:');
console.log(`✅ Required variables present: ${requiredEnvVars.length - missingRequired.length}/${requiredEnvVars.length}`);
console.log(`✅ Optional variables present: ${presentOptional.length}/${optionalEnvVars.length}`);

if (missingRequired.length > 0) {
  console.log('\n❌ Missing required environment variables:');
  missingRequired.forEach(varName => {
    console.log(`   - ${varName}`);
  });
  console.log('\n📝 Set these variables in:');
  console.log('   • GitHub Secrets (for CI/CD)');
  console.log('   • Cloud Run environment variables');
  console.log('   • Local .env file (for development)');
  process.exit(1);
} else {
  console.log('\n🎉 All required environment variables are present!');
  console.log('\n🔒 Security Note: Never commit .env.production to git!');
  console.log('   Use GitHub Secrets and Cloud Run environment variables instead.');
  process.exit(0);
}

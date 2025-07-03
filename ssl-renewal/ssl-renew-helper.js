// SSL Certificate Renewal Helper
// This script assists with SSL certificate renewal for the Arzani Marketplace
// Usage: node ssl-renew-helper.js

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { exit } = require('process');

const CONFIG = {
  domain: 'arzani.co.uk',
  apiKey: '', // Your SSL provider API key
  certificatePath: './certificates',
  notifyEmail: 'admin@arzani.co.uk',
  checkFrequency: 7, // days
  renewBeforeExpiry: 30, // days
  logPath: './ssl-logs'
};

// Ensure log directory exists
if (!fs.existsSync(CONFIG.logPath)) {
  fs.mkdirSync(CONFIG.logPath, { recursive: true });
}

const logFile = path.join(CONFIG.logPath, 'ssl-renewal.log');

// Logging function
function log(level, message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(logFile, logMessage + '\n');
}

// Check certificate expiration
async function checkCertificateExpiration() {
  try {
    log('INFO', `Checking SSL certificate for ${CONFIG.domain}...`);
    
    // Using an external service to check certificate
    const response = await axios.get(`https://api.ssllabs.com/api/v3/analyze`, {
      params: {
        host: CONFIG.domain,
        publish: 'off',
        startNew: 'on',
        all: 'done'
      }
    });
    
    if (response.status !== 200) {
      throw new Error(`Failed to check certificate: ${response.statusText}`);
    }
    
    // Extract expiration date
    const result = response.data;
    if (!result.endpoints || result.endpoints.length === 0) {
      throw new Error('No endpoint information available');
    }
    
    const certInfo = result.endpoints[0].details.cert;
    const expiryDate = new Date(certInfo.notAfter);
    const now = new Date();
    
    // Calculate days until expiry
    const daysUntilExpiry = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));
    
    log('INFO', `Certificate expires in ${daysUntilExpiry} days (${expiryDate.toISOString()})`);
    
    if (daysUntilExpiry <= CONFIG.renewBeforeExpiry) {
      log('WARNING', `Certificate expires in less than ${CONFIG.renewBeforeExpiry} days! Renewal required.`);
      return true; // Renewal needed
    }
    
    return false; // No renewal needed
  } catch (error) {
    log('ERROR', `Failed to check certificate: ${error.message}`);
    return true; // Assume renewal needed on error
  }
}

// Send notification
function sendNotification(subject, message) {
  if (!CONFIG.notifyEmail) return;
  
  log('INFO', `Sending notification: ${subject}`);
  // Implementation depends on your preferred notification method
  // Could use sendgrid, nodemailer, or other services
}

// Main function
async function main() {
  log('INFO', '=== SSL Certificate Renewal Check Started ===');
  
  try {
    const renewalNeeded = await checkCertificateExpiration();
    
    if (renewalNeeded) {
      log('INFO', 'Certificate renewal required. Please take action:');
      log('INFO', '1. Log in to your SSL provider dashboard');
      log('INFO', `2. Renew the certificate for ${CONFIG.domain}`);
      log('INFO', '3. Download the new certificate files');
      log('INFO', '4. Install them on your web server');
      
      sendNotification(
        `SSL Certificate Renewal Required for ${CONFIG.domain}`,
        `Your SSL certificate for ${CONFIG.domain} will expire soon. Please renew it immediately.`
      );
    } else {
      log('INFO', 'Certificate is still valid, no renewal needed at this time.');
    }
    
    log('INFO', '=== SSL Certificate Renewal Check Completed ===');
  } catch (error) {
    log('ERROR', `Renewal check failed: ${error.message}`);
    sendNotification(
      `SSL Check Failed for ${CONFIG.domain}`,
      `An error occurred while checking the SSL certificate: ${error.message}`
    );
  }
}

// Run the main function
main().catch(error => {
  log('FATAL', `Unhandled error: ${error.message}`);
  process.exit(1);
});

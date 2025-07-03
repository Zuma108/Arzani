/**
 * Development Mode Authentication Utilities
 * WARNING: Only use in development! Never include in production builds.
 */

import fs from 'fs';
import path from 'path';

class DevAuthManager {
  constructor() {
    this.envPath = path.join(process.cwd(), '.env');
  }

  /**
   * Check if development mode auth bypass is currently enabled
   */
  isAuthBypassEnabled() {
    return process.env.NODE_ENV === 'development' && 
           process.env.DEV_MODE_AUTH_BYPASS === 'true';
  }

  /**
   * Enable authentication bypass for development
   */
  enableAuthBypass() {
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('Auth bypass can only be enabled in development mode');
    }
    
    this.updateEnvVariable('DEV_MODE_AUTH_BYPASS', 'true');
    console.log('🔓 Development mode auth bypass ENABLED');
    console.log('⚠️  WARNING: Authentication is now bypassed for configured paths');
  }

  /**
   * Disable authentication bypass
   */
  disableAuthBypass() {
    this.updateEnvVariable('DEV_MODE_AUTH_BYPASS', 'false');
    console.log('🔒 Development mode auth bypass DISABLED');
    console.log('✅ Authentication is now required for all protected routes');
  }

  /**
   * Toggle authentication bypass
   */
  toggleAuthBypass() {
    const currentState = this.isAuthBypassEnabled();
    if (currentState) {
      this.disableAuthBypass();
    } else {
      this.enableAuthBypass();
    }
    return !currentState;
  }

  /**
   * Set which paths should bypass authentication
   */
  setBypassPaths(paths) {
    if (!Array.isArray(paths)) {
      throw new Error('Paths must be an array');
    }
    
    const pathString = paths.join(',');
    this.updateEnvVariable('BYPASS_AUTH_FOR_PATHS', pathString);
    console.log(`📁 Auth bypass paths updated: ${pathString}`);
  }

  /**
   * Set default user ID for bypassed requests
   */
  setDefaultUserId(userId) {
    this.updateEnvVariable('BYPASS_AUTH_DEFAULT_USER_ID', userId.toString());
    console.log(`👤 Default bypass user ID set to: ${userId}`);
  }

  /**
   * Get current bypass configuration
   */
  getBypassConfig() {
    return {
      enabled: this.isAuthBypassEnabled(),
      paths: process.env.BYPASS_AUTH_FOR_PATHS?.split(',') || [],
      defaultUserId: process.env.BYPASS_AUTH_DEFAULT_USER_ID || '1',
      nodeEnv: process.env.NODE_ENV
    };
  }

  /**
   * Update an environment variable in the .env file
   */
  updateEnvVariable(key, value) {
    try {
      let envContent = '';
      
      // Read existing .env file
      if (fs.existsSync(this.envPath)) {
        envContent = fs.readFileSync(this.envPath, 'utf8');
      }

      // Check if the key already exists
      const keyPattern = new RegExp(`^${key}=.*$`, 'm');
      const newLine = `${key}=${value}`;

      if (keyPattern.test(envContent)) {
        // Update existing key
        envContent = envContent.replace(keyPattern, newLine);
      } else {
        // Add new key
        envContent += `\n${newLine}`;
      }

      // Write back to file
      fs.writeFileSync(this.envPath, envContent);
      
      // Update process.env for immediate effect
      process.env[key] = value;
      
    } catch (error) {
      console.error('Error updating .env file:', error);
      throw error;
    }
  }

  /**
   * Print current status
   */
  printStatus() {
    const config = this.getBypassConfig();
    
    console.log('\n🛠️  Development Auth Bypass Status:');
    console.log('=====================================');
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`Bypass Enabled: ${config.enabled ? '✅ YES' : '❌ NO'}`);
    console.log(`Bypass Paths: ${config.paths.join(', ') || 'None'}`);
    console.log(`Default User ID: ${config.defaultUserId}`);
    
    if (config.enabled) {
      console.log('\n⚠️  WARNING: Authentication is currently bypassed!');
      console.log('   Make sure to disable before deploying to production.');
    }
    console.log('=====================================\n');
  }
}

// Create singleton instance
const devAuth = new DevAuthManager();

// Express middleware to add dev auth controls to request object
export const addDevAuthControls = (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    req.devAuth = devAuth;
  }
  next();
};

export default devAuth;

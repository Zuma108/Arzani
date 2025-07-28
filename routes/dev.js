/**
 * Development Authentication Control Routes
 * WARNING: Only available in development mode
 */

import express from 'express';
// REMOVED: import devAuth from '../utils/dev-auth.js'; - deleted as part of auth cleanup
// Create stub to prevent route errors
const devAuth = {
  getBypassConfig: () => ({ enabled: false, message: 'Dev auth disabled during cleanup' }),
  enableAuthBypass: () => console.log('Dev auth bypass disabled'),
  disableAuthBypass: () => console.log('Dev auth bypass disabled'),
  toggleAuthBypass: () => false,
  setBypassPaths: () => console.log('Dev auth paths disabled'),
  setDefaultUserId: () => console.log('Dev auth user ID disabled')
};

const router = express.Router();

// Middleware to ensure this is only available in development
router.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ 
      success: false, 
      message: 'Development tools not available in production' 
    });
  }
  next();
});

/**
 * GET /dev/auth-status
 * Get current authentication bypass status
 */
router.get('/auth-status', (req, res) => {
  try {
    const config = devAuth.getBypassConfig();
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error getting auth status',
      error: error.message
    });
  }
});

/**
 * POST /dev/auth-bypass/enable
 * Enable authentication bypass
 */
router.post('/auth-bypass/enable', (req, res) => {
  try {
    devAuth.enableAuthBypass();
    res.json({
      success: true,
      message: 'Authentication bypass enabled',
      data: devAuth.getBypassConfig()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error enabling auth bypass',
      error: error.message
    });
  }
});

/**
 * POST /dev/auth-bypass/disable
 * Disable authentication bypass
 */
router.post('/auth-bypass/disable', (req, res) => {
  try {
    devAuth.disableAuthBypass();
    res.json({
      success: true,
      message: 'Authentication bypass disabled',
      data: devAuth.getBypassConfig()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error disabling auth bypass',
      error: error.message
    });
  }
});

/**
 * POST /dev/auth-bypass/toggle
 * Toggle authentication bypass
 */
router.post('/auth-bypass/toggle', (req, res) => {
  try {
    const newState = devAuth.toggleAuthBypass();
    res.json({
      success: true,
      message: `Authentication bypass ${newState ? 'enabled' : 'disabled'}`,
      data: devAuth.getBypassConfig()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error toggling auth bypass',
      error: error.message
    });
  }
});

/**
 * POST /dev/auth-bypass/paths
 * Set bypass paths
 */
router.post('/auth-bypass/paths', (req, res) => {
  try {
    const { paths } = req.body;
    
    if (!Array.isArray(paths)) {
      return res.status(400).json({
        success: false,
        message: 'Paths must be an array'
      });
    }
    
    devAuth.setBypassPaths(paths);
    res.json({
      success: true,
      message: 'Bypass paths updated',
      data: devAuth.getBypassConfig()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error setting bypass paths',
      error: error.message
    });
  }
});

/**
 * POST /dev/auth-bypass/user-id
 * Set default user ID for bypassed requests
 */
router.post('/auth-bypass/user-id', (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    devAuth.setDefaultUserId(userId);
    res.json({
      success: true,
      message: 'Default user ID updated',
      data: devAuth.getBypassConfig()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error setting user ID',
      error: error.message
    });
  }
});

/**
 * GET /dev/auth-control-panel
 * Simple HTML interface for controlling auth bypass
 */
router.get('/auth-control-panel', (req, res) => {
  const config = devAuth.getBypassConfig();
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Development Auth Control Panel</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            max-width: 800px; 
            margin: 50px auto; 
            padding: 20px;
            background-color: #f5f5f5;
        }
        .panel { 
            background: white; 
            padding: 30px; 
            border-radius: 10px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .status { 
            padding: 15px; 
            border-radius: 5px; 
            margin: 20px 0; 
        }
        .enabled { 
            background-color: #ffeb3b; 
            border: 2px solid #ffc107; 
            color: #856404;
        }
        .disabled { 
            background-color: #d4edda; 
            border: 2px solid #28a745; 
            color: #155724;
        }
        button { 
            padding: 10px 20px; 
            margin: 5px; 
            border: none; 
            border-radius: 5px; 
            cursor: pointer; 
            font-size: 14px;
        }
        .btn-enable { background-color: #ffc107; color: #212529; }
        .btn-disable { background-color: #28a745; color: white; }
        .btn-toggle { background-color: #007bff; color: white; }
        .warning { 
            background-color: #f8d7da; 
            border: 1px solid #f5c6cb; 
            color: #721c24; 
            padding: 15px; 
            border-radius: 5px; 
            margin: 20px 0;
        }
        .info { 
            background-color: #d1ecf1; 
            border: 1px solid #bee5eb; 
            color: #0c5460; 
            padding: 15px; 
            border-radius: 5px; 
            margin: 10px 0;
        }
        .paths { 
            background-color: #f8f9fa; 
            padding: 10px; 
            border-radius: 5px; 
            border-left: 4px solid #007bff;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="panel">
        <h1>🛠️ Development Auth Control Panel</h1>
        
        <div class="warning">
            <strong>⚠️ WARNING:</strong> This is a development tool only. Never use in production!
        </div>
        
        <div class="status ${config.enabled ? 'enabled' : 'disabled'}">
            <h3>Current Status: ${config.enabled ? '🔓 BYPASS ENABLED' : '🔒 BYPASS DISABLED'}</h3>
            <p>Environment: <strong>${config.nodeEnv}</strong></p>
            <p>Default User ID: <strong>${config.defaultUserId}</strong></p>
        </div>
        
        <div class="paths">
            <h4>📁 Bypass Paths:</h4>
            <p>${config.paths.length ? config.paths.join(', ') : 'None configured'}</p>
        </div>
        
        <div style="margin: 30px 0;">
            <h3>🎮 Controls</h3>
            <button class="btn-enable" onclick="enableBypass()">Enable Bypass</button>
            <button class="btn-disable" onclick="disableBypass()">Disable Bypass</button>
            <button class="btn-toggle" onclick="toggleBypass()">Toggle Bypass</button>
            <button onclick="location.reload()" style="background-color: #6c757d; color: white;">Refresh Status</button>
        </div>
        
        <div class="info">
            <h4>📋 How to Use:</h4>
            <ul>
                <li><strong>Enable Bypass:</strong> Allows access to protected routes without authentication</li>
                <li><strong>Disable Bypass:</strong> Requires normal authentication for all routes</li>
                <li><strong>Toggle:</strong> Switches between enabled and disabled states</li>
                <li><strong>Configured Paths:</strong> Only these paths will bypass auth when enabled</li>
            </ul>
        </div>
        
        <div class="info">
            <h4>🔧 API Endpoints:</h4>
            <ul>
                <li><code>GET /dev/auth-status</code> - Get current status</li>
                <li><code>POST /dev/auth-bypass/enable</code> - Enable bypass</li>
                <li><code>POST /dev/auth-bypass/disable</code> - Disable bypass</li>
                <li><code>POST /dev/auth-bypass/toggle</code> - Toggle bypass</li>
            </ul>
        </div>
    </div>

    <script>
        async function apiCall(endpoint, method = 'GET') {
            try {
                const response = await fetch('/dev/' + endpoint, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                const data = await response.json();
                
                if (data.success) {
                    alert(data.message || 'Success!');
                    location.reload();
                } else {
                    alert('Error: ' + data.message);
                }
            } catch (error) {
                alert('Error: ' + error.message);
            }
        }
        
        function enableBypass() {
            apiCall('auth-bypass/enable', 'POST');
        }
        
        function disableBypass() {
            apiCall('auth-bypass/disable', 'POST');
        }
        
        function toggleBypass() {
            apiCall('auth-bypass/toggle', 'POST');
        }
    </script>
</body>
</html>`;
  
  res.send(html);
});

export default router;

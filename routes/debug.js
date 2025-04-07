import express from 'express';
const router = express.Router();

// Debug endpoint to test API access
router.get('/api/debug/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is accessible',
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint for valuation calculation
router.post('/api/debug/valuation', (req, res) => {
  console.log('Debug valuation request:', req.body);
  
  // Send back a mock response
  res.json({
    success: true,
    valuation: {
      estimatedValue: 250000,
      valuationRange: {
        min: 212500,
        max: 287500
      },
      confidence: 85,
      multiple: 2.5,
      multipleType: 'revenue',
      summary: 'This is a debug valuation response.',
      factors: {
        growth: {
          impact: 5,
          analysis: 'Growth analysis here'
        },
        industry: {
          impact: 3,
          analysis: 'Industry analysis here'
        },
        financial: {
          impact: 10,
          analysis: 'Financial analysis here'
        },
        assets: {
          impact: -2,
          analysis: 'Assets analysis here'
        }
      },
      marketComparables: {
        intro: 'Market comparable information',
        metrics: [
          {
            name: 'Revenue Multiple',
            yourValue: 2.5,
            industryAverage: 2.2,
            unit: 'x'
          }
        ]
      },
      recommendations: [
        'This is a test recommendation',
        'Another recommendation for debug purposes'
      ]
    }
  });
});

// This route will help diagnose auth and request issues
router.get('/auth-test', (req, res) => {
  // Collect debugging information
  const debugInfo = {
    path: req.path,
    method: req.method,
    headers: {
      authorization: req.headers.authorization ? 'Present (masked)' : 'Not present',
      'x-request-source': req.headers['x-request-source'],
      'x-skip-auth': req.headers['x-skip-auth'],
      'content-type': req.headers['content-type'],
      'accept': req.headers.accept
    },
    session: {
      exists: !!req.session,
      id: req.session?.id,
      hasUserId: !!req.session?.userId
    },
    user: req.user ? {
      exists: true,
      hasUserId: !!req.user.userId
    } : 'Not authenticated',
    cookies: Object.keys(req.cookies || {})
  };
  
  res.json({
    success: true,
    message: 'Auth test endpoint',
    debugInfo
  });
});

// Will serve a simple test page that makes an auth-required API call
router.get('/auth-test-page', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Auth Test Page</title>
      </head>
      <body>
        <h1>Authentication Test</h1>
        <button id="testApiBtn">Test API with Auth</button>
        <button id="testPublicBtn">Test Valuation API</button>
        <pre id="result" style="white-space: pre-wrap; background: #f0f0f0; padding: 10px; margin-top: 20px;"></pre>
        
        <script>
          document.getElementById('testApiBtn').addEventListener('click', async () => {
            try {
              const response = await fetch('/debug/auth-test', {
                headers: {
                  'Accept': 'application/json'
                }
              });
              
              const data = await response.json();
              document.getElementById('result').textContent = JSON.stringify(data, null, 2);
            } catch (error) {
              document.getElementById('result').textContent = 'Error: ' + error.message;
            }
          });
          
          document.getElementById('testPublicBtn').addEventListener('click', async () => {
            try {
              const response = await fetch('/api/business/calculate-valuation', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Request-Source': 'valuation-calculator',
                  'X-Skip-Auth': 'true'
                },
                body: JSON.stringify({
                  industry: 'Online & Technology',
                  revenue: 100000,
                  ebitda: 30000
                })
              });
              
              const data = await response.json();
              document.getElementById('result').textContent = JSON.stringify(data, null, 2);
            } catch (error) {
              document.getElementById('result').textContent = 'Error: ' + error.message;
            }
          });
        </script>
      </body>
    </html>
  `);
});

export default router;

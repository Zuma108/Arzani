/**
 * Frontend-only production test script
 * 
 * This script sets up a minimal Express server with just the frontend routes
 * to test your Tailwind CSS production build without requiring database connections.
 */

import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Set environment to production
process.env.NODE_ENV = 'production';
console.log('\x1b[32m%s\x1b[0m', '🚀 Running in PRODUCTION mode for FRONTEND TESTING ONLY');

// Set up basic Express app
const app = express();
const PORT = process.env.PORT || 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure session
app.use(session({
  secret: 'frontend-test-secret',
  resave: false,
  saveUninitialized: true
}));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', [path.join(__dirname, 'views'), path.join(__dirname, 'public')]);

// Serve static files
app.use(express.static('public'));
app.use(express.static(path.join(__dirname, 'public')));

// Add specific CSS mime types
app.use('/css', express.static(path.join(__dirname, 'public/css'), {
  setHeaders: (res, path) => {
    res.setHeader('Content-Type', 'text/css');
  }
}));

// Add pricing page route
app.get('/pricing', (req, res) => {
  res.render('pricing', {
    title: 'Pricing Plans - Arzani Marketplace',
    user: null
  });
});

// Add homepage route
app.get('/', (req, res) => {
  res.render('homepage', {
    title: 'Welcome to Our Marketplace'
  });
});

// Add redirect for main URL
app.get('/homepage', (req, res) => {
  res.render('homepage', {
    title: 'Welcome to Our Marketplace'
  });
});

// Add a route to check Tailwind CSS file
app.get('/check-tailwind', (req, res) => {
  const fs = require('fs');
  const tailwindPath = path.join(__dirname, 'public/css/tailwind.min.css');
  
  if (fs.existsSync(tailwindPath)) {
    const stats = fs.statSync(tailwindPath);
    res.json({
      exists: true,
      size: stats.size,
      modified: stats.mtime,
      content: fs.readFileSync(tailwindPath, 'utf8').substring(0, 200) + '...'
    });
  } else {
    res.json({
      exists: false,
      message: 'tailwind.min.css not found',
      searchPath: tailwindPath
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('\x1b[33m%s\x1b[0m', `⚠️ This is a FRONTEND-ONLY test. Database features will not work.`);
  console.log('\x1b[36m%s\x1b[0m', `Server running at http://localhost:${PORT}`);
  console.log('\x1b[36m%s\x1b[0m', `Visit http://localhost:${PORT}/pricing to test your styling`);
  console.log('\x1b[36m%s\x1b[0m', `Visit http://localhost:${PORT}/check-tailwind to verify Tailwind CSS file`);
});

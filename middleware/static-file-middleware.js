/**
 * Static File Middleware
 * Configures Express static middleware with proper caching settings
 */

const path = require('path');
const express = require('express');

/**
 * Configure static file middleware with optimized caching
 * @param {object} app - Express app instance
 */
function configureStaticMiddleware(app) {
  // Special handling for images with longer cache time
  app.use('/images', express.static(path.join(__dirname, '..', 'public', 'images'), {
    maxAge: '7d', // Cache for 7 days
    etag: true,
    lastModified: true,
    immutable: true // For resources that don't change
  }));
  
  // CSS with medium cache time
  app.use('/css', express.static(path.join(__dirname, '..', 'public', 'css'), {
    maxAge: '3d', // Cache for 3 days
    etag: true,
    lastModified: true
  }));
  
  // JavaScript with medium cache time
  app.use('/js', express.static(path.join(__dirname, '..', 'public', 'js'), {
    maxAge: '3d', // Cache for 3 days
    etag: true,
    lastModified: true
  }));
  
  // General static files with shorter cache time
  app.use(express.static(path.join(__dirname, '..', 'public'), {
    maxAge: '1d', // Cache for 1 day
    etag: true,
    lastModified: true
  }));
  
  // User uploads with no cache (always check for updates)
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), {
    maxAge: 0,
    etag: true,
    lastModified: true
  }));
  
  console.log('Static file middleware configured with optimized caching');
}

module.exports = configureStaticMiddleware;

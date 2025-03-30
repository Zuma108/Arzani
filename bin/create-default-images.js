/**
 * Script to create default profile images
 * This ensures all required default images exist
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the public images directory
const imagesDir = path.join(__dirname, '..', 'public', 'images');

// Default profile image content - a simple SVG placeholder
const defaultProfileSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <rect width="200" height="200" fill="#e5e7eb"/>
  <circle cx="100" cy="70" r="40" fill="#9ca3af"/>
  <circle cx="100" cy="220" r="100" fill="#9ca3af"/>
</svg>`;

// List of default profile images to create
const defaultImages = [
  'default-avatar.png',
  'default-profile.png',
  'default_profile5.png', // This was specifically missing in your error message
  'user-placeholder.png'
];

/**
 * Create a default image file
 */
function createDefaultImage(filename) {
  const filePath = path.join(imagesDir, filename);
  
  // Check if file already exists
  if (fs.existsSync(filePath)) {
    console.log(`Default image already exists: ${filename}`);
    return;
  }
  
  try {
    // Ensure directory exists
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }
    
    // Create an SVG version of the default image
    if (filename.endsWith('.svg')) {
      fs.writeFileSync(filePath, defaultProfileSvg);
      console.log(`Created SVG default image: ${filename}`);
      return;
    }
    
    // For PNG format, we'll use a data URI approach
    // This creates a simple gray silhouette image
    const canvas = require('canvas');
    const img = new canvas.Canvas(200, 200);
    const ctx = img.getContext('2d');
    
    // Draw background
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(0, 0, 200, 200);
    
    // Draw head
    ctx.fillStyle = '#9ca3af';
    ctx.beginPath();
    ctx.arc(100, 70, 40, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw body
    ctx.beginPath();
    ctx.arc(100, 220, 100, 0, Math.PI * 2);
    ctx.fill();
    
    // Save to file
    const buffer = img.toBuffer('image/png');
    fs.writeFileSync(filePath, buffer);
    
    console.log(`Created PNG default image: ${filename}`);
  } catch (error) {
    console.error(`Error creating default image ${filename}:`, error);
    
    // Fallback: create a simple colored square if canvas is not available
    try {
      // Create a basic fallback image (1x1 pixel PNG)
      const fallbackPixel = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
      );
      fs.writeFileSync(filePath, fallbackPixel);
      console.log(`Created fallback default image: ${filename}`);
    } catch (fallbackError) {
      console.error(`Failed to create fallback image:`, fallbackError);
    }
  }
}

/**
 * Main function to create all default images
 */
function createAllDefaultImages() {
  console.log('Creating default profile images...');
  
  // Create each default image
  defaultImages.forEach(createDefaultImage);
  
  console.log('Default profile images created successfully');
}

// Run the script
createAllDefaultImages();

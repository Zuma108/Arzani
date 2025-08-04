import express from 'express';
import axios from 'axios';
import { S3_REGIONS, DEFAULT_BUCKET } from '../utils/imageHandler.js';

const router = express.Router();

/**
 * Route for serving S3 images with automatic region fallback
 * Usage: /s3-image/:bucket/:region/:key
 * Or: /s3-image/:key (uses default bucket and tries all regions)
 */
router.get('/s3-image/:key(*)', async (req, res) => {
  const key = req.params.key;
  const bucket = req.query.bucket || DEFAULT_BUCKET;
  const preferredRegion = req.query.region || S3_REGIONS[0];
  
  // Determine which regions to try and in what order
  let regionsToTry = [...S3_REGIONS];
  
  // If user specified a preferred region, try that first
  if (preferredRegion && S3_REGIONS.includes(preferredRegion)) {
    regionsToTry = [
      preferredRegion,
      ...regionsToTry.filter(r => r !== preferredRegion)
    ];
  }
  
  // Try each region in sequence
  for (const region of regionsToTry) {
    try {
      const s3Url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
      
      // Try to fetch the image
      const response = await axios.get(s3Url, { 
        responseType: 'arraybuffer',
        timeout: 3000 // 3 second timeout
      });
      
      // If successful, set appropriate headers and send the image
      res.set('Content-Type', response.headers['content-type']);
      res.set('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
      return res.send(response.data);
      
    } catch (error) {
      console.log(`Failed to fetch image from ${region}:`, error.message);
      // Continue to next region
    }
  }
  
  // If all regions fail, return default image
  return res.redirect('/images/default-business.jpg');
});

export default router;

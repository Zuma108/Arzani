/**
 * Script to update sitemap.xml
 * Can be run via cron job or called directly from n8n workflow
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const SITE_URL = process.env.SITE_URL || 'https://www.arzani.co.uk';
const API_SECRET = process.env.SITEMAP_API_SECRET;

async function updateSitemap() {
  try {
    console.log('Requesting sitemap regeneration...');
    
    const endpoint = `${SITE_URL}/webhooks/n8n/update-sitemap`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_SECRET}`
      },
      body: JSON.stringify({
        source: 'script',
        timestamp: new Date().toISOString()
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Sitemap updated successfully!');
    } else {
      console.error('❌ Failed to update sitemap:', data.error);
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error updating sitemap:', error);
    throw error;
  }
}

// Execute directly if run as a standalone script
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  updateSitemap()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default updateSitemap;

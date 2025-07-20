/**
 * Regenerate Sitemap
 * 
 * This script regenerates the sitemap.xml file to include new programmatic SEO content.
 * Run this after creating new pillar or supporting content.
 */

import { generateXmlSitemap } from './routes/sitemap.js';

console.log('Regenerating sitemap with programmatic SEO URLs...');

generateXmlSitemap()
  .then(() => {
    console.log('Sitemap successfully regenerated!');
    console.log('The sitemap now includes programmatic SEO URLs.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error regenerating sitemap:', error);
    process.exit(1);
  });

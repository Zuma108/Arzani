import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Route for HTML sitemap
router.get('/sitemap', (req, res) => {
  res.render('sitemap');
});

// Serve the XML sitemap
router.get('/sitemap.xml', (req, res) => {
  res.header('Content-Type', 'application/xml');
  res.sendFile('sitemap.xml', { root: './public' });
});

export default router;

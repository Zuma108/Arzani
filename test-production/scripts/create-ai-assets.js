import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Ensure images directory exists
const imageDir = path.join(rootDir, 'public', 'images');
if (!fs.existsSync(imageDir)) {
  fs.mkdirSync(imageDir, { recursive: true });
  console.log(`Created images directory: ${imageDir}`);
}

// Create AI assistant image if it doesn't exist
const aiImagePath = path.join(imageDir, 'ai-assistant.png');
if (!fs.existsSync(aiImagePath)) {
  // Create a simple SVG as a placeholder
  const svgContent = `
    <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" fill="#000AA4" rx="8" />
      <text x="32" y="40" font-family="Arial" font-size="24" text-anchor="middle" fill="white">AI</text>
    </svg>
  `;
  
  fs.writeFileSync(aiImagePath, svgContent);
  console.log(`Created AI assistant image at: ${aiImagePath}`);
}

console.log('AI asset creation complete');

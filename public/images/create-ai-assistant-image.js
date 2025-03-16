/**
 * This script generates a placeholder AI assistant image if one doesn't exist
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const imageDir = path.join(__dirname);
const aiAssistantImagePath = path.join(imageDir, 'ai-assistant.png');

// Check if the directory exists, if not create it
if (!fs.existsSync(imageDir)) {
  fs.mkdirSync(imageDir, { recursive: true });
  console.log(`Created directory: ${imageDir}`);
}

// Check if the AI assistant image exists, if not create a placeholder
if (!fs.existsSync(aiAssistantImagePath)) {
  // Create a simple SVG as a placeholder
  // In a real scenario, you'd copy an actual image file here
  const svgContent = `
    <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" fill="#000AA4" rx="8" />
      <text x="32" y="40" font-family="Arial" font-size="24" text-anchor="middle" fill="white">AI</text>
    </svg>
  `;
  
  // Write the SVG to the file
  fs.writeFileSync(aiAssistantImagePath, svgContent);
  console.log(`Created placeholder AI assistant image at: ${aiAssistantImagePath}`);
}

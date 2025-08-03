import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Ensure AI Assistant image exists
function ensureAIAssistantImage() {
  const imageDir = path.join(rootDir, 'public', 'images');
  const aiAssistantImagePath = path.join(imageDir, 'ai-assistant.png');
  
  // Ensure directory exists
  if (!fs.existsSync(imageDir)) {
    fs.mkdirSync(imageDir, { recursive: true });
    console.log(`Created directory: ${imageDir}`);
  }
  
  // Check if image exists
  if (!fs.existsSync(aiAssistantImagePath)) {
    // Create a blank SVG image as a placeholder
    const svgData = `<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
      <rect width="128" height="128" fill="#000AA4" rx="16"/>
      <text x="64" y="80" font-family="Arial" font-size="48" text-anchor="middle" fill="white">AI</text>
    </svg>`;
    
    fs.writeFileSync(aiAssistantImagePath, svgData);
    console.log(`Created placeholder AI assistant image at: ${aiAssistantImagePath}`);
  } else {
    console.log(`AI assistant image already exists at: ${aiAssistantImagePath}`);
  }
}

// Ensure stylesheet exists
function ensureStylesheet() {
  const cssDir = path.join(rootDir, 'public', 'css');
  const aiStylePath = path.join(cssDir, 'ai-chatbot.css');
  
  if (!fs.existsSync(cssDir)) {
    fs.mkdirSync(cssDir, { recursive: true });
    console.log(`Created directory: ${cssDir}`);
  }
  
  // Only create if it doesn't exist, to avoid overwriting customizations
  if (!fs.existsSync(aiStylePath)) {
    // Copy from the template we already created
    const templatePath = path.join(rootDir, 'public', 'css', 'ai-chatbot.css');
    if (fs.existsSync(templatePath)) {
      fs.copyFileSync(templatePath, aiStylePath);
      console.log(`Copied AI assistant CSS from template to: ${aiStylePath}`);
    } else {
      console.log(`Template CSS not found at ${templatePath}, skipping`);
    }
  } else {
    console.log(`AI assistant CSS already exists at: ${aiStylePath}`);
  }
}

// Run the asset checks
ensureAIAssistantImage();
ensureStylesheet();

console.log('AI assistant asset check completed');

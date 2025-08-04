import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function resizeImage() {
    const inputPath = path.join(__dirname, 'public', 'figma design exports', 'images', 'pose 3 magnifying glass no background 2.PNG');
    const outputPath = path.join(__dirname, 'public', 'figma design exports', 'images', 'pose 3 magnifying glass no background 2-resized.PNG');
    
    try {
        // Resize to about 80x87 pixels (roughly 1/3 of original size)
        await sharp(inputPath)
            .resize(80, 87, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 } // transparent background
            })
            .png()
            .toFile(outputPath);
        
        console.log('Image resized successfully!');
        console.log(`Original: 242x264 pixels`);
        console.log(`Resized: 80x87 pixels`);
        console.log(`Output saved as: ${outputPath}`);
    } catch (error) {
        console.error('Error resizing image:', error);
        console.log('Installing sharp package...');
        // If sharp is not installed, show installation instructions
        console.log('Please run: npm install sharp');
    }
}

resizeImage();

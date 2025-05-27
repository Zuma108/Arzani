// This script converts a UTF-16-LE file to UTF-8
const fs = require('fs');
const path = require('path');

// File path to process
const filePath = path.join(__dirname, 'views', 'valuation-confirmation.ejs');
const outputPath = filePath + '.utf8';

try {
    console.log(`Reading file: ${filePath}`);
    
    // Read the file as binary
    const fileContent = fs.readFileSync(filePath, 'binary');
    
    // Remove UTF-16-LE encoding pattern (strip all null bytes)
    let utf8Content = '';
    for (let i = 0; i < fileContent.length; i++) {
        // Skip null bytes which are typical in UTF-16-LE
        if (fileContent.charCodeAt(i) !== 0) {
            utf8Content += fileContent.charAt(i);
        }
    }

    // Ensure the file starts correctly
    if (!utf8Content.trim().startsWith('<!DOCTYPE html>')) {
        utf8Content = '<!DOCTYPE html>\n' + utf8Content;
    }

    // Ensure the charset declaration is included
    if (!utf8Content.includes('<meta charset="UTF-8">')) {
        utf8Content = utf8Content.replace('<head>', '<head>\n    <meta charset="UTF-8">');
    }
    
    console.log(`Writing UTF-8 content to: ${outputPath}`);
    fs.writeFileSync(outputPath, utf8Content, 'utf8');
    
    console.log(`Conversion complete. Check ${outputPath} for the result.`);

    // Print the first few lines to check
    const previewLines = utf8Content.split('\n').slice(0, 10);
    console.log('\nPreview of converted content:');
    previewLines.forEach(line => console.log(line));
    console.log('...');
    
} catch (error) {
    console.error(`Error during conversion: ${error.message}`);
}

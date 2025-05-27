import fs from 'fs';

const filePath = './views/valuation-confirmation.ejs';

// Read the file with explicit encoding
fs.readFile(filePath, { encoding: 'utf8' }, (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }
  
  // Check for BOM
  const hasBOM = data.charCodeAt(0) === 0xFEFF;
  console.log('File has BOM:', hasBOM);
  
  // Check for suspicious characters
  const suspicious = [];
  for (let i = 0; i < data.length; i++) {
    const code = data.charCodeAt(i);
    // Check for unusual control characters or non-UTF8 compatible codes
    if ((code < 32 && ![9, 10, 13].includes(code)) || (code >= 0xD800 && code <= 0xDFFF)) {
      suspicious.push({
        position: i,
        character: data[i],
        charCode: code,
        context: data.substring(Math.max(0, i - 10), Math.min(data.length, i + 10))
      });
    }
  }
  
  if (suspicious.length > 0) {
    console.log('Found suspicious characters:');
    console.log(suspicious);
  } else {
    console.log('No suspicious characters found.');
  }
  
  // Write a clean version with explicit UTF-8 encoding
  fs.writeFile(filePath + '.clean', data.replace(/^\uFEFF/, ''), 'utf8', (err) => {
    if (err) {
      console.error('Error writing clean file:', err);
      return;
    }
    console.log('Clean file written to', filePath + '.clean');
  });
});

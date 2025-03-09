import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Module Diagnostics Tool');
console.log('======================');
console.log('Node.js version:', process.version);
console.log('Current directory:', process.cwd());
console.log('NODE_OPTIONS:', process.env.NODE_OPTIONS || '(none)');

// Check package.json
try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    console.log('Package type:', packageJson.type || 'commonjs (default)');
    console.log('Dependencies count:', Object.keys(packageJson.dependencies || {}).length);
    console.log('Dev dependencies count:', Object.keys(packageJson.devDependencies || {}).length);
} catch (err) {
    console.error('Error reading package.json:', err.message);
}

// Parse imports from server.js
try {
    const serverCode = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
    const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
    
    const imports = new Set();
    let match;
    
    while ((match = importRegex.exec(serverCode)) !== null) {
        imports.add(match[1]);
    }
    
    console.log('\nImports found in server.js:', imports.size);
    
    // Try to resolve each import
    for (const importPath of imports) {
        try {
            if (importPath.startsWith('.')) {
                // For local files, we need to check if the file exists
                const localPath = path.join(__dirname, importPath);
                const extensions = ['.js', '.mjs', '.cjs', '.json'];
                let found = false;
                
                for (const ext of extensions) {
                    const fullPath = localPath + ext;
                    if (fs.existsSync(fullPath)) {
                        console.log(`✓ Local module resolved: ${importPath} -> ${fullPath}`);
                        found = true;
                        break;
                    }
                }
                
                if (!found) {
                    console.log(`✗ Failed to resolve local module: ${importPath}`);
                    console.log(`  Searched in: ${localPath}`);
                }
            } else {
                // For npm packages
                try {
                    const resolved = await import(importPath);
                    console.log(`✓ Package resolved: ${importPath}`);
                } catch (err) {
                    console.log(`✗ Failed to resolve package: ${importPath}`);
                    console.log(`  Error: ${err.message}`);
                }
            }
        } catch (err) {
            console.log(`✗ Error resolving: ${importPath}`);
            console.log(`  Error: ${err.message}`);
        }
    }
} catch (err) {
    console.error('Error analyzing server.js:', err.message);
}

console.log('\nDiagnostics complete');

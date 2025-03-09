import dotenv from 'dotenv';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Enhanced error handling for module resolution
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:');
    console.error(err.stack || err);
    if (err.code === 'ERR_MODULE_NOT_FOUND') {
        console.error('MODULE NOT FOUND ERROR DETAILS:');
        console.error('- Error Code:', err.code);
        const missingModule = err.message.match(/'([^']+)'/)?.[1] || 'unknown';
        console.error('- Missing Module:', missingModule);
        console.error('- Node.js Version:', process.version);
        console.error('- Current Directory:', process.cwd());
        
        try {
            console.error('Attempting to install the missing module:', missingModule);
            execSync(`npm install ${missingModule}`, { stdio: 'inherit' });
            console.error(`Successfully installed ${missingModule, retrying...`);
            
            // If it was express that was missing, try to restart the process
            if (missingModule === 'express') {
                console.error('Installed express package. Restarting application...');
                require('./server.js'); // Try loading with require as fallback
            }
        } catch (installErr) {
            console.error(`Failed to automatically install ${missingModule}:`, installErr.message);
            
            try {
                // Check if package.json exists and contains the missing dependency
                const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
                console.error('- Package.json type:', packageJson.type || 'commonjs (default)');
                console.error('- Dependencies:', JSON.stringify(packageJson.dependencies, null, 2));
                
                // Check if the missing module is in package.json but not installed
                if (packageJson.dependencies && packageJson.dependencies[missingModule]) {
                    console.error(`${missingModule} is in package.json but not installed. Trying 'npm install'...`);
                    try {
                        execSync('npm install', { stdio: 'inherit' });
                        console.error('Successfully installed all dependencies, retrying...');
                        // Try to restart the server
                        import('./server.js').catch(e => {
                            console.error('Still failed after installing dependencies:', e);
                        });
                    } catch (npmErr) {
                        console.error('Failed to run npm install:', npmErr.message);
                    }
                }
            } catch (packageErr) {
                console.error('- Could not read package.json:', packageErr.message);
            }
        }
    }
});

// Check Node.js options
console.log('Starting server with the following configuration:');
console.log('- NODE_OPTIONS:', process.env.NODE_OPTIONS || '(not set)');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('- PORT:', process.env.PORT || '5000');

// Check for dependencies
console.log('Checking for essential dependencies...');
try {
    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    const deps = Object.keys(packageJson.dependencies || {});
    console.log(`Found ${deps.length} dependencies in package.json`);
    
    // Check if node_modules exists
    if (!fs.existsSync('./node_modules')) {
        console.log('node_modules directory not found. Installing dependencies...');
        try {
            execSync('npm install', { stdio: 'inherit' });
            console.log('Successfully installed dependencies');
        } catch (err) {
            console.error('Failed to install dependencies:', err.message);
        }
    } else {
        console.log('node_modules directory exists');
        
        // Check if express exists (since that was the missing module in the logs)
        if (!fs.existsSync('./node_modules/express')) {
            console.log('Express module not found in node_modules. Installing express...');
            try {
                execSync('npm install express', { stdio: 'inherit' });
                console.log('Successfully installed express');
            } catch (err) {
                console.error('Failed to install express:', err.message);
            }
        }
    }
} catch (err) {
    console.error('Error checking dependencies:', err);
}

// Import your actual server file
const port = process.env.PORT || 5000;

console.log(`Attempting to start server on port ${port}...`);

// Import your actual server file with proper error handling
try {
    import('./server.js').then((server) => {
        console.log(`Server imported successfully, listening on port ${port}`);
        // If server.js exports a default function or object
        if (server.default && typeof server.default.listen === 'function') {
            server.default.listen(port, () => {
                console.log(`Server running on port ${port}`);
                console.log(`Environment: ${process.env.NODE_ENV}`);
            });
        } else {
            console.log('Server module imported but does not export a default listen method');
        }
    }).catch((err) => {
        console.error('Failed to import server:', err);
        // Try CommonJS as fallback
        try {
            console.log('Attempting to load server using CommonJS require as fallback...');
            const server = require('./server.js');
            if (server && typeof server.listen === 'function') {
                server.listen(port, () => {
                    console.log(`Server started with CommonJS on port ${port}`);
                });
            } else {
                console.error('Server loaded but no listen method found');
            }
        } catch (requireErr) {
            console.error('Also failed with CommonJS require:', requireErr);
        }
    });
} catch (err) {
    console.error('Critical error importing server:', err);
}

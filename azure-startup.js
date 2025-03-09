import dotenv from 'dotenv';
dotenv.config();

// Enhanced error handling for module resolution
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:');
    console.error(err.stack || err);
    if (err.code === 'ERR_MODULE_NOT_FOUND') {
        console.error('MODULE NOT FOUND ERROR DETAILS:');
        console.error('- Error Code:', err.code);
        console.error('- Missing Module:', err.message.match(/'([^']+)'/)?.[1] || 'unknown');
        console.error('- Node.js Version:', process.version);
        console.error('- Current Directory:', process.cwd());
        
        try {
            const fs = require('fs');
            const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
            console.error('- Package.json type:', packageJson.type || 'commonjs (default)');
            console.error('- Dependencies:', JSON.stringify(packageJson.dependencies, null, 2));
        } catch (packageErr) {
            console.error('- Could not read package.json:', packageErr.message);
        }
    }
});

// Check Node.js options
console.log('NODE_OPTIONS:', process.env.NODE_OPTIONS);
console.log('Starting server with ES modules support');

// Import your actual server file
const port = process.env.PORT || 5000;

// Import your actual server file with proper error handling
try {
    import('./server.js').then((server) => {
        console.log(`Server imported successfully, listening on port ${port}`);
        // If server.js exports a default function or object
        if (server.default && typeof server.default.listen === 'function') {
            server.default.listen(port, () => {
                console.log(`Server running on port ${port}`);
            });
        }
    }).catch((err) => {
        console.error('Failed to start server:', err);
    });
} catch (err) {
    console.error('Critical error importing server:', err);
}

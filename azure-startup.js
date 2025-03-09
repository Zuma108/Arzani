import dotenv from 'dotenv';
dotenv.config();

// Check if we're running on Azure (which uses PORT env var)
const port = process.env.PORT || 5000;

// Import your actual server file
import('./server.js').then((server) => {
  server.default.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

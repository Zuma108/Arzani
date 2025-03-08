. Mount the Profile Router Only Once (and Early)
Choose a single place in your server.js to mount your profile routes. For example, you can add the following line after all middleware is set up but before any catch-all routes:

js
Copy
// Mount the profile routes (this applies authenticateToken to all routes in profileRoutes)
app.use('/api/profile', authenticateToken, profileRoutes);
Then remove any duplicate registrations (for example, any other app.use('/api/profile', ...) or inline app.get('/api/profile', ...) definitions).

3. Ensure the Order of Registration is Correct
Express uses the order of route registration. If you register a catch-all 404 handler (or any middleware that returns 404) before your profile routes, the /api/profile requests will never reach your router.
Make sure that your profile router is mounted before any catch-all routes. For example, if you have a fallback like this:

js
Copy
// Fallback for unhandled API routes (returns 404)
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});
then your app.use('/api/profile', ...) must be placed before this fallback.

4. Example of a Cleaned-up Section in Your server.js
Below is an example snippet that shows how to adjust your route registrations. (You’ll need to remove or comment out the duplicate inline profile routes elsewhere in your file.)

js
Copy
// ----- Other middleware and route registrations above -----

// Mount your profile routes once (with token authentication)
// Make sure this is placed before any catch-all /api routes.
app.use('/api/profile', authenticateToken, profileRoutes);

// (Remove any inline definitions such as:)
// app.get('/api/profile', authenticateToken, async (req, res) => { ... });

// (Also remove any duplicate mounting like:)
// app.use('/api/profile', profileRoutes);

// ... Other route registrations ...

// Catch-all API fallback (should come after all valid API routes)
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// ... Your catch-all for non-API routes, etc.
5. Verify the profileRoutes File
Your profileRoutes.js should already define routes like:

js
Copy
// routes/profileRoutes.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken } from '../middleware/auth.js';
import pool from '../db.js';

const router = express.Router();

// GET profile data (accessed as GET /api/profile)
router.get('/', authenticateToken, async (req, res) => {
  // Your logic here...
});

// GET subscription (accessed as GET /api/profile/subscription)
router.get('/subscription', authenticateToken, async (req, res) => {
  // Your logic here...
});

// (Other profile-related routes, e.g., PUT for updating profile, POST for picture upload, etc.)

export default router;
Make sure this file is correct and that its endpoints match what your client expects.
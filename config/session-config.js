/**
 * Configure session storage based on environment
 */
import session from 'express-session';

export function configureSessionStore(app, env = process.env.NODE_ENV) {
  console.log(`Configuring session store for ${env} environment...`);
  
  const sessionOptions = {
    secret: process.env.SESSION_SECRET || 'marketplace-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: env === 'production',
      maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
  };
  
  // Use a production-suitable store in production environment
  if (env === 'production') {
    try {
      // Try to use PostgreSQL session store if available
      const pgSession = require('connect-pg-simple')(session);
      sessionOptions.store = new pgSession({
        conString: process.env.DATABASE_URL,
        tableName: 'user_sessions',
        createTableIfMissing: true
      });
      console.log('Using PostgreSQL session store');
    } catch (error) {
      console.warn('PostgreSQL session store not available, falling back to MemoryStore:', error.message);
      console.warn('This is not recommended for production. Install connect-pg-simple package.');
      // Fall back to MemoryStore (not recommended for production)
    }
  }
  
  // Apply session middleware
  app.use(session(sessionOptions));
  console.log('Session configuration complete');
}

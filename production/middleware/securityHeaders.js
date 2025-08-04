/**
 * Security headers middleware
 * Adds recommended security headers to HTTP responses
 */

/**
 * Middleware to add security headers to all responses
 * @param {Object} options - Configuration options
 * @returns {Function} Express middleware
 */
export function securityHeaders(options = {}) {
  const defaultOptions = {
    // Content Security Policy
    enableCSP: true,
    // HTTP Strict Transport Security (max-age: 1 year in seconds)
    enableHSTS: process.env.NODE_ENV === 'production',
    hstsMaxAge: 31536000,
    // X-Content-Type-Options
    enableNoSniff: true,
    // X-Frame-Options
    enableFrameGuard: true,
    frameGuardAction: 'SAMEORIGIN', // 'DENY', 'SAMEORIGIN', 'ALLOW-FROM uri'
    // X-XSS-Protection
    enableXSSFilter: true,
    // Referrer-Policy
    enableReferrerPolicy: true,
    referrerPolicy: 'strict-origin-when-cross-origin',
    // Permissions-Policy (replaces Feature-Policy)
    enablePermissionsPolicy: true,
    // Cache-Control for non-asset responses
    enableCacheControl: true,
    // Report-To and NEL (Network Error Logging)
    enableReportTo: process.env.NODE_ENV === 'production' && !!options.reportToEndpoint,
    reportToEndpoint: options.reportToEndpoint,
  };

  const settings = { ...defaultOptions, ...options };

  // Construct Content Security Policy
  const constructCSP = () => {
    // Default CSP is fairly strict
    const defaultCSP = {
      'default-src': ["'self'"],
      'script-src': ["'self'", 'https://js.stripe.com', 'https://www.google-analytics.com'],
      'style-src': ["'self'", 'https://fonts.googleapis.com', "'unsafe-inline'"],
      'img-src': ["'self'", 'data:', 'https://www.google-analytics.com', 'https:'],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'connect-src': ["'self'", 'https://api.stripe.com', 'https://www.google-analytics.com'],
      'frame-src': ["'self'", 'https://js.stripe.com', 'https://hooks.stripe.com'],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'self'"],
      'upgrade-insecure-requests': [],
    };

    // Merge with user-provided directives
    const cspDirectives = { ...defaultCSP, ...(settings.csp || {}) };

    // Convert directive object to CSP string
    return Object.entries(cspDirectives)
      .map(([key, values]) => {
        if (values.length === 0) return key;
        return `${key} ${values.join(' ')}`;
      })
      .join('; ');
  };

  return (req, res, next) => {
    // Skip for static assets to improve performance
    if (req.path.match(/\.(css|js|jpg|png|gif|svg|ico|woff|woff2)$/i)) {
      // Still apply basic security headers to static assets
      if (settings.enableNoSniff) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
      }
      return next();
    }

    // Content-Security-Policy
    if (settings.enableCSP) {
      res.setHeader('Content-Security-Policy', constructCSP());
    }

    // HTTP Strict Transport Security
    if (settings.enableHSTS) {
      res.setHeader(
        'Strict-Transport-Security',
        `max-age=${settings.hstsMaxAge}; includeSubDomains; preload`
      );
    }

    // X-Content-Type-Options
    if (settings.enableNoSniff) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }

    // X-Frame-Options
    if (settings.enableFrameGuard) {
      res.setHeader('X-Frame-Options', settings.frameGuardAction);
    }

    // X-XSS-Protection
    if (settings.enableXSSFilter) {
      res.setHeader('X-XSS-Protection', '1; mode=block');
    }

    // Referrer-Policy
    if (settings.enableReferrerPolicy) {
      res.setHeader('Referrer-Policy', settings.referrerPolicy);
    }

    // Permissions-Policy
    if (settings.enablePermissionsPolicy) {
      res.setHeader(
        'Permissions-Policy',
        'camera=(), microphone=(), geolocation=(self), interest-cohort=()'
      );
    }

    // Cache-Control
    if (settings.enableCacheControl) {
      // Set no-cache for non-asset responses to prevent sensitive data caching
      res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }

    // Report-To and NEL
    if (settings.enableReportTo && settings.reportToEndpoint) {
      const reportToHeader = JSON.stringify({
        group: 'default',
        max_age: 31536000,
        endpoints: [{ url: settings.reportToEndpoint }],
      });
      res.setHeader('Report-To', reportToHeader);
      res.setHeader('NEL', JSON.stringify({ report_to: 'default', max_age: 31536000 }));
    }

    next();
  };
}

/**
 * Configure security headers for Express app
 * @param {Object} app - Express app instance
 * @param {Object} options - Configuration options
 */
export function configureSecurityHeaders(app, options = {}) {
  // Apply security headers middleware
  app.use(securityHeaders(options));
}

export default {
  securityHeaders,
  configureSecurityHeaders
};
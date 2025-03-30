/**
 * Environment utility functions for handling redirects and URLs
 * This can be included on all pages that need environment-aware behavior
 */

// Determine if we're in production or development
function isProduction() {
  const environmentMeta = document.querySelector('meta[name="site-environment"]');
  return environmentMeta && environmentMeta.content === 'production';
}

// Get the production domain from meta tag
function getProductionDomain() {
  const productionDomainMeta = document.querySelector('meta[name="production-domain"]');
  return productionDomainMeta ? productionDomainMeta.content : 'www.arzani.co.uk';
}

// Get appropriate base URL based on environment
function getBaseUrl() {
  if (isProduction()) {
    return 'https://' + getProductionDomain();
  }
  return ''; // In development, use relative URLs
}

// Fix all links to proper URLs based on environment
function fixAllLinks() {
  if (!isProduction()) return; // Only needed in production
  
  // Process login, signup, and marketplace links
  const links = document.querySelectorAll('a[href^="/"]');
  
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (!href.includes('://')) { // Only fix relative links
      link.setAttribute('href', getBaseUrl() + href);
    }
  });
  
  // Fix form action URLs
  const forms = document.querySelectorAll('form[action^="/"]');
  forms.forEach(form => {
    const action = form.getAttribute('action');
    if (!action.includes('://')) {
      form.setAttribute('action', getBaseUrl() + action);
    }
  });
}

// Utility for redirecting with proper domain
function redirectTo(path) {
  window.location.href = getBaseUrl() + path;
}

// Runs when the script loads
document.addEventListener('DOMContentLoaded', function() {
  // Fix all links when page loads if needed
  fixAllLinks();
  
  // Log environment for debugging
  console.log('Environment:', isProduction() ? 'Production' : 'Development');
  if (isProduction()) {
    console.log('Production domain:', getProductionDomain());
  }
});

// Export functions for use in other scripts
window.envUtils = {
  isProduction,
  getBaseUrl,
  redirectTo,
  fixAllLinks
};

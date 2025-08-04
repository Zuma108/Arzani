/**
 * Stripe integration helper functions for the frontend
 */

// Initialize Stripe with the publishable key
function initStripe(publishableKey) {
  if (!publishableKey) {
    console.error('Stripe publishable key is missing');
    return null;
  }
  
  return Stripe(publishableKey);
}

// Create a checkout session for subscription
async function createSubscriptionCheckout(planType, token) {
  try {
    if (!planType || !['gold', 'platinum'].includes(planType)) {
      throw new Error('Invalid plan type');
    }
    
    if (!token) {
      throw new Error('Authentication token is required');
    }
    
    const response = await fetch('/stripe/create-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ planType })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || errorData.error || 'Failed to create checkout session');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Subscription checkout error:', error);
    throw error;
  }
}

// Create a portal session for managing subscription
async function createPortalSession(token) {
  try {
    if (!token) {
      throw new Error('Authentication token is required');
    }
    
    const response = await fetch('/stripe/create-portal-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || errorData.error || 'Failed to create portal session');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Portal session error:', error);
    throw error;
  }
}

// Get user subscription details
async function getUserSubscription(token) {
  try {
    if (!token) {
      throw new Error('Authentication token is required');
    }
    
    const response = await fetch('/stripe/subscription', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || errorData.error || 'Failed to get subscription');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Get subscription error:', error);
    throw error;
  }
}

// Handle UI elements for loading states
function setLoadingState(button, isLoading, loadingText = 'Processing...', defaultText = 'Subscribe') {
  if (isLoading) {
    button.disabled = true;
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText;
  } else {
    button.disabled = false;
    button.textContent = button.dataset.originalText || defaultText;
  }
}

// Format price with currency
function formatPrice(amount, currency = 'GBP') {
  const formatter = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
  });
  
  return formatter.format(amount);
}

// Export all functions for use in other scripts
window.stripeHelpers = {
  initStripe,
  createSubscriptionCheckout,
  createPortalSession,
  getUserSubscription,
  setLoadingState,
  formatPrice
};

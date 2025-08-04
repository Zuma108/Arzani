/**
 * Subscription Manager
 * Handles Stripe checkout and subscription management
 */
class SubscriptionManager {
  /**
   * Initialize the subscription manager
   * @param {string} stripeKey - Stripe publishable key
   */
  constructor(stripeKey) {
    this.stripe = Stripe(stripeKey, { betas: ['custom_checkout_beta_5'] });
    this.checkout = null;
    this.subscriptionId = null;
    this.paymentElement = null;
    
    // Define the appearance customization based on Stripe's Elements Appearance API
    this.appearance = {
      theme: 'stripe',
      variables: {
        colorPrimary: '#3b82f6',
        colorBackground: '#ffffff',
        colorText: '#1f2937',
        colorDanger: '#ef4444',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSizeBase: '16px',
        spacingUnit: '4px',
        borderRadius: '6px',
        // Additional variables
        colorTextSecondary: '#64748b',
        colorTextPlaceholder: '#94a3b8',
        colorIconCardCvcColor: '#3b82f6',
        fontWeightNormal: '400',
        fontWeightBold: '600'
      },
      rules: {
        '.Tab': {
          border: '1px solid #e2e8f0',
          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
        },
        '.Tab:hover': {
          color: 'var(--colorText)',
          backgroundColor: '#f8fafc',
        },
        '.Tab--selected': {
          borderColor: '#3b82f6',
          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05), 0 0 0 1px #3b82f6',
        },
        '.Label': {
          fontSize: '14px',
          fontWeight: '500',
          marginBottom: '8px',
          color: '#1f2937',
        },
        '.Input': {
          padding: '10px 14px',
          backgroundColor: '#f9fafb',
          borderColor: '#d1d5db',
          boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
        },
        '.Input:focus': {
          borderColor: '#3b82f6',
          boxShadow: '0 0 0 1px #3b82f6, 0px 1px 2px rgba(0, 0, 0, 0.05)',
        },
        '.Input--invalid': {
          borderColor: '#ef4444',
          boxShadow: '0 0 0 1px #ef4444',
        },
        '.Block': {
          backgroundColor: '#f8fafc',
          padding: '12px',
          borderRadius: '6px',
        },
        '.Error': {
          color: '#ef4444',
          fontSize: '14px',
          marginTop: '4px',
        },
        '.CheckboxLabel': {
          fontSize: '14px',
          fontWeight: '400',
          color: '#4b5563',
        },
        '.PickerItem': {
          borderRadius: '6px',
          border: '1px solid #e2e8f0',
        },
        '.PickerItem--selected': {
          borderColor: '#3b82f6',
          boxShadow: '0 0 0 1px #3b82f6',
          backgroundColor: '#eff6ff',
        }
      }
    };
  }

  /**
   * Set up the Stripe payment form
   * @param {string} planId - Subscription plan ID (gold or platinum)
   * @param {string} elementId - DOM element ID to mount the payment form
   */
  async setupPaymentForm(planId, elementId) {
    try {
      // Create the subscription with the API
      const response = await fetch('/stripe/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          planId: planId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create subscription');
      }

      const { clientSecret, subscriptionId } = await response.json();
      this.subscriptionId = subscriptionId;

      // Initialize the Stripe checkout
      this.checkout = await this.stripe.initCheckout({
        clientSecret,
        appearance: this.appearance
      });

      // Create and mount the payment element
      this.paymentElement = this.checkout.createElement('payment', {
        layout: 'accordion'
      });
      
      // Mount the element
      this.paymentElement.mount(`#${elementId}`);
      
      return true;
    } catch (error) {
      console.error('Error setting up payment form:', error);
      throw error;
    }
  }

  /**
   * Confirm the payment to complete the subscription
   * @param {string} returnUrl - URL to redirect to after successful payment
   */
  async confirmPayment(returnUrl) {
    try {
      const result = await this.checkout.confirm({
        return_url: returnUrl
      });
      
      if (result.type === 'error') {
        throw new Error(result.error.message || 'Payment failed');
      }
      
      return true;
    } catch (error) {
      console.error('Payment confirmation error:', error);
      return false;
    }
  }

  /**
   * Validate an email address
   * @param {string} email - Email to validate
   * @returns {Promise<Object>} - Validation result
   */
  async validateEmail(email) {
    try {
      const response = await fetch('/stripe/validate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      return await response.json();
    } catch (error) {
      console.error('Email validation error:', error);
      return { error: { message: 'Failed to validate email' } };
    }
  }

  /**
   * Apply a discount code to the current subscription
   * @param {string} code - Discount code to apply
   * @returns {Promise<Object>} - Result with discount information
   */
  async applyDiscount(code) {
    try {
      if (!this.subscriptionId) {
        throw new Error('No active subscription');
      }
      
      const response = await fetch('/stripe/apply-discount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code,
          subscriptionId: this.subscriptionId
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to apply discount');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Discount application error:', error);
      throw error;
    }
  }
}
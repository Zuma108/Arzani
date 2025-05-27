/**
 * Global OAuth Error Handler
 * Handles common OAuth-related errors including window.opener null references
 * that can occur with Google Identity Services, Microsoft OAuth, and other providers
 */

(function() {
  'use strict';

  // Track if we've already shown an error to prevent spam
  let errorShown = false;
  
  // Global error handler for OAuth-related issues
  window.addEventListener('error', function(event) {
    // Handle window.opener null errors
    if (event.message && (
        event.message.includes("Cannot read properties of null (reading 'opener')") ||
        event.message.includes("Cannot read property 'opener' of null") ||
        event.message.includes("opener is null")
    )) {
      console.warn('OAuth window.opener error detected and handled:', event.message);
      
      // Prevent the error from propagating
      event.preventDefault();
      event.stopPropagation();
      
      // Show user-friendly notification only once
      if (!errorShown) {
        showOAuthNotification('OAuth authentication is processing. Please wait...', 'info');
        errorShown = true;
        
        // Reset the flag after 30 seconds
        setTimeout(() => {
          errorShown = false;
        }, 30000);
      }
      
      return false;
    }
    
    // Handle Google Identity Services specific errors
    if (event.message && (
        event.message.includes('GSI_LOGGER') ||
        event.message.includes('The given origin is not allowed') ||
        event.message.includes('popup_closed_by_user') ||
        event.message.includes('network_error')
    )) {
      console.warn('Google Identity Services error detected:', event.message);
      
      event.preventDefault();
      event.stopPropagation();
      
      if (!errorShown) {
        if (event.message.includes('The given origin is not allowed')) {
          showOAuthNotification('Google Sign-In is not configured for this domain. Please contact support.', 'warning');
        } else if (event.message.includes('popup_closed_by_user')) {
          showOAuthNotification('Google Sign-In was cancelled. You can try again.', 'info');
        } else if (event.message.includes('network_error')) {
          showOAuthNotification('Network error during Google Sign-In. Please check your connection and try again.', 'warning');
        } else {
          showOAuthNotification('Google Sign-In encountered an issue. Please try again or use email/password login.', 'warning');
        }
        
        errorShown = true;
        setTimeout(() => {
          errorShown = false;
        }, 15000);
      }
      
      return false;
    }
    
    // Handle Microsoft OAuth errors
    if (event.message && (
        event.message.includes('AADSTS') ||
        event.message.includes('msal') ||
        event.message.includes('microsoft')
    )) {
      console.warn('Microsoft OAuth error detected:', event.message);
      
      event.preventDefault();
      event.stopPropagation();
      
      if (!errorShown) {
        showOAuthNotification('Microsoft Sign-In encountered an issue. Please try again or use email/password login.', 'warning');
        errorShown = true;
        setTimeout(() => {
          errorShown = false;
        }, 15000);
      }
      
      return false;
    }
  }, true); // Use capture phase
  
  // Handle unhandled promise rejections related to OAuth
  window.addEventListener('unhandledrejection', function(event) {
    const reason = event.reason;
    
    if (reason && typeof reason === 'object' && reason.message) {
      if (reason.message.includes('opener') || 
          reason.message.includes('OAuth') || 
          reason.message.includes('GSI') ||
          reason.message.includes('credential')) {
        
        console.warn('OAuth promise rejection handled:', reason.message);
        event.preventDefault();
        
        if (!errorShown) {
          showOAuthNotification('Authentication is processing. Please wait or refresh the page if it takes too long.', 'info');
          errorShown = true;
          setTimeout(() => {
            errorShown = false;
          }, 15000);
        }
      }
    }
  });
  
  // Function to show OAuth-related notifications
  function showOAuthNotification(message, type = 'info') {
    // Remove any existing notifications
    const existingNotifications = document.querySelectorAll('.oauth-notification');
    existingNotifications.forEach(notification => notification.remove());
    
    const notification = document.createElement('div');
    notification.className = 'oauth-notification';
    
    // Set styles based on type
    let backgroundColor, textColor, borderColor;
    switch (type) {
      case 'error':
        backgroundColor = '#f8d7da';
        textColor = '#721c24';
        borderColor = '#f5c6cb';
        break;
      case 'warning':
        backgroundColor = '#fff3cd';
        textColor = '#856404';
        borderColor = '#ffeaa7';
        break;
      case 'success':
        backgroundColor = '#d4edda';
        textColor = '#155724';
        borderColor = '#c3e6cb';
        break;
      default: // info
        backgroundColor = '#d1ecf1';
        textColor = '#0c5460';
        borderColor = '#bee5eb';
    }
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${backgroundColor};
      color: ${textColor};
      border: 1px solid ${borderColor};
      padding: 12px 16px;
      border-radius: 6px;
      z-index: 10000;
      max-width: 350px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.4;
    `;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 8px;">
        <div style="flex: 1;">
          <strong>${type.charAt(0).toUpperCase() + type.slice(1)}</strong>
          <div style="margin-top: 4px;">${message}</div>
        </div>
        <button onclick="this.closest('.oauth-notification').remove()" 
                style="background: none; border: none; color: ${textColor}; cursor: pointer; padding: 0; margin-left: 8px; font-size: 18px; line-height: 1;"
                title="Dismiss">×</button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-dismiss after appropriate time based on type
    const dismissTime = type === 'error' ? 15000 : type === 'warning' ? 10000 : 7000;
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        notification.style.transition = 'all 0.3s ease-out';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 300);
      }
    }, dismissTime);
  }
  
  // Export functions for manual use
  window.OAuthErrorHandler = {
    showNotification: showOAuthNotification,
    clearNotifications: function() {
      const notifications = document.querySelectorAll('.oauth-notification');
      notifications.forEach(n => n.remove());
    }
  };
  
  console.log('OAuth Error Handler initialized');
})();

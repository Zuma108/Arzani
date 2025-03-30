/**
 * Chat Utilities
 * Provides helper functions for chat operations
 */

// Get auth token from various sources
function getAuthToken() {
  // Try meta tag first (most reliable)
  const metaToken = document.querySelector('meta[name="auth-token"]')?.content;
  if (metaToken) return metaToken;
  
  // Try localStorage
  const localToken = localStorage.getItem('token');
  if (localToken) return localToken;
  
  // Try cookie
  const cookieToken = getCookie('token');
  if (cookieToken) return cookieToken;
  
  // No token found
  return null;
}

// Get cookie value by name
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

// Check if a user is authenticated
function isAuthenticated() {
  return !!getAuthToken();
}

// Format message time for UI display
function formatMessageTime(timestamp) {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  // Less than a minute
  if (diff < 60000) return 'Just now';
  
  // Less than an hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}m ago`;
  }
  
  // Less than a day
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  }
  
  // Less than a week
  if (diff < 604800000) {
    return date.toLocaleDateString(undefined, { weekday: 'short' });
  }
  
  // Otherwise just date
  return date.toLocaleDateString();
}

// Format message timestamp for chat bubbles
function formatChatTime(timestamp) {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Get current user ID from various sources
function getCurrentUserId() {
  // Try data attribute
  const userIdEl = document.querySelector('[data-user-id]');
  if (userIdEl) return userIdEl.dataset.userId;
  
  // Try global variable
  if (window.currentUserId) return window.currentUserId;
  
  // Try meta tag
  const userIdMeta = document.querySelector('meta[name="user-id"]');
  if (userIdMeta) return userIdMeta.content;
  
  return null;
}

// Handle API error responses
function handleApiError(response, defaultMessage = 'An error occurred') {
  if (response.status === 401) {
    redirectToLogin();
    return 'Authentication required';
  }
  
  if (response.status === 403) {
    return 'You do not have permission to access this resource';
  }
  
  if (response.status === 404) {
    return 'The requested resource was not found';
  }
  
  return defaultMessage;
}

// Redirect to login page
function redirectToLogin() {
  const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = `/login2?returnTo=${returnTo}`;
}

// Extract message file type
function getFileType(url) {
  if (!url) return null;
  
  const extension = url.split('.').pop().toLowerCase();
  
  // Check file type
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
    return 'image';
  }
  
  if (['mp3', 'wav', 'ogg', 'aac'].includes(extension)) {
    return 'audio';
  }
  
  if (['mp4', 'webm', 'mov'].includes(extension)) {
    return 'video';
  }
  
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'].includes(extension)) {
    return 'document';
  }
  
  return 'file';
}

// Render attachment preview based on type
function renderAttachment(url, filename = '') {
  if (!url) return '';
  
  const type = getFileType(url);
  
  switch (type) {
    case 'image':
      return `
        <div class="message-attachment message-image">
          <img src="${url}" alt="Image" class="rounded max-w-full cursor-pointer" onclick="window.open('${url}', '_blank')">
          ${filename ? `<div class="text-xs text-gray-500 mt-1">${filename}</div>` : ''}
        </div>
      `;
    
    case 'audio':
      return `
        <div class="message-attachment message-audio">
          <audio controls class="w-full">
            <source src="${url}" type="audio/${url.split('.').pop()}">
            Your browser does not support audio playback.
          </audio>
          ${filename ? `<div class="text-xs text-gray-500 mt-1">${filename}</div>` : ''}
        </div>
      `;
    
    case 'video':
      return `
        <div class="message-attachment message-video">
          <video controls class="w-full max-h-60 rounded">
            <source src="${url}" type="video/${url.split('.').pop()}">
            Your browser does not support video playback.
          </video>
          ${filename ? `<div class="text-xs text-gray-500 mt-1">${filename}</div>` : ''}
        </div>
      `;
    
    case 'document':
    case 'file':
    default:
      const extension = url.split('.').pop().toUpperCase();
      return `
        <div class="message-attachment message-file flex items-center p-2 bg-gray-100 rounded">
          <div class="mr-3 bg-blue-100 text-blue-700 p-2 rounded">
            <span class="font-mono text-sm">${extension}</span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-gray-900 truncate">${filename || 'File'}</div>
            <a href="${url}" target="_blank" class="text-xs text-blue-600 hover:underline">Download</a>
          </div>
        </div>
      `;
  }
}

// Make utilities available globally
window.ChatUtils = {
  getAuthToken,
  getCookie,
  isAuthenticated,
  formatMessageTime,
  formatChatTime,
  getCurrentUserId,
  handleApiError,
  redirectToLogin,
  getFileType,
  renderAttachment
};

// Export for ES modules
export {
  getAuthToken,
  getCookie,
  isAuthenticated,
  formatMessageTime,
  formatChatTime,
  getCurrentUserId,
  handleApiError,
  redirectToLogin,
  getFileType,
  renderAttachment
};

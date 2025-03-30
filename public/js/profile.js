/**
 * Profile Management
 * Handles user profile data retrieval and updates
 */

(function() {
  // Initialize when DOM is loaded
  document.addEventListener('DOMContentLoaded', initProfileManager);
  
  // Set up event listeners when user is logged in
  function initProfileManager() {
    console.log('Initializing profile manager');
    
    // Fetch and display current user's profile
    fetchCurrentUserProfile();
    
    // Set up profile edit form if it exists
    setupProfileEditForm();
    
    // Set up profile picture upload if it exists
    setupProfilePictureUpload();
    
    // Setup profile data access for other parts of the application
    setupProfileAPI();
  }
  
  // Fetch current user's profile
  function fetchCurrentUserProfile() {
    const token = getAuthToken();
    
    if (!token) {
      console.log('No auth token, skipping profile fetch');
      return;
    }
    
    fetch('/api/profile', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    .then(response => {
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('AUTH_FAILED');
        }
        throw new Error(`Profile fetch failed: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (data.success && data.profile) {
        // Store profile data globally
        window.currentUserProfile = data.profile;
        window.currentUserId = data.profile.id;
        
        // Update UI with profile data
        updateProfileUI(data.profile);
        
        // Dispatch event for other components to use
        document.dispatchEvent(new CustomEvent('profile-loaded', { 
          detail: data.profile 
        }));
      }
    })
    .catch(error => {
      console.error('Error fetching profile:', error);
      
      if (error.message === 'AUTH_FAILED') {
        // Handle authentication failure if needed
        if (window.location.pathname.includes('/profile')) {
          window.location.href = `/login2?returnTo=${encodeURIComponent(window.location.pathname)}`;
        }
      }
    });
  }
  
  // Update profile UI with data
  function updateProfileUI(profile) {
    // Update profile picture
    const profilePicElements = document.querySelectorAll('[data-profile-picture]');
    profilePicElements.forEach(element => {
      element.src = profile.profile_picture || '/images/default-profile.png';
      element.onerror = function() {
        this.src = '/images/default-profile.png';
      };
    });
    
    // Update username
    const usernameElements = document.querySelectorAll('[data-profile-username]');
    usernameElements.forEach(element => {
      element.textContent = profile.username || 'User';
    });
    
    // Update email
    const emailElements = document.querySelectorAll('[data-profile-email]');
    emailElements.forEach(element => {
      element.textContent = profile.email || '';
    });
    
    // Update bio
    const bioElements = document.querySelectorAll('[data-profile-bio]');
    bioElements.forEach(element => {
      element.textContent = profile.bio || 'No bio provided';
    });
    
    // Update location
    const locationElements = document.querySelectorAll('[data-profile-location]');
    locationElements.forEach(element => {
      element.textContent = profile.location || 'Location not specified';
    });
    
    // Update website
    const websiteElements = document.querySelectorAll('[data-profile-website], [data-profile-website-link]');
    websiteElements.forEach(element => {
      if (profile.website) {
        if (element.tagName === 'A') {
          element.href = profile.website.startsWith('http') ? profile.website : `https://${profile.website}`;
          element.textContent = profile.website;
        } else {
          element.textContent = profile.website;
        }
      } else {
        if (element.tagName === 'A') {
          element.href = '#';
          element.textContent = 'No website provided';
        } else {
          element.textContent = 'No website provided';
        }
      }
    });
    
    // Update form fields
    updateProfileFormFields(profile);
  }
  
  // Update profile form fields
  function updateProfileFormFields(profile) {
    const form = document.getElementById('profile-edit-form');
    if (!form) return;
    
    // Set form field values
    const usernameInput = form.querySelector('[name="username"]');
    if (usernameInput) usernameInput.value = profile.username || '';
    
    const bioInput = form.querySelector('[name="bio"]');
    if (bioInput) bioInput.value = profile.bio || '';
    
    const locationInput = form.querySelector('[name="location"]');
    if (locationInput) locationInput.value = profile.location || '';
    
    const websiteInput = form.querySelector('[name="website"]');
    if (websiteInput) websiteInput.value = profile.website || '';
  }
  
  // Set up profile edit form
  function setupProfileEditForm() {
    const form = document.getElementById('profile-edit-form');
    if (!form) return;
    
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const token = getAuthToken();
      if (!token) return;
      
      // Get form data
      const formData = new FormData(form);
      const profileData = {
        username: formData.get('username'),
        bio: formData.get('bio'),
        location: formData.get('location'),
        website: formData.get('website')
      };
      
      // Update profile
      fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      })
      .then(response => {
        if (!response.ok) throw new Error(`Profile update failed: ${response.status}`);
        return response.json();
      })
      .then(data => {
        if (data.success) {
          // Update global profile data
          window.currentUserProfile = data.profile;
          
          // Show success message
          showMessage('Profile updated successfully', 'success');
          
          // Update UI
          updateProfileUI(data.profile);
          
          // Dispatch event for other components
          document.dispatchEvent(new CustomEvent('profile-updated', { 
            detail: data.profile 
          }));
        } else {
          showMessage(data.error || 'Failed to update profile', 'error');
        }
      })
      .catch(error => {
        console.error('Error updating profile:', error);
        showMessage('Error updating profile', 'error');
      });
    });
  }
  
  // Set up profile picture upload
  function setupProfilePictureUpload() {
    const uploadButton = document.getElementById('profile-picture-upload-btn');
    const fileInput = document.getElementById('profile-picture-input');
    
    if (!uploadButton || !fileInput) return;
    
    // Open file dialog when upload button is clicked
    uploadButton.addEventListener('click', function() {
      fileInput.click();
    });
    
    // Handle file selection
    fileInput.addEventListener('change', function() {
      if (this.files && this.files[0]) {
        const file = this.files[0];
        
        // Validate file
        if (!file.type.match('image.*')) {
          showMessage('Please select an image file', 'error');
          return;
        }
        
        // Create FormData
        const formData = new FormData();
        formData.append('profilePicture', file);
        
        // Upload file
        const token = getAuthToken();
        if (!token) return;
        
        // Show loading state
        const profilePic = document.querySelector('[data-profile-picture]');
        if (profilePic) {
          profilePic.classList.add('opacity-50');
        }
        
        fetch('/api/profile/upload-picture', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        })
        .then(response => {
          if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
          return response.json();
        })
        .then(data => {
          if (data.success) {
            // Update global profile data
            window.currentUserProfile.profile_picture = data.profile.profile_picture;
            
            // Show success message
            showMessage('Profile picture updated', 'success');
            
            // Update UI
            const profilePicElements = document.querySelectorAll('[data-profile-picture]');
            profilePicElements.forEach(element => {
              element.src = data.profile.profile_picture;
              element.classList.remove('opacity-50');
            });
            
            // Dispatch event for other components
            document.dispatchEvent(new CustomEvent('profile-picture-updated', { 
              detail: { profilePicture: data.profile.profile_picture } 
            }));
          } else {
            showMessage(data.error || 'Failed to update profile picture', 'error');
            if (profilePic) profilePic.classList.remove('opacity-50');
          }
        })
        .catch(error => {
          console.error('Error uploading profile picture:', error);
          showMessage('Error uploading profile picture', 'error');
          if (profilePic) profilePic.classList.remove('opacity-50');
        });
      }
    });
  }
  
  // Set up global profile API for other components
  function setupProfileAPI() {
    // Create global ProfileManager object
    window.ProfileManager = {
      getProfile: function() {
        return window.currentUserProfile || null;
      },
      
      getUserId: function() {
        return window.currentUserId || null;
      },
      
      getUsername: function() {
        return window.currentUserProfile?.username || null;
      },
      
      getProfilePicture: function() {
        return window.currentUserProfile?.profile_picture || '/images/default-profile.png';
      },
      
      isLoggedIn: function() {
        return !!window.currentUserId;
      },
      
      refresh: function() {
        return fetchCurrentUserProfile();
      },
      
      updateLastActive: function() {
        const token = getAuthToken();
        if (!token) return Promise.reject('No auth token');
        
        return fetch('/api/profile/active', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        .then(response => {
          if (!response.ok) throw new Error('Failed to update last active timestamp');
          return response.json();
        });
      }
    };
    
    // Update last active timestamp periodically
    setInterval(function() {
      if (window.ProfileManager.isLoggedIn()) {
        window.ProfileManager.updateLastActive()
          .catch(error => console.error('Error updating last active timestamp:', error));
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }
  
  // Helper function to get auth token
  function getAuthToken() {
    // Try meta tag first
    const metaToken = document.querySelector('meta[name="auth-token"]')?.content;
    if (metaToken) return metaToken;
    
    // Try localStorage
    return localStorage.getItem('token');
  }
  
  // Helper function to show messages
  function showMessage(message, type = 'info') {
    // Check if toast functionality exists
    if (typeof showToast === 'function') {
      showToast(message, type);
      return;
    }
    
    // Simple alert fallback
    if (type === 'error') {
      alert(`Error: ${message}`);
    } else {
      alert(message);
    }
  }
})();

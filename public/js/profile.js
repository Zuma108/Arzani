document.addEventListener('DOMContentLoaded', async () => {
    try {
        const token = localStorage.getItem('token');
        
        // If no token in localStorage, try to get it from the page
        if (!token) {
            const tokenMeta = document.querySelector('meta[name="auth-token"]');
            if (!tokenMeta?.content) {
                window.location.href = '/login2';
                return;
            }
            localStorage.setItem('token', tokenMeta.content);
        }

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
        };

        // Just fetch profile data, remove subscription fetch
        const profileResponse = await fetch('/api/profile', { headers });

        if (!profileResponse.ok) {
            if (profileResponse.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/login2';
                return;
            }
            throw new Error('Failed to fetch profile data');
        }

        const profileData = await profileResponse.json();

        // Update profile UI
        const profilePic = document.querySelector('.profile-picture');
        if (profilePic && profileData.profile_picture) {
            profilePic.src = getProfilePictureUrl(profileData.profile_picture);
            profilePic.onerror = () => {
                profilePic.src = '/images/default-profile.png';
            };
        }

        // Update username if it exists in the DOM
        const usernameElement = document.querySelector('.profile-header h1');
        if (usernameElement) {
            usernameElement.textContent = profileData.username;
        }

        // Update any other profile fields that exist in the DOM
        const memberSinceElement = document.querySelector('.member-since');
        if (memberSinceElement && profileData.created_at) {
            memberSinceElement.textContent = `Member since ${new Date(profileData.created_at).toLocaleDateString()}`;
        }

    } catch (error) {
        console.error('Profile error:', error);
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.textContent = 'Failed to load profile data. Please try again.';
        document.querySelector('.profile-header')?.prepend(errorMessage);
    }

    // Update picture upload form handler
    const pictureForm = document.getElementById('picture-form');
    const errorMessage = document.getElementById('upload-error');

    if (pictureForm) {
        pictureForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(pictureForm);

            try {
                // Update to use the correct endpoint matching profileApi.js
                const response = await fetch('/api/profile/upload-picture', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: formData
                });

                if (!response.ok) {
                    throw new Error('Upload failed');
                }

                const data = await response.json();
                if (data.success) {
                    window.location.reload();
                }
            } catch (error) {
                errorMessage.textContent = 'Failed to upload image. Please try again.';
                errorMessage.style.display = 'block';
            }
        });
    }

    // Handle subscription upgrade button - keep basic functionality
    const upgradeButton = document.querySelector('.upgrade-button');
    if (upgradeButton) {
        upgradeButton.addEventListener('click', () => {
            alert('Premium subscription features coming soon!');
        });
    }

    // Add sign out handler
    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', async () => {
            try {
                // Clear local storage
                localStorage.removeItem('token');
                
                // Clear session
                await fetch('/auth/logout', {
                    method: 'POST',
                    credentials: 'include'
                });

                // Redirect to login
                window.location.href = '/login';
            } catch (error) {
                console.error('Sign out error:', error);
            }
        });
    }
});

// Update uploadProfilePicture function to use new endpoint
async function uploadProfilePicture(file) {
    try {
        const formData = new FormData();
        formData.append('profile_picture', file);

        const token = localStorage.getItem('token');
        if (!token) throw new Error('Not authenticated');

        // Updated to use correct endpoint
        const response = await fetch('/api/profile/upload-picture', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Upload failed');
        }

        if (data.success) {
            const profilePic = document.querySelector('.profile-picture');
            if (profilePic && data.profile_picture) {
                profilePic.src = data.profile_picture;
            }
            showMessage('Profile picture updated successfully', 'success');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showMessage(error.message || 'Failed to upload profile picture', 'error');
    }
}

function showMessage(message, type = 'error') {
  const messageDiv = document.getElementById('message') || document.createElement('div');
  messageDiv.id = 'message';
  messageDiv.className = `alert alert-${type === 'success' ? 'success' : 'danger'}`;
  messageDiv.textContent = message;

  const container = document.querySelector('.profile-container');
  if (container) {
    container.insertBefore(messageDiv, container.firstChild);
    setTimeout(() => messageDiv.remove(), 5000);
  }
}

// Helper function to handle S3 URLs
function getProfilePictureUrl(url) {
  if (!url) return '/images/default-profile.png';
  if (url.startsWith('http')) return url; // S3 URL
  return url; // Local URL fallback
}

// Update file input handler
document.getElementById('profile-picture-input')?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    uploadProfilePicture(file);
  }
});

// Error message styles
const style = document.createElement('style');
style.textContent = `
  .error-message {
    color: #721c24;
    background-color: #f8d7da;
    border: 1px solid #f5c6cb;
    border-radius: 4px;
    padding: 10px;
    margin: 10px 0;
    text-align: center;
  }
`;

signOutBtn.addEventListener('click', async () => {
    try {
        // Clear local storage
        localStorage.removeItem('token');
        
        // Clear session
        await fetch('/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });

        // Redirect to login2 instead of login
        window.location.href = '/login2';
    } catch (error) {
        console.error('Sign out error:', error);
    }
});
document.head.appendChild(style);

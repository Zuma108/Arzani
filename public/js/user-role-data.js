/**
 * User role management functionality
 * This file loads user data from DOM elements and handles role selection
 */

// Get user data from data attributes
const userData = document.getElementById('user-data');
const isVerifiedProfessional = userData.getAttribute('data-is-verified-professional') === 'true';

function setRole(role) {
    // For professional role, check if verified
    if (role === 'professional' && !isVerifiedProfessional) {
        startVerification();
        return;
    }
    
    // Call API to set role
    fetch('/api/users/roles/primary', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': getAuthHeader()
        },
        body: JSON.stringify({ role })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to set role');
        }
        return response.json();
    })
    .then(data => {
        console.log('Role updated:', data);
        
        // Update UI to show active role
        document.querySelectorAll('.role-card').forEach(card => {
            card.classList.remove('active');
        });
        document.getElementById(`role-${role}`).classList.add('active');
        
        // Update toggle bar
        document.querySelectorAll('.role-toggle-option').forEach(option => {
            option.classList.remove('active');
        });
        document.querySelector(`.role-toggle-option:nth-child(${getRoleIndex(role)})`).classList.add('active');
        
        // Redirect to appropriate dashboard
        window.location.href = `/role-selection/dashboard/${role}`;
    })
    .catch(error => {
        console.error('Error setting role:', error);
        alert('Failed to set role. Please try again.');
    });
}

function getRoleIndex(role) {
    switch(role) {
        case 'buyer': return 1;
        case 'seller': return 2;
        case 'professional': return 3;
        default: return 1;
    }
}

function startVerification() {
    window.location.href = '/professional-verification';
}

function checkVerificationStatus() {
    fetch('/api/verification/status', {
        headers: {
            'Authorization': getAuthHeader()
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.isVerified) {
            window.location.reload();
        } else {
            alert('Your verification is still pending. We\'ll notify you once it\'s approved.');
        }
    })
    .catch(error => {
        console.error('Error checking verification status:', error);
        alert('Error checking verification status. Please try again later.');
    });
}

function handleProfessionalClick() {
    if (isVerifiedProfessional) {
        setRole('professional');
    } else {
        startVerification();
    }
}

// Helper function to get auth header from token in localStorage or cookie
function getAuthHeader() {
    const token = localStorage.getItem('token') || getCookie('token');
    return token ? `Bearer ${token}` : '';
}

// Helper function to get cookie value
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

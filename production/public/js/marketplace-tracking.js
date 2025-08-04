async function trackUserAction(businessId, actionType) {
    try {
        const metadata = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            platform: navigator.platform
        };

        const response = await fetch('/api/history/track', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}` // Ensure auth token is sent
            },
            body: JSON.stringify({
                businessId: parseInt(businessId),
                actionType,
                metadata
            })
        });

        if (!response.ok) {
            throw new Error('Failed to track action');
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error tracking user action:', error);
    }
}

export function initializeTracking() {
    // Track view details clicks
    document.addEventListener('click', async (e) => {
        const viewButton = e.target.closest('.view-details-btn');
        if (viewButton) {
            const businessId = viewButton.getAttribute('data-business-id');
            await trackUserAction(businessId, 'view_details');
        }
    });

    // Track contact seller clicks
    document.addEventListener('click', async (e) => {
        const contactButton = e.target.closest('.contact-btn');
        if (contactButton) {
            const businessId = contactButton.getAttribute('data-business-id');
            await trackUserAction(businessId, 'contact_seller');
        }
    });
}

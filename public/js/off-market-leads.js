document.addEventListener('DOMContentLoaded', async function() {
    const stripeKey = window.stripePublishableKey;
    
    if (!stripeKey) {
        console.error('Stripe key missing');
        return;
    }

    try {
        // Initialize Stripe
        const stripe = Stripe(stripeKey);
        window.stripe = stripe;
        
        // Show upgrade modal with delay
        setTimeout(() => {
            const modal = createUpgradeModal();
            document.body.appendChild(modal);
            showModal();
        }, 1000);

        initializeNavbar();
        initializePricingButtons();
    } catch (error) {
        console.error('Stripe initialization failed:', error);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = 'Payment system unavailable';
        document.body.appendChild(errorDiv);
    }
});

function createUpgradeModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'upgradeModal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Ready to upgrade?</h2>
            <p>For full access, you'll need to upgrade to Gold or Platinum.</p>
            
            <div class="plans-comparison">
                <div class="plan gold">
                    <h3>
                        <div class="plan-icon gold-icon">
                            <img src="/images/gold-user.svg" alt="Gold" width="24" height="24">
                        </div>
                        Gold
                    </h3>
                    <div class="price-container">
                        <span class="price-label">Price</span>
                        <div class="price-details">
                            <span class="original-price">£100 /month</span>
                            <span class="current-price">£39 /month</span>
                        </div>
                        <span class="savings">Save 61% for 6 months*</span>
                    </div>
                    <ul class="features">
                        <li class="feature-item checked">✓ Full Database Access</li>
                        <li class="feature-item checked">✓ Verified ID</li>
                        <li class="feature-item checked">✓ Arzani Insights</li>
                        <li class="feature-item unchecked">✗ Off Market Leads</li>
                    </ul>
                    <button class="upgrade-btn" data-plan="gold">Upgrade to Gold</button>
                </div>
                
                <div class="plan platinum">
                    <div class="popular-badge">Most Popular</div>
                    <h3>
                        <div class="plan-icon platinum-icon">
                            <img src="/images/platinum-image.svg" alt="Platinum" width="24" height="24">
                        </div>
                        Platinum
                    </h3>
                    <div class="price-container">
                        <span class="price-label">Price</span>
                        <div class="price-details">
                            <span class="original-price">£200 /month</span>
                            <span class="current-price">£50/month</span>
                        </div>
                        <span class="savings">Save 70% for 6 months*</span>
                    </div>
                    <ul class="features">
                        <li class="feature-item checked">✓ Full Database Access</li>
                        <li class="feature-item checked">✓ Verified ID</li>
                        <li class="feature-item checked">✓ Arzani Insights</li>
                        <li class="feature-item checked">✓ Off Market Leads</li>
                    </ul>
                    <button class="upgrade-btn" data-plan="platinum">Upgrade to Platinum</button>
                </div>
            </div>
            
            <button class="modal-close" aria-label="Close modal">×</button>
        </div>
    `;

    // Add event listeners
    modal.querySelector('.modal-close').addEventListener('click', hideModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) hideModal();
    });

    // Handle upgrade buttons
    modal.querySelectorAll('.upgrade-btn').forEach(btn => {
        btn.addEventListener('click', handleUpgrade);
    });

    return modal;
}

function showModal() {
    const modal = document.getElementById('upgradeModal');
    if (!modal) {
        const newModal = createUpgradeModal();
        document.body.appendChild(newModal);
        setTimeout(() => {
            newModal.classList.add('active');
        }, 100);
    } else {
        modal.style.display = 'flex';
        modal.classList.add('active');
    }
}

function hideModal() {
    const modal = document.getElementById('upgradeModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Show modal with delay
    setTimeout(showModal, 1500);

    // Create modal if it doesn't exist
    if (!document.getElementById('upgradeModal')) {
        const modal = createUpgradeModal();
        document.body.appendChild(modal);
    }

    // Initialize other components
    initializeNavbar();
    initializePricingButtons();
});

async function handleUpgrade(e) {
    e.preventDefault();
    const plan = e.target.dataset.plan;
    if (!plan) {
        console.error('No plan specified');
        return;
    }

    // Redirect to the appropriate checkout page
    window.location.href = `/checkout-${plan.toLowerCase()}`;
}

function initializeNavbar() {
    // Handle navbar hover effects
    const navLinks = document.querySelectorAll('.navbar-link');
    
    navLinks.forEach(link => {
        link.addEventListener('mouseenter', () => {
            const icon = link.querySelector('svg');
            const text = link.querySelector('span');
            if (icon && text) {
                icon.style.opacity = '0';
                text.style.opacity = '1';
                text.style.transform = 'translateY(0)';
            }
        });

        link.addEventListener('mouseleave', () => {
            const icon = link.querySelector('svg');
            const text = link.querySelector('span');
            if (icon && text) {
                icon.style.opacity = '1';
                text.style.opacity = '0';
                text.style.transform = 'translateY(20px)';
            }
        });
    });

    // Set active nav item
    const currentPath = window.location.pathname;
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });
}

// Handle escape key to close modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideModal();
});

const upgradeButton = document.querySelector('.upgrade-button');
if (upgradeButton) {
    upgradeButton.addEventListener('click', (e) => handleUpgrade({
        preventDefault: () => {},
        target: { dataset: { plan: 'platinum' } }
    }));
}

function initializePricingButtons() {
    // Select all upgrade buttons in the main pricing section
    const pricingButtons = document.querySelectorAll('.pricing-table .upgrade-button, .pricing-table .plan-button');
    
    pricingButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const plan = button.getAttribute('data-plan') || 'platinum'; // Default to platinum if not specified
            window.location.href = `/payment/checkout?plan=${plan}`;
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // Get all upgrade buttons
    const upgradeButtons = document.querySelectorAll('.upgrade-btn');
    
    // Add click event listeners to each button
    upgradeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const plan = this.dataset.plan;
            
            // Check if user is logged in
            fetch('/api/verify-token', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${getToken()}`,
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.valid) {
                    // User is authenticated, redirect to checkout
                    window.location.href = `/checkout-${plan}?plan=${plan}`;
                } else {
                    // User is not authenticated, redirect to login
                    window.location.href = `/login?redirect=/off-market-leads`;
                }
            })
            .catch(error => {
                console.error('Authentication check failed:', error);
                // Show login modal or redirect to login page
                window.location.href = `/login?redirect=/off-market-leads`;
            });
        });
    });
    
    // Helper function to get token from localStorage
    function getToken() {
        return localStorage.getItem('token') || '';
    }
    
    // Check current subscription status to update UI
    checkSubscriptionStatus();
});

function checkSubscriptionStatus() {
    fetch('/api/check-subscription', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        // Update UI based on the subscription type
        const subscriptionType = data.subscriptionType;
        
        // Reset all buttons to default state
        document.querySelectorAll('.plan-button').forEach(button => {
            button.textContent = button.classList.contains('upgrade-btn') 
                ? `Upgrade to ${button.dataset.plan.charAt(0).toUpperCase() + button.dataset.plan.slice(1)}` 
                : 'Current Plan';
            button.disabled = false;
            button.classList.remove('current');
        });
        
        // Update the specific plan button based on subscription
        if (subscriptionType === 'platinum') {
            const platinumButton = document.querySelector('[data-plan="platinum"]');
            if (platinumButton) {
                platinumButton.textContent = 'Current Plan';
                platinumButton.disabled = true;
                platinumButton.classList.add('current');
            }
        } else if (subscriptionType === 'gold') {
            const goldButton = document.querySelector('[data-plan="gold"]');
            if (goldButton) {
                goldButton.textContent = 'Current Plan';
                goldButton.disabled = true;
                goldButton.classList.add('current');
            }
        }
    })
    .catch(error => {
        console.error('Failed to check subscription status:', error);
    });
}

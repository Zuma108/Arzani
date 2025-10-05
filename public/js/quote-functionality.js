/**
 * Quote functionality for chat interface
 * Handles creating and managing quotes between professionals and clients
 */

// Global variables for quote functionality
let currentQuote = null;
let quoteModal = null;
let socket = null;

// Initialize quote functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Quote functionality initializing...');
    initQuoteModal();
    setupQuoteEventListeners();
    initWebSocketForQuotes();
    
    // Make sure the function is globally available
    window.openQuoteModal = openQuoteModal;
    console.log('Quote functionality initialized successfully');
});

/**
 * Initialize quote modal and related elements
 */
function initQuoteModal() {
    quoteModal = document.getElementById('quoteModal');
    
    if (!quoteModal) {
        console.warn('Quote modal not found - quote functionality may not be available');
        return;
    }
    
    // Set default valid until date (30 days from now)
    const validUntilInput = document.getElementById('quoteValidUntil');
    if (validUntilInput) {
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 30);
        validUntilInput.value = defaultDate.toISOString().split('T')[0];
    }
}

/**
 * Setup event listeners for quote functionality
 */
function setupQuoteEventListeners() {
    // Quote button click
    const quoteBtn = document.getElementById('quoteBtn');
    if (quoteBtn) {
        console.log('Adding click listener to quote button');
        quoteBtn.addEventListener('click', function(e) {
            console.log('Quote button clicked via event listener');
            e.preventDefault();
            e.stopPropagation();
            openQuoteModal();
            return false;
        });
    } else {
        console.warn('Quote button not found during initialization');
    }
    
    // Close modal buttons
    const closeQuoteModal = document.getElementById('closeQuoteModal');
    const cancelQuote = document.getElementById('cancelQuote');
    
    if (closeQuoteModal) {
        closeQuoteModal.addEventListener('click', closeQuoteModalHandler);
    }
    
    if (cancelQuote) {
        cancelQuote.addEventListener('click', closeQuoteModalHandler);
    }
    
    // Note: addQuoteItem functionality removed - using simple direct quote form
    
    // Quote form submission
    const quoteForm = document.getElementById('quoteForm');
    if (quoteForm) {
        quoteForm.addEventListener('submit', handleQuoteSubmission);
    }
    
    // Auto-calculate total amount when items change
    document.addEventListener('input', function(e) {
        if (e.target.matches('input[name="item_quantity[]"], input[name="item_price[]"]')) {
            calculateQuoteTotal();
        }
    });
    
    // Handle remove item buttons (event delegation)
    document.addEventListener('click', function(e) {
        if (e.target.closest('.remove-item')) {
            e.preventDefault();
            removeQuoteItem(e.target.closest('.quote-item'));
        }
    });
    
    // Close modal when clicking outside
    if (quoteModal) {
        quoteModal.addEventListener('click', function(e) {
            if (e.target === quoteModal) {
                closeQuoteModalHandler();
            }
        });
    }
}

/**
 * Open the quote modal
 */
function openQuoteModal() {
    console.log('Opening quote modal...');
    
    if (!quoteModal) {
        console.error('Quote modal not found, trying to find it...');
        quoteModal = document.getElementById('quoteModal');
        if (!quoteModal) {
            console.error('Quote modal still not found in DOM');
            alert('Quote modal not available. Please refresh the page.');
            return;
        }
    }
    
    // Check if user is a professional
    const userData = document.getElementById('current-user-data');
    const isProfessional = userData?.dataset.isProfessional === 'true' || 
                          userData?.dataset.userType === 'professional' ||
                          document.querySelector('#quoteBtn') !== null; // If quote button exists, user is professional
    
    console.log('User professional status:', { 
        isProfessional, 
        userType: userData?.dataset.userType,
        isProfessionalData: userData?.dataset.isProfessional 
    });
    
    if (!isProfessional) {
        alert('Only verified professionals can send quotes.');
        return;
    }
    
    // Reset form
    resetQuoteForm();
    
    // Show modal
    console.log('Showing quote modal...');
    quoteModal.classList.remove('hidden');
    
    // Focus on title input
    const titleInput = document.getElementById('quoteTitle');
    if (titleInput) {
        titleInput.focus();
    }
    
    console.log('Quote modal opened successfully');
}

/**
 * Close the quote modal
 */
function closeQuoteModalHandler() {
    if (quoteModal) {
        quoteModal.classList.add('hidden');
        resetQuoteForm();
    }
}

/**
 * Reset the quote form to default state
 */
function resetQuoteForm() {
    const form = document.getElementById('quoteForm');
    if (!form) return;
    
    form.reset();
    
    // Set default valid until date (30 days from now)
    const validUntilInput = document.getElementById('quoteValidUntil');
    if (validUntilInput) {
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 30);
        validUntilInput.value = defaultDate.toISOString().split('T')[0];
    }
}

/**
 * Add a new quote item row
 */
function addQuoteItemRow() {
    const quoteItems = document.getElementById('quoteItems');
    if (!quoteItems) return;
    
    const newItem = document.createElement('div');
    newItem.className = 'quote-item flex gap-3 items-start';
    newItem.innerHTML = `
        <input type="text" name="item_description[]" placeholder="Service description"
               class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
        <input type="number" name="item_quantity[]" placeholder="Qty" min="1" value="1"
               class="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
        <input type="number" name="item_price[]" placeholder="£0.00" min="0" step="0.01"
               class="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
        <button type="button" class="remove-item text-red-500 hover:text-red-700 p-2">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    quoteItems.appendChild(newItem);
    
    // Show remove buttons for all items when there's more than one
    updateRemoveButtons();
}

/**
 * Remove a quote item row
 */
function removeQuoteItem(itemElement) {
    const quoteItems = itemElement.parentElement;
    const items = quoteItems.querySelectorAll('.quote-item');
    
    // Don't remove if it's the last item
    if (items.length <= 1) {
        return;
    }
    
    itemElement.remove();
    updateRemoveButtons();
    calculateQuoteTotal();
}

/**
 * Update visibility of remove buttons
 */
function updateRemoveButtons() {
    const quoteItems = document.getElementById('quoteItems');
    if (!quoteItems) return;
    
    const items = quoteItems.querySelectorAll('.quote-item');
    const removeButtons = quoteItems.querySelectorAll('.remove-item');
    
    removeButtons.forEach(button => {
        button.style.display = items.length > 1 ? 'block' : 'none';
    });
}

/**
 * Calculate and update the total quote amount
 */
function calculateQuoteTotal() {
    const quoteItems = document.getElementById('quoteItems');
    const amountInput = document.getElementById('quoteAmount');
    
    if (!quoteItems || !amountInput) return;
    
    let total = 0;
    const items = quoteItems.querySelectorAll('.quote-item');
    
    items.forEach(item => {
        const quantity = parseFloat(item.querySelector('input[name="item_quantity[]"]').value) || 0;
        const price = parseFloat(item.querySelector('input[name="item_price[]"]').value) || 0;
        total += quantity * price;
    });
    
    amountInput.value = total.toFixed(2);
}

/**
 * Handle quote form submission
 */
async function handleQuoteSubmission(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitButton = form.querySelector('#sendQuote');
    
    // Disable submit button
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Sending...';
    }
    
    try {
        // Get form data
        const formData = new FormData(form);
        
        // Validate required fields
        const title = formData.get('title');
        const description = formData.get('description');
        const amount = formData.get('amount');
        
        if (!title || !description || !amount) {
            throw new Error('Please fill in all required fields: title, description, and amount.');
        }
        
        if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            throw new Error('Please enter a valid amount greater than 0.');
        }
        
        // Get conversation ID from current chat
        const messageForm = document.getElementById('message-form');
        let conversationId = messageForm?.dataset.conversationId;
        
        // Try meta tag as fallback
        if (!conversationId) {
            const conversationMeta = document.querySelector('meta[name="conversation-id"]');
            conversationId = conversationMeta?.content;
        }
        
        if (!conversationId) {
            throw new Error('No active conversation found. Please ensure you are in a valid conversation.');
        }
        
        // Get client ID from conversation automatically
        const clientId = await getClientIdFromConversation(conversationId);
        
        if (!clientId) {
            throw new Error('Could not determine client from conversation. Please ensure you are in a valid two-person conversation.');
        }
        
        // Create a simple service item from the quote details (no complex items needed)
        const items = [{
            description: formData.get('description'),
            quantity: 1,
            price: parseFloat(formData.get('amount')),
            total: parseFloat(formData.get('amount'))
        }];
        
        // Prepare quote data
        const quoteData = {
            conversationId: conversationId,
            clientId: clientId,
            title: formData.get('title'),
            description: formData.get('description'),
            amount: formData.get('amount'),
            items: items,
            validUntil: formData.get('valid_until') || null,
            paymentTerms: formData.get('payment_terms'),
            notes: formData.get('notes') || null
        };
        
        // Get auth token
        const token = getAuthToken();
        if (!token) {
            throw new Error('Authentication required');
        }
        
        // Send quote to server
        const response = await fetch('/api/quotes/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(quoteData)
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to create quote');
        }
        
        // The WebSocket event will handle the success notification and UI updates
        // So we don't need to manually show toast or refresh - just wait for the event
        console.log('Quote created successfully, waiting for WebSocket event...');
        
        // Close modal immediately since WebSocket will handle the rest
        closeQuoteModalHandler();
        
    } catch (error) {
        console.error('Error sending quote:', error);
        showToast(error.message || 'Failed to send quote', 'error');
    } finally {
        // Re-enable submit button
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Send Quote';
        }
    }
}

/**
 * Get client ID from conversation participants
 */
async function getClientIdFromConversation(conversationId) {
    try {
        console.log('Getting client ID for conversation:', conversationId);
        
        const token = getAuthToken();
        if (!token) {
            throw new Error('No authentication token available');
        }
        
        const response = await fetch(`/api/chat/conversation-participants/${conversationId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        
        console.log('API Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', response.status, errorText);
            throw new Error(`Failed to get conversation participants: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Participants API result:', data);
        
        if (!data.success) {
            throw new Error('Failed to get conversation participants');
        }
        
        // Find the other participant (not the current user)
        const currentUserId = parseInt(getCurrentUserId());
        const participants = data.participants || [];
        
        console.log('Current user ID:', currentUserId, 'All participants:', participants);
        
        const client = participants.find(p => p.user_id !== currentUserId);
        console.log('Found client:', client);
        
        if (!client) {
            throw new Error('Could not find other participant in this conversation');
        }
        
        return client.user_id;
        
    } catch (error) {
        console.error('Error getting client ID:', error);
        throw new Error(`Could not automatically determine client from conversation: ${error.message}`);
    }
}

/**
 * Get authentication token
 */
function getAuthToken() {
    // Try meta tag first
    const metaToken = document.querySelector('meta[name="auth-token"]')?.content;
    if (metaToken) return metaToken;
    
    // Try localStorage
    const localToken = localStorage.getItem('token');
    if (localToken) return localToken;
    
    return null;
}

/**
 * Get current user ID
 */
function getCurrentUserId() {
    // Try multiple sources for user ID
    const userIdElement = document.querySelector('[data-user-id]');
    if (userIdElement?.dataset.userId) {
        return userIdElement.dataset.userId;
    }
    
    // Try meta tag
    const userIdMeta = document.querySelector('meta[name="user-id"]');
    if (userIdMeta?.content) {
        return userIdMeta.content;
    }
    
    // Try global variable if available
    if (typeof window.currentUserId !== 'undefined') {
        return window.currentUserId;
    }
    
    console.error('Could not find user ID from any source');
    return null;
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    // Check if there's already a showToast function from chat-interface.js
    if (typeof window.showToast === 'function' && window.showToast !== showToast) {
        window.showToast(message, type);
        return;
    }
    
    // Simple fallback toast implementation
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 z-50 p-4 rounded-lg shadow-lg text-white max-w-sm ${
        type === 'success' ? 'bg-green-500' : 
        type === 'error' ? 'bg-red-500' : 
        'bg-blue-500'
    }`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.parentElement.removeChild(toast);
        }
    }, 3000);
}

/**
 * Initialize WebSocket connection for real-time quote updates
 */
function initWebSocketForQuotes() {
    // Use existing socket connection if available
    if (typeof io !== 'undefined') {
        socket = io();
        
        // Listen for quote-related events
        socket.on('quote_created', handleQuoteCreated);
        socket.on('quote_accepted', handleQuoteAccepted);
        socket.on('quote_declined', handleQuoteDeclined);
        socket.on('quote_paid', handleQuotePaid);
        socket.on('new_message', handleNewMessage);
        
        console.log('Quote WebSocket events initialized');
    } else {
        console.warn('Socket.io not available for quote updates');
    }
}

/**
 * Handle quote created event
 */
function handleQuoteCreated(data) {
    console.log('Quote created:', data);
    
    // Add quote message to chat
    if (data.message) {
        addQuoteMessageToChat(data.message, data.quote);
    }
    
    // Show notification
    showToast('Quote sent successfully!', 'success');
    
    // Close modal if open
    closeQuoteModalHandler();
}

/**
 * Handle quote accepted event
 */
function handleQuoteAccepted(data) {
    console.log('Quote accepted:', data);
    
    // Update quote status in UI
    updateQuoteStatus(data.quoteId, 'accepted');
    
    // Show notification
    showToast('Quote has been accepted!', 'success');
}

/**
 * Handle quote declined event
 */
function handleQuoteDeclined(data) {
    console.log('Quote declined:', data);
    
    // Update quote status in UI
    updateQuoteStatus(data.quoteId, 'declined');
    
    // Show notification
    showToast('Quote has been declined', 'info');
}

/**
 * Handle quote paid event
 */
function handleQuotePaid(data) {
    console.log('Quote paid:', data);
    
    // Update quote status in UI with enhanced refresh
    updateQuoteStatus(data.quoteId, 'paid');
    
    // Refresh the entire quote card to show payment completion state
    refreshQuoteCard(data.quoteId, 'paid');
    
    // Show notification for professional
    const userData = document.getElementById('current-user-data');
    const currentUserId = userData?.dataset.userId;
    
    if (currentUserId === data.professionalId) {
        showToast('Quote has been paid! 💰', 'success');
    } else {
        showToast('Payment completed successfully! ✅', 'success');
    }
    
    // Add visual celebration effect
    celebratePaymentSuccess(data.quoteId);
}

/**
 * Handle new message event (for quote-related messages)
 */
function handleNewMessage(data) {
    if (data.message_type === 'quote' || data.message_type === 'quote_accepted' || data.message_type === 'quote_declined') {
        // Let chat-interface.js handle the message display
        // We just need to ensure quote status is updated
        if (data.quote_id) {
            setTimeout(() => {
                updateQuoteStatusFromMessage(data);
            }, 100);
        }
    }
}

/**
 * Add quote message to chat interface
 */
function addQuoteMessageToChat(message, quote) {
    // Check if we're in the correct conversation
    const messageForm = document.getElementById('message-form');
    const conversationId = messageForm?.dataset.conversationId;
    
    if (conversationId && message.conversation_id == conversationId) {
        // Create message element
        const messageElement = createQuoteMessageElement(message, quote);
        
        // Add to messages container
        const messagesContainer = document.getElementById('messages-list') || 
                                 document.querySelector('.chat-messages') ||
                                 document.getElementById('chatMessages');
        
        if (messagesContainer) {
            messagesContainer.appendChild(messageElement);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }
}

/**
 * Create quote message element
 */
function createQuoteMessageElement(message, quote) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message outgoing quote-message';
    messageDiv.dataset.messageId = message.id;
    messageDiv.dataset.quoteId = quote.id;
    
    const userData = document.getElementById('current-user-data');
    const currentUserId = userData?.dataset.userId;
    const isProfessional = currentUserId == quote.professional_id;
    
    messageDiv.innerHTML = `
        <div class="message-wrapper">
            <div class="message-content">
                <div class="quote-header flex justify-between items-center mb-2">
                    <h4 class="font-semibold text-blue-600">📋 ${quote.title}</h4>
                    <span class="quote-status-badge ${quote.status} px-2 py-1 rounded text-sm font-medium" data-quote-id="${quote.id}">
                        ${getQuoteStatusText(quote.status, isProfessional)}
                    </span>
                </div>
                <div class="quote-details">
                    <p class="text-gray-700 dark:text-gray-300 mb-2">${quote.description}</p>
                    <div class="quote-amount mb-3">
                        <span class="font-bold text-lg text-green-600">£${parseFloat(quote.total_amount).toFixed(2)}</span>
                    </div>
                    ${getQuoteActions(quote, isProfessional)}
                </div>
            </div>
            <div class="message-time text-xs text-gray-500">${formatTimeSimple(message.created_at)}</div>
        </div>
    `;
    
    return messageDiv;
}

/**
 * Get quote status text based on user role
 */
function getQuoteStatusText(status, isProfessional) {
    const statusMap = {
        professional: {
            pending: 'Quote Sent',
            accepted: 'Quote Accepted',
            declined: 'Quote Declined',
            paid: 'Quote Paid ✅'
        },
        client: {
            pending: 'Quote Received',
            accepted: 'Payment Required',
            declined: 'Quote Declined',
            paid: 'Quote Paid ✅'
        }
    };
    
    return statusMap[isProfessional ? 'professional' : 'client'][status] || status;
}

/**
 * Get quote actions based on status and user role
 */
function getQuoteActions(quote, isProfessional) {
    if (quote.status === 'pending' && !isProfessional) {
        return `
            <div class="quote-actions mt-3 flex gap-2">
                <button onclick="acceptQuote('${quote.id}')" class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors">
                    Accept Quote
                </button>
                <button onclick="declineQuote('${quote.id}')" class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors">
                    Decline
                </button>
            </div>
        `;
    } else if (quote.status === 'accepted' && !isProfessional) {
        return `
            <div class="quote-actions mt-3">
                <button onclick="proceedToPayment('${quote.id}')" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
                    Proceed to Payment
                </button>
            </div>
        `;
    }
    return '';
}

/**
 * Update quote status in existing messages
 */
function updateQuoteStatus(quoteId, newStatus) {
    const quoteMessages = document.querySelectorAll(`[data-quote-id="${quoteId}"]`);
    
    quoteMessages.forEach(messageElement => {
        const statusBadge = messageElement.querySelector('.quote-status-badge');
        const userData = document.getElementById('current-user-data');
        const currentUserId = userData?.dataset.userId;
        
        // Determine if current user is professional
        const quoteMessage = messageElement.closest('.message');
        const isProfessional = quoteMessage?.classList.contains('outgoing');
        
        if (statusBadge) {
            statusBadge.textContent = getQuoteStatusText(newStatus, isProfessional);
            statusBadge.className = `quote-status-badge ${newStatus} px-2 py-1 rounded text-sm font-medium`;
        }
        
        // Update actions based on new status
        const actionsContainer = messageElement.querySelector('.quote-actions');
        if (actionsContainer) {
            const quote = { id: quoteId, status: newStatus };
            const newActions = getQuoteActions(quote, isProfessional);
            if (newActions) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = newActions;
                const newActionsContent = tempDiv.querySelector('.quote-actions');
                if (newActionsContent) {
                    actionsContainer.innerHTML = newActionsContent.innerHTML;
                }
            } else {
                actionsContainer.innerHTML = '';
            }
        }
    });
}

/**
 * Update quote status from message data
 */
function updateQuoteStatusFromMessage(messageData) {
    if (messageData.quote_id) {
        let status = 'pending';
        if (messageData.message_type === 'quote_accepted') status = 'accepted';
        if (messageData.message_type === 'quote_declined') status = 'declined';
        
        updateQuoteStatus(messageData.quote_id, status);
    }
}

/**
 * Accept quote function (called from action buttons)
 */
window.acceptQuote = async function(quoteId) {
    try {
        const token = getAuthToken();
        if (!token) {
            showToast('Authentication required', 'error');
            return;
        }

        const response = await fetch(`/api/quotes/${quoteId}/accept`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (result.success) {
            showToast('Quote accepted! Redirecting to payment...', 'success');
            
            // Redirect to payment or handle client secret
            if (result.clientSecret) {
                // Handle Stripe payment here
                handleStripePayment(result.clientSecret, result.paymentIntentId);
            }
        } else {
            showToast(result.error || 'Failed to accept quote', 'error');
        }
    } catch (error) {
        console.error('Error accepting quote:', error);
        showToast('Failed to accept quote', 'error');
    }
};

/**
 * Decline quote function (called from action buttons)
 */
window.declineQuote = async function(quoteId) {
    try {
        const token = getAuthToken();
        if (!token) {
            showToast('Authentication required', 'error');
            return;
        }

        const response = await fetch(`/api/quotes/${quoteId}/decline`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (result.success) {
            showToast('Quote declined', 'info');
        } else {
            showToast(result.error || 'Failed to decline quote', 'error');
        }
    } catch (error) {
        console.error('Error declining quote:', error);
        showToast('Failed to decline quote', 'error');
    }
};

/**
 * Refresh entire quote card on status change
 */
function refreshQuoteCard(quoteId, newStatus) {
    const quoteCards = document.querySelectorAll(`[data-quote-id="${quoteId}"]`);
    
    quoteCards.forEach(card => {
        // Add refresh animation
        card.style.transform = 'scale(0.98)';
        card.style.transition = 'transform 0.3s ease';
        
        setTimeout(() => {
            // Update the entire card classes and styling based on new status
            if (newStatus === 'paid') {
                card.classList.add('border-green-300', 'bg-gradient-to-r', 'from-green-50', 'to-emerald-50');
                card.classList.remove('from-blue-50', 'to-indigo-50', 'border-blue-200');
            }
            
            // Reset transform
            card.style.transform = 'scale(1)';
        }, 150);
    });
}

/**
 * Add celebration effect when payment is completed
 */
function celebratePaymentSuccess(quoteId) {
    const quoteCards = document.querySelectorAll(`[data-quote-id="${quoteId}"]`);
    
    quoteCards.forEach(card => {
        // Add celebration animation
        card.style.animation = 'pulse 0.6s ease-in-out 2';
        
        // Add confetti-like effect (simple version)
        const celebration = document.createElement('div');
        celebration.innerHTML = '🎉 💰 ✅';
        celebration.style.cssText = `
            position: absolute;
            top: -20px;
            right: -10px;
            font-size: 20px;
            animation: fadeInOut 2s ease-in-out;
            pointer-events: none;
            z-index: 1000;
        `;
        
        card.style.position = 'relative';
        card.appendChild(celebration);
        
        // Show real-time indicator
        const indicator = card.querySelector(`[data-quote-update="${quoteId}"]`);
        if (indicator) {
            indicator.classList.remove('hidden');
            indicator.innerHTML = '<span class="text-xs text-green-500"><i class="fas fa-check-circle"></i> Payment confirmed!</span>';
        }
        
        // Remove celebration after animation
        setTimeout(() => {
            if (celebration.parentNode) {
                celebration.parentNode.removeChild(celebration);
            }
            card.style.animation = '';
            
            // Hide indicator after a while
            if (indicator) {
                setTimeout(() => indicator.classList.add('hidden'), 3000);
            }
        }, 2000);
    });
    
    // Global celebration effect
    if (typeof showToast === 'function') {
        showToast('🎉 Payment celebration! The work can now begin!', 'success');
    }
}

/**
 * Proceed to payment function (enhanced version in chat-interface.js takes precedence)
 */
window.proceedToPayment = function(quoteId) {
    // Redirect to payment page or open payment modal
    window.location.href = `/payment/quote/${quoteId}`;
};

// Make celebratePaymentSuccess globally accessible
if (typeof window !== 'undefined') {
    window.celebratePaymentSuccess = celebratePaymentSuccess;
}

/**
 * Handle Stripe payment
 */
function handleStripePayment(clientSecret, paymentIntentId) {
    // This would integrate with Stripe Elements
    // For now, redirect to a payment page
    window.location.href = `/payment/stripe?client_secret=${clientSecret}&payment_intent=${paymentIntentId}`;
}

/**
 * Simple time formatter
 */
function formatTimeSimple(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Export functions for use in other scripts
window.QuoteFunctionality = {
    openQuoteModal,
    closeQuoteModalHandler,
    calculateQuoteTotal,
    updateQuoteStatus,
    handleQuoteCreated,
    handleQuoteAccepted,
    handleQuoteDeclined,
    handleQuotePaid
};
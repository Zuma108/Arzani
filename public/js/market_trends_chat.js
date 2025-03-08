class MarketTrendsChatManager {
    constructor() {
        this.initialize();
        this.chartContext = {
            currentTab: 'valuationChart',
            filters: {
                timeRange: document.getElementById('timeRange')?.value || '30',
                industry: document.getElementById('industryFilter')?.value || '',
                location: document.getElementById('locationFilter')?.value || ''
            }
        };
    }

    initialize() {
        this.inputField = document.getElementById('messageInput');
        this.sendButton = document.querySelector('.chat-input button');
        this.chatMessages = document.getElementById('chatMessages');

        this.bindEvents();
        
        // Listen for chart tab changes
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.chartContext.currentTab = btn.dataset.chart;
            });
        });
        
        // Listen for filter changes
        document.getElementById('timeRange')?.addEventListener('change', (e) => {
            this.chartContext.filters.timeRange = e.target.value;
        });
        
        document.getElementById('industryFilter')?.addEventListener('change', (e) => {
            this.chartContext.filters.industry = e.target.value;
        });
        
        document.getElementById('locationFilter')?.addEventListener('change', (e) => {
            this.chartContext.filters.location = e.target.value;
        });
    }

    bindEvents() {
        if (this.sendButton) {
            this.sendButton.onclick = () => this.sendMessage();
        }

        if (this.inputField) {
            this.inputField.onkeypress = (e) => {
                if (e.key === 'Enter') this.sendMessage();
            };
        }
    }

    async sendMessage() {
        if (!this.inputField) return;

        const message = this.inputField.value.trim();
        if (!message) return;

        // Store the user message
        const userMessage = message;
        
        // Clear input immediately
        this.inputField.value = '';

        try {
            // Add user message to chat
            this.appendMessage(userMessage, 'user');

            // Show single loading indicator
            const loadingMessage = this.appendMessage('...', 'assistant', true);
            
            const response = await fetch('/api/market/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'X-Chat-Instructions': 'Please provide responses without using asterisks (*) for emphasis or formatting.'
                },
                body: JSON.stringify({
                    question: userMessage,
                    context: this.chartContext, // Send current chart/filter context
                    instructions: 'Please provide responses without using asterisks (*) for emphasis or formatting.'
                })
            });

            // Remove loading indicator before adding response
            loadingMessage?.remove();

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            const data = await response.json();
            
            // Process response
            if (data.reply) {
                const cleanedReply = data.reply.replace(/\*/g, '');
                this.appendMessage(cleanedReply, 'assistant');
                
                // Handle assistant recommendations
                if (data.recommendations) {
                    this.processRecommendations(data.recommendations);
                }
            }

        } catch (error) {
            console.error('Error sending message:', error);
            this.appendMessage('Sorry, there was an error processing your request. Please try again.', 'assistant');
        }
    }
    
    // Process any recommendations returned from the AI
    processRecommendations(recommendations) {
        if (recommendations.switchChart) {
            // Find and click the tab for the recommended chart
            const tabBtn = document.querySelector(`.tab-btn[data-chart="${recommendations.switchChart}"]`);
            if (tabBtn) {
                tabBtn.click();
            }
        }
        
        if (recommendations.filters) {
            // Apply any recommended filter changes
            if (recommendations.filters.industry) {
                const industrySelect = document.getElementById('industryFilter');
                if (industrySelect) {
                    industrySelect.value = recommendations.filters.industry;
                    industrySelect.dispatchEvent(new Event('change'));
                }
            }
            
            if (recommendations.filters.timeRange) {
                const timeSelect = document.getElementById('timeRange');
                if (timeSelect) {
                    timeSelect.value = recommendations.filters.timeRange;
                    timeSelect.dispatchEvent(new Event('change'));
                }
            }
            
            if (recommendations.filters.location) {
                const locationSelect = document.getElementById('locationFilter');
                if (locationSelect) {
                    locationSelect.value = recommendations.filters.location;
                    locationSelect.dispatchEvent(new Event('change'));
                }
            }
        }
    }

    appendMessage(message, sender, isLoading = false) {
        if (!this.chatMessages) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}${isLoading ? ' loading' : ''}`;
        
        // Only adding the message content without the icon
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.textContent = message;
        messageDiv.appendChild(messageContent);

        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;

        return messageDiv;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.marketTrendsChat = new MarketTrendsChatManager();
});

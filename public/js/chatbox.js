(() => {
    class ChatManager {
        constructor() {
            // Initialize properties
            this.messageQueue = [];
            this.isConnected = false;

            // For database context caching
            this.marketplaceData = null;
            this.lastDataFetch = 0;
            // For example, refresh data every 5 minutes (300000 ms)
            this.DATA_REFRESH_INTERVAL = 300000;

            this.initialize();
            console.log('ChatManager initialized');
        }

        initialize() {
            // Get DOM elements
            this.inputField = document.getElementById('chatbox-input-field');
            this.sendButton = document.getElementById('send-message');
            this.assistantIcon = document.getElementById('assistant-icon');
            this.chatBox = document.getElementById('chat-box');
            this.closeChatButton = document.getElementById('close-chat');

            console.log('Elements found:', {
                inputField: this.inputField,
                sendButton: this.sendButton,
                assistantIcon: this.assistantIcon,
                chatBox: this.chatBox,
                closeChatButton: this.closeChatButton
            });

            // Set initial state
            if (this.chatBox) {
                this.chatBox.style.display = 'none';
            }

            // Bind event listeners and set up WebSocket
            this.bindEvents();
            this.setupWebSocket();
        }

        bindEvents() {
            if (this.assistantIcon) {
                console.log('Adding click event listener to assistant icon');
                this.assistantIcon.addEventListener('click', (e) => {
                    console.log('Assistant icon clicked');
                    e.preventDefault();
                    this.toggleChatBox();
                });
            } else {
                console.error('Assistant icon element not found');
            }

            if (this.closeChatButton) {
                console.log('Adding click event listener to close chat button');
                this.closeChatButton.addEventListener('click', (e) => {
                    console.log('Close chat button clicked');
                    e.preventDefault();
                    this.toggleChatBox();
                });
            } else {
                console.error('Close chat button element not found');
            }

            if (this.sendButton) {
                this.sendButton.onclick = () => this.sendMessage();
            }

            if (this.inputField) {
                this.inputField.onkeypress = (e) => {
                    if (e.key === 'Enter') this.sendMessage();
                };
            }
        }

        toggleChatBox() {
            if (!this.chatBox) return;
            console.log('Current display:', this.chatBox.style.display);

            if (this.chatBox.style.display === 'none') {
                this.chatBox.style.display = 'flex';
                this.chatBox.classList.remove('hidden');
                this.sendInitialMessages();
            } else {
                this.chatBox.style.display = 'none';
                this.chatBox.classList.add('hidden');
            }

            console.log('New display:', this.chatBox.style.display);
        }

        sendInitialMessages() {
            const initialMessages = [
                "Hey there!",
                "Need some help?",
                "To get started, let me know what you need help with."
            ];

            initialMessages.forEach(message => {
                this.appendMessage(message, 'assistant');
            });
        }

        setupWebSocket() {
            const connectWebSocket = () => {
                this.ws = new WebSocket('ws://localhost:5000');

                this.ws.onopen = () => {
                    this.isConnected = true;
                    console.log('WebSocket connected');
                };

                this.ws.onclose = () => {
                    this.isConnected = false;
                    console.log('WebSocket disconnected, attempting to reconnect...');
                    setTimeout(connectWebSocket, 3000);
                };

                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    this.isConnected = false;
                };

                this.ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.text) {
                            this.appendMessage(data.text, 'assistant');
                        }
                    } catch (error) {
                        console.error('Error processing message:', error);
                    }
                };
            };

            connectWebSocket();
        }

        // New method to fetch marketplace (database) data
        async fetchMarketplaceData() {
            const now = Date.now();
            // Use cached data if it was fetched recently
            if (this.marketplaceData && (now - this.lastDataFetch) < this.DATA_REFRESH_INTERVAL) {
                return this.marketplaceData;
            }

            try {
                const response = await fetch('/api/business/listings');
                if (!response.ok) {
                    throw new Error('Failed to fetch marketplace data');
                }
                const data = await response.json();
                this.marketplaceData = data;
                this.lastDataFetch = now;
                return data;
            } catch (error) {
                console.error('Error fetching marketplace data:', error);
                return null;
            }
        }

        async sendMessage() {
            if (!this.inputField) return;

            const message = this.inputField.value.trim();
            if (!message) return;

            // Clear input field immediately
            this.inputField.value = '';

            try {
                // Show loading indicator with three dots animation
                const loadingDots = this.appendMessage('...', 'assistant', true);
                if (loadingDots) {
                    loadingDots.classList.add('typing-animation');
                }

                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        question: message
                    })
                });

                // Remove loading indicator
                if (loadingDots) {
                    loadingDots.remove();
                }

                if (!response.ok) {
                    throw new Error('Failed to send message');
                }

                const data = await response.json();
                
                // Only show the assistant's reply
                if (data.reply) {
                    this.appendMessage(data.reply, 'assistant');
                }

            } catch (error) {
                console.error('Error sending message:', error);
                this.appendMessage('Sorry, there was an error processing your request. Please try again.', 'assistant');
            }
        }

        appendMessage(message, sender, isLoading = false) {
            if (!this.chatBox) return;

            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${sender}${isLoading ? ' loading' : ''}`;
            
            if (sender === 'assistant') {
                const icon = document.createElement('img');
                icon.src = '/images/talk-to-azani-icon.png';
                icon.alt = 'Arzani';
                icon.className = 'assistant-icon';
                messageDiv.appendChild(icon);
            }

            const messageContent = document.createElement('div');
            messageContent.className = 'message-content';
            messageContent.textContent = message;
            messageDiv.appendChild(messageContent);

            const messagesContainer = document.getElementById('chat-messages');
            if (messagesContainer) {
                messagesContainer.appendChild(messageDiv);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }
    }

    // Initialize only once when DOM is loaded
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.chatManager) {
            window.chatManager = new ChatManager();
        }
    });
})();
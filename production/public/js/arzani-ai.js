/**
 * Arzani AI Chat Interface with Sequential Agent Delegation
 * Integrates with the A2A Chat Adapter and Sequential Agent UI
 */
class ArzaniAI {
  constructor() {
    this.chatAdapter = null;
    this.sequentialUI = null;
    this.isInitialized = false;
    this.chatMessages = document.getElementById('chatMessages');
    this.userMessageInput = document.getElementById('userMessage');
    this.sendButton = document.getElementById('sendMessage');
    this.typingIndicator = document.getElementById('typingIndicator');
    
    this.init();
  }

  /**
   * Initialize the Arzani AI system
   */
  init() {
    if (this.isInitialized) return;
    
    try {
      // Initialize A2A Chat Adapter
      this.chatAdapter = new A2AChatAdapter('http://localhost:8001/api/v1', 'orchestrator', {
        onMessage: this.handleMessage.bind(this),
        onError: this.handleError.bind(this),
        onComplete: this.handleComplete.bind(this),
        onSequentialStart: this.handleSequentialStart.bind(this),
        onSequentialStep: this.handleSequentialStep.bind(this),
        onSequentialComplete: this.handleSequentialComplete.bind(this)
      });

      // Initialize Sequential Agent UI
      this.sequentialUI = new SequentialAgentUI(this.chatMessages);

      // Set up event listeners
      this.setupEventListeners();
      
      this.isInitialized = true;
      console.log('Arzani AI initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Arzani AI:', error);
      this.handleError('Failed to initialize AI system', error);
    }
  }

  /**
   * Set up event listeners for UI interactions
   */
  setupEventListeners() {
    // Send message button
    if (this.sendButton) {
      this.sendButton.addEventListener('click', () => this.sendMessage());
    }

    // Enter key to send message
    if (this.userMessageInput) {
      this.userMessageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });

      // Auto-resize textarea
      this.userMessageInput.addEventListener('input', this.autoResizeTextarea.bind(this));
    }

    // Tab switching
    const tabButtons = document.querySelectorAll('#aiInteractionTabs button[data-bs-toggle="tab"]');
    tabButtons.forEach(button => {
      button.addEventListener('shown.bs.tab', (e) => {
        if (e.target.id === 'chat-tab') {
          // Focus on chat input when chat tab is shown
          if (this.userMessageInput) {
            this.userMessageInput.focus();
          }
        }
      });
    });
  }

  /**
   * Send a message to the AI system
   */
  async sendMessage() {
    if (!this.chatAdapter || !this.userMessageInput) return;

    const message = this.userMessageInput.value.trim();
    if (!message) return;

    // Disable input while processing
    this.setInputEnabled(false);
    
    // Clear input
    this.userMessageInput.value = '';
    this.autoResizeTextarea();

    // Add user message to chat
    this.addUserMessage(message);

    try {
      // Send message to orchestrator with sequential processing
      await this.chatAdapter.sendMessage(message, {
        agentId: 'orchestrator',
        stream: true,
        sequential: true,
        context: this.buildContext()
      });
    } catch (error) {
      console.error('Error sending message:', error);
      this.handleError('Failed to send message', error);
      this.setInputEnabled(true);
    }
  }

  /**
   * Build context for the AI conversation
   */
  buildContext() {
    return {
      userInterface: 'arzani-ai-chat',
      timestamp: new Date().toISOString(),
      sessionId: this.generateSessionId(),
      capabilities: ['business-valuation', 'legal-advice', 'financial-guidance', 'broker-services']
    };
  }

  /**
   * Generate a session ID for tracking
   */
  generateSessionId() {
    return 'arzani_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Add user message to the chat interface
   */
  addUserMessage(message) {
    if (!this.chatMessages) return;

    const messageEl = document.createElement('div');
    messageEl.className = 'message user';
    messageEl.innerHTML = `
      <div class="message-content ms-auto">
        <div class="mb-1 text-end">
          <span class="fw-medium text-light">You</span>
        </div>
        <p class="mb-0">${this.escapeHtml(message)}</p>
      </div>
      <div class="user-avatar ms-3">
        <i class="bi bi-person-circle"></i>
      </div>
    `;

    this.chatMessages.appendChild(messageEl);
    this.scrollToBottom();
  }

  /**
   * Handle incoming message from agents
   */
  handleMessage(message, metadata) {
    console.log('Received message:', message, metadata);
    
    // If this is part of a sequential process, let the sequential UI handle it
    if (metadata && metadata.isSequential) {
      return; // Sequential UI will handle this
    }

    // Handle regular single-agent response
    this.addAgentMessage(message, metadata?.agentType || 'generalist');
    this.hideTypingIndicator();
    this.setInputEnabled(true);
  }

  /**
   * Handle sequential delegation start
   */
  handleSequentialStart(metadata) {
    console.log('Sequential delegation started:', metadata);
    this.showTypingIndicator();
    
    if (this.sequentialUI) {
      this.sequentialUI.startSequence(metadata);
    }
  }

  /**
   * Handle sequential step update
   */
  handleSequentialStep(stepData, metadata) {
    console.log('Sequential step update:', stepData, metadata);
    
    if (this.sequentialUI) {
      this.sequentialUI.updateStep(stepData, metadata);
    }
  }

  /**
   * Handle sequential delegation complete
   */
  handleSequentialComplete(finalResponse, metadata) {
    console.log('Sequential delegation complete:', finalResponse, metadata);
    
    this.hideTypingIndicator();
    this.setInputEnabled(true);
    
    if (this.sequentialUI) {
      this.sequentialUI.completeSequence(finalResponse, metadata);
    }
  }

  /**
   * Handle completion of agent task
   */
  handleComplete(result, metadata) {
    console.log('Task completed:', result, metadata);
    this.hideTypingIndicator();
    this.setInputEnabled(true);
  }

  /**
   * Handle errors
   */
  handleError(message, error) {
    console.error('Arzani AI Error:', message, error);
    
    this.hideTypingIndicator();
    this.setInputEnabled(true);
    
    // Add error message to chat
    this.addSystemMessage('I apologize, but I encountered an error. Please try again.', 'error');
  }

  /**
   * Add agent message to chat
   */
  addAgentMessage(message, agentType = 'generalist') {
    if (!this.chatMessages) return;

    const agentConfig = this.getAgentConfig(agentType);
    const messageEl = document.createElement('div');
    messageEl.className = 'message ai';
    messageEl.innerHTML = `
      <div class="agent-avatar ${agentType}-agent me-3">
        <i class="${agentConfig.icon}"></i>
      </div>
      <div class="message-content">
        <div class="mb-1">
          <span class="fw-medium text-light">${agentConfig.name}</span>
          <span class="agent-chip ${agentType}-chip">${agentConfig.label}</span>
        </div>
        <p class="mb-0">${this.formatMessage(message)}</p>
      </div>
    `;

    this.chatMessages.appendChild(messageEl);
    this.scrollToBottom();
  }

  /**
   * Add system message to chat
   */
  addSystemMessage(message, type = 'info') {
    if (!this.chatMessages) return;

    const messageEl = document.createElement('div');
    messageEl.className = `message system ${type}`;
    messageEl.innerHTML = `
      <div class="system-content mx-auto text-center">
        <p class="mb-0 text-secondary">${this.escapeHtml(message)}</p>
      </div>
    `;

    this.chatMessages.appendChild(messageEl);
    this.scrollToBottom();
  }

  /**
   * Get agent configuration
   */
  getAgentConfig(agentType) {
    const configs = {
      generalist: {
        name: 'Arzani Assistant',
        label: 'Generalist',
        icon: 'bi bi-robot'
      },
      broker: {
        name: 'Broker Agent',
        label: 'Broker',
        icon: 'bi bi-building'
      },
      legal: {
        name: 'Legal Agent',
        label: 'Legal',
        icon: 'bi bi-file-text'
      },
      finance: {
        name: 'Finance Agent',
        label: 'Finance',
        icon: 'bi bi-cash-coin'
      }
    };

    return configs[agentType] || configs.generalist;
  }

  /**
   * Show typing indicator
   */
  showTypingIndicator() {
    if (this.typingIndicator) {
      this.typingIndicator.classList.remove('d-none');
      this.scrollToBottom();
    }
  }

  /**
   * Hide typing indicator
   */
  hideTypingIndicator() {
    if (this.typingIndicator) {
      this.typingIndicator.classList.add('d-none');
    }
  }

  /**
   * Enable/disable input controls
   */
  setInputEnabled(enabled) {
    if (this.userMessageInput) {
      this.userMessageInput.disabled = !enabled;
    }
    if (this.sendButton) {
      this.sendButton.disabled = !enabled;
    }
  }

  /**
   * Auto-resize textarea based on content
   */
  autoResizeTextarea() {
    if (!this.userMessageInput) return;
    
    this.userMessageInput.style.height = 'auto';
    this.userMessageInput.style.height = this.userMessageInput.scrollHeight + 'px';
  }

  /**
   * Scroll chat to bottom
   */
  scrollToBottom() {
    if (this.chatMessages) {
      this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
  }

  /**
   * Format message content
   */
  formatMessage(message) {
    if (!message) return '';
    
    // Basic formatting for markdown-like syntax
    return this.escapeHtml(message)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize Arzani AI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Wait a bit to ensure all scripts are loaded
  setTimeout(() => {
    if (typeof A2AChatAdapter !== 'undefined' && typeof SequentialAgentUI !== 'undefined') {
      window.arzaniAI = new ArzaniAI();
    } else {
      console.error('Required dependencies not loaded. Retrying...');
      // Retry after a delay
      setTimeout(() => {
        if (typeof A2AChatAdapter !== 'undefined' && typeof SequentialAgentUI !== 'undefined') {
          window.arzaniAI = new ArzaniAI();
        } else {
          console.error('Failed to load Arzani AI dependencies');
        }
      }, 1000);
    }
  }, 100);
});

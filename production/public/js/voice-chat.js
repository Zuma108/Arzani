/**
 * Voice Chat Integration
 * Uses WebSocket to handle voice recognition and AI responses
 */

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', initVoiceChat);

// Global variables
let isListening = false;
let recognition = null;
let voiceSocket = null;

/**
 * Initialize voice chat functionality
 */
function initVoiceChat() {
  console.log('Initializing voice chat...');
  
  // Get DOM elements
  const voiceButton = document.getElementById('voice-button');
  const responseContainer = document.getElementById('voice-response');
  
  // Initialize WebSocket connection using the WebSocketManager
  if (window.WebSocketManager) {
    voiceSocket = new window.WebSocketManager();
    
    // Set up message handler
    voiceSocket.on('message', handleSocketMessage);
    
    // Connect to server
    voiceSocket.connect();
  } else {
    console.error('WebSocketManager not found. Make sure websocket-utils.js is loaded');
    if (responseContainer) {
      responseContainer.innerHTML = '<div class="error">Voice chat unavailable. Please refresh the page.</div>';
    }
    return;
  }
  
  // Initialize speech recognition if available
  initSpeechRecognition();
  
  // Set up voice button if present
  if (voiceButton) {
    voiceButton.addEventListener('click', toggleVoiceRecognition);
  }
}

/**
 * Initialize speech recognition
 */
function initSpeechRecognition() {
  // Check for browser support
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    console.warn('Speech recognition not supported in this browser');
    return;
  }
  
  // Create recognition object
  recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  
  // Configure recognition
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-GB'; // Set to British English for the UK marketplace
  
  // Set up event handlers
  recognition.onresult = handleSpeechResult;
  recognition.onerror = handleSpeechError;
  recognition.onend = handleSpeechEnd;
}

/**
 * Toggle voice recognition on/off
 */
function toggleVoiceRecognition() {
  const voiceButton = document.getElementById('voice-button');
  
  if (isListening) {
    // Stop listening
    if (recognition) {
      recognition.stop();
    }
    isListening = false;
    
    // Update UI
    if (voiceButton) {
      voiceButton.classList.remove('active');
      voiceButton.innerHTML = '<i class="fas fa-microphone"></i> Speak';
    }
  } else {
    // Start listening
    if (recognition) {
      try {
        recognition.start();
        isListening = true;
        
        // Update UI
        if (voiceButton) {
          voiceButton.classList.add('active');
          voiceButton.innerHTML = '<i class="fas fa-microphone-slash"></i> Stop';
        }
        
        // Show listening indicator
        const responseContainer = document.getElementById('voice-response');
        if (responseContainer) {
          responseContainer.innerHTML = '<div class="listening">Listening...</div>';
        }
      } catch (error) {
        console.error('Error starting voice recognition:', error);
      }
    } else {
      console.warn('Speech recognition not initialized');
    }
  }
}

/**
 * Handle speech recognition results
 * @param {Event} event - Recognition event
 */
function handleSpeechResult(event) {
  if (event.results.length > 0) {
    const transcript = event.results[0][0].transcript;
    console.log('Recognized speech:', transcript);
    
    // Show the transcript
    const responseContainer = document.getElementById('voice-response');
    if (responseContainer) {
      responseContainer.innerHTML = `<div class="query">You: ${transcript}</div><div class="thinking">Arzani is thinking...</div>`;
    }
    
    // Send to server via WebSocket if connected
    if (voiceSocket && voiceSocket.isConnected()) {
      voiceSocket.send({
        type: 'voice',
        text: transcript
      });
    } else {
      console.error('WebSocket not connected');
      if (responseContainer) {
        responseContainer.innerHTML += '<div class="error">Connection error. Please try again.</div>';
      }
    }
  }
}

/**
 * Handle speech recognition errors
 * @param {Event} event - Error event
 */
function handleSpeechError(event) {
  console.error('Speech recognition error:', event.error);
  
  // Update UI
  const responseContainer = document.getElementById('voice-response');
  if (responseContainer) {
    responseContainer.innerHTML = `<div class="error">Error: ${event.error}</div>`;
  }
  
  // Reset state
  isListening = false;
  
  // Update button
  const voiceButton = document.getElementById('voice-button');
  if (voiceButton) {
    voiceButton.classList.remove('active');
    voiceButton.innerHTML = '<i class="fas fa-microphone"></i> Speak';
  }
}

/**
 * Handle speech recognition end
 */
function handleSpeechEnd() {
  // Reset state if we're still supposed to be listening
  if (isListening) {
    isListening = false;
    
    // Update button
    const voiceButton = document.getElementById('voice-button');
    if (voiceButton) {
      voiceButton.classList.remove('active');
      voiceButton.innerHTML = '<i class="fas fa-microphone"></i> Speak';
    }
  }
}

/**
 * Handle incoming WebSocket messages
 * @param {Object} data - Parsed message data
 */
function handleSocketMessage(data) {
  console.log('Received socket message:', data);
  
  const responseContainer = document.getElementById('voice-response');
  if (!responseContainer) return;
  
  if (data.type === 'voice_response') {
    // Format and display AI response
    responseContainer.innerHTML = `
      <div class="query">You: ${data.query || 'Your question'}</div>
      <div class="response">
        <div class="response-header">
          <img src="/images/logo-small.png" alt="Arzani" class="ai-avatar">
          <span>Arzani</span>
        </div>
        <div class="response-content">${data.text}</div>
      </div>
    `;
  } else if (data.type === 'error') {
    // Display error message
    responseContainer.innerHTML = `<div class="error">Error: ${data.message || 'Unknown error'}</div>`;
  } else if (data.text) {
    // Simple text message
    responseContainer.innerHTML = `<div class="response">${data.text}</div>`;
  }
}

// Expose functions globally for HTML attribute usage
window.toggleVoiceRecognition = toggleVoiceRecognition;
/**
 * Chat Interface JavaScript
 * Handles the interactive elements of the chat interface
 */

document.addEventListener('DOMContentLoaded', function() {
  // Log debug info about user authentication
  console.log('Chat Interface Initialized:', {
    hasToken: !!localStorage.getItem('token'),
    hasAuthMeta: !!document.querySelector('meta[name="auth-token"]')?.content,
    profilePicture: document.querySelector('.profile-picture, .avatar-image')?.src,
    userObject: window.chatUser || 'Not available' 
  });

  // Initialize authentication and user data
  initAuth();
  
  // Initialize UI components
  initUI();
  
  // Quill editor setup for rich text messaging
  initEditor();
  
  // WebSocket connection for real-time messaging
  initWebSocket();
  
  // Voice message recording functionality
  initVoiceRecording();
  
  // Add action handlers to buttons
  initButtonHandlers();
});

// Authentication initialization - ENHANCED
function initAuth() {
  // Get token from multiple sources
  const token = localStorage.getItem('token') || 
                document.querySelector('meta[name="auth-token"]')?.content;
  
  // Store token in global variable for debugging
  window.authToken = token;
  
  // If token exists, update cookie for server auth
  if (token) {
    console.log('Found auth token, setting cookie for server auth');
    document.cookie = `token=${token}; path=/; max-age=14400`; // 4 hours
    
    // Set token in localStorage if it came from meta tag
    if (!localStorage.getItem('token') && document.querySelector('meta[name="auth-token"]')?.content) {
      localStorage.setItem('token', document.querySelector('meta[name="auth-token"]').content);
      console.log('Stored token from meta tag to localStorage');
    }
    
    // Add token to all fetch requests
    const originalFetch = window.fetch;
    window.fetch = function(url, options = {}) {
      options = options || {};
      options.headers = options.headers || {};
      
      if (!options.headers['Authorization'] && token) {
        options.headers['Authorization'] = `Bearer ${token}`;
      }
      
      return originalFetch(url, options);
    };
    
    // Verify token and fetch current user data
    fetchUserProfile(token);
  } else {
    console.log('Using chat interface in guest mode (no token)');
    addGuestModeIndicator();
  }
  
  // Handle logout (using event delegation for better reliability)
  document.addEventListener('click', function(e) {
    if (e.target.closest('#logoutBtn')) {
      e.preventDefault();
      handleLogout(token);
    }
  });
}

// Fetch user profile data
function fetchUserProfile(token) {
  if (!token) return;
  
  fetch('/api/profile', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to fetch profile');
    }
    return response.json();
  })
  .then(data => {
    if (data.success && data.profile) {
      console.log('Fetched user profile:', data.profile);
      updateProfileUI(data.profile);
    }
  })
  .catch(error => {
    console.error('Error fetching profile:', error);
  });
}

// Update UI with user profile data
function updateProfileUI(profile) {
  // Function to properly handle profile picture URL formatting
  function getProfilePictureUrl(url) {
    if (!url) return '/images/default-profile.png';
    // If URL is already a full URL (starts with http), return as is
    if (url.startsWith('http')) return url;
    // If URL is a relative path starting with /uploads, it's a local file
    if (url.startsWith('/uploads/')) return url;
    // If URL doesn't have a path prefix, assume it's in the uploads directory
    if (!url.startsWith('/')) return `/uploads/${url}`;
    // If none of the above, return the URL as is
    return url;
  }

  // Update profile picture if found
  const profilePicElements = document.querySelectorAll('.profile-picture, .avatar-image, [data-user-avatar]');
  if (profile.profile_picture && profilePicElements.length > 0) {
    const profilePicUrl = getProfilePictureUrl(profile.profile_picture);
    
    profilePicElements.forEach(element => {
      // Skip elements that previously had failed loads
      if (window.failedImages && window.failedImages.has(profilePicUrl)) {
        element.src = '/images/default-profile.png';
        return;
      }
      
      // Set original source for reference
      element.setAttribute('data-original-src', profilePicUrl);
      element.src = profilePicUrl;
      
      // Add error handling
      if (!element.onerror) {
        element.onerror = function() {
          this.onerror = null; // Prevent infinite loops
          this.src = '/images/default-profile.png';
          
          // Mark this image URL as failed
          if (typeof markImageAsFailed === 'function') {
            markImageAsFailed(this);
          } else if (window.failedImages) {
            window.failedImages.add(profilePicUrl);
          } else {
            // Create failedImages Set if it doesn't exist
            window.failedImages = new Set([profilePicUrl]);
          }
        };
      }
    });
  }
  
  // Update username if element exists
  const usernameElements = document.querySelectorAll('[data-user-name]');
  if (profile.username && usernameElements.length > 0) {
    usernameElements.forEach(element => {
      element.textContent = profile.username;
    });
  }
  
  // Update online status
  const statusElements = document.querySelectorAll('.user-status');
  if (profile.last_active && statusElements.length > 0) {
    const lastActive = new Date(profile.last_active);
    const now = new Date();
    const minutesAgo = Math.floor((now - lastActive) / (1000 * 60));
    
    statusElements.forEach(element => {
      if (minutesAgo < 5) {
        element.textContent = 'Online';
        element.classList.add('online');
        element.classList.remove('offline');
      } else {
        if (minutesAgo < 60) {
          element.textContent = `Last seen ${minutesAgo} min ago`;
        } else if (minutesAgo < 24 * 60) {
          element.textContent = `Last seen ${Math.floor(minutesAgo / 60)} hours ago`;
        } else {
          element.textContent = `Last seen on ${lastActive.toLocaleDateString()}`;
        }
        element.classList.add('offline');
        element.classList.remove('online');
      }
    });
  }
}

// Add guest mode indicator
function addGuestModeIndicator() {
  const chatLayout = document.querySelector('.chat-layout');
  if (!chatLayout) return;
  
  const indicator = document.createElement('div');
  indicator.className = 'guest-mode-indicator';
  indicator.style.cssText = 'position:fixed;top:70px;right:15px;background:#f8d7da;color:#721c24;padding:6px 12px;border-radius:4px;font-size:12px;z-index:1000;';
  indicator.innerHTML = '<i class="fas fa-user-clock"></i> Guest Mode - <a href="/login2?returnTo=/chat-interface" style="color:#721c24;text-decoration:underline;">Sign in</a>';
  chatLayout.appendChild(indicator);
}

// Handle logout
function handleLogout(token) {
  fetch('/auth/logout', {
    method: 'POST',
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    }
  })
  .then(response => response.json())
  .then(data => {
    // Regardless of response, clear tokens and redirect
    localStorage.removeItem('token');
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    window.location.href = '/login2?returnTo=/chat-interface';
  })
  .catch(error => {
    console.error('Logout error:', error);
    // Clear token and redirect anyway
    localStorage.removeItem('token');
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    window.location.href = '/login2?returnTo=/chat-interface';
  });
}

// UI components initialization
function initUI() {
  // User menu dropdown toggle (using event delegation)
  document.addEventListener('click', function(event) {
    const userMenuButton = event.target.closest('#userMenuButton');
    if (userMenuButton) {
      const userDropdown = document.getElementById('userDropdown');
      if (userDropdown) {
        userDropdown.classList.toggle('hidden');
        event.stopPropagation();
      }
    } else if (!event.target.closest('#userDropdown')) {
      // Close dropdown when clicking outside
      const userDropdown = document.getElementById('userDropdown');
      if (userDropdown && !userDropdown.classList.contains('hidden')) {
        userDropdown.classList.add('hidden');
      }
    }
  });
  
  // Initialize other UI components
  initSidebar();
  initMessageActions();
  initEmojiPicker();
}

// Initialize sidebar functionality using event delegation
function initSidebar() {
  // Mobile sidebar toggle
  document.addEventListener('click', function(event) {
    // Sidebar toggle button
    if (event.target.closest('#sidebarToggle')) {
      const chatSidebar = document.getElementById('chatSidebar');
      const mobileOverlay = document.getElementById('mobileOverlay');
      
      if (chatSidebar && mobileOverlay) {
        chatSidebar.classList.toggle('-translate-x-full');
        mobileOverlay.classList.toggle('hidden');
      }
    }
    
    // Mobile overlay click
    if (event.target.closest('#mobileOverlay')) {
      const chatSidebar = document.getElementById('chatSidebar');
      const mobileOverlay = document.getElementById('mobileOverlay');
      
      if (chatSidebar && mobileOverlay) {
        chatSidebar.classList.add('-translate-x-full');
        mobileOverlay.classList.add('hidden');
      }
    }
    
    // Info sidebar toggle
    if (event.target.closest('#infoSidebarToggle')) {
      const chatInfoSidebar = document.getElementById('chatInfoSidebar');
      
      if (chatInfoSidebar) {
        chatInfoSidebar.classList.toggle('w-0');
        chatInfoSidebar.classList.toggle('lg:w-72');
      }
    }
    
    // Close info sidebar
    if (event.target.closest('#closeInfoSidebar')) {
      const chatInfoSidebar = document.getElementById('chatInfoSidebar');
      
      if (chatInfoSidebar) {
        chatInfoSidebar.classList.add('w-0');
        chatInfoSidebar.classList.remove('lg:w-72');
      }
    }
  });
}

// Initialize rich text editor with Quill
function initEditor() {
  const editorContainer = document.getElementById('editor-container');
  const sendMessageBtn = document.getElementById('sendMessageBtn');
  
  if (!editorContainer) return;
  
  try {
    // Initialize Quill editor
    const quill = new Quill(editorContainer, {
      theme: 'snow',
      placeholder: 'Type a message...',
      modules: {
        toolbar: false
      }
    });
    
    // Store quill instance for global access
    window.chatQuill = quill;
    
    // Enable send button when text is entered
    quill.on('text-change', function() {
      if (sendMessageBtn) {
        const text = quill.getText().trim();
        sendMessageBtn.disabled = text.length === 0;
      }
    });
    
    // Handle enter key to send message
    editorContainer.querySelector('.ql-editor').addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (sendMessageBtn && !sendMessageBtn.disabled) {
          sendMessageBtn.click();
        }
      }
    });
    
    // Format buttons
    document.querySelectorAll('.format-btn').forEach(button => {
      button.addEventListener('click', function() {
        const format = this.getAttribute('data-format');
        
        switch(format) {
          case 'bold':
            quill.format('bold', !quill.getFormat().bold);
            break;
          case 'italic':
            quill.format('italic', !quill.getFormat().italic);
            break;
          case 'underline':
            quill.format('underline', !quill.getFormat().underline);
            break;
          case 'link':
            const selection = quill.getSelection();
            if (selection) {
              const url = prompt('Enter URL:');
              if (url) {
                quill.format('link', url);
              }
            }
            break;
          case 'list':
            quill.format('list', 'bullet');
            break;
        }
      });
    });
  } catch (error) {
    console.error('Error initializing Quill editor:', error);
  }
}

// Initialize WebSocket connection for real-time messaging
function initWebSocket() {
  // Skip if WebSocket is already initialized
  if (window.chatSocket) return;
  
  try {
    // Create WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;
    
    const socket = new WebSocket(wsUrl);
    
    // Connection opened
    socket.addEventListener('open', function(event) {
      console.log('WebSocket connected');
      
      // Send authentication message if token exists
      const token = localStorage.getItem('token');
      if (token) {
        socket.send(JSON.stringify({
          type: 'auth',
          token: token
        }));
      }
    });
    
    // Listen for messages
    socket.addEventListener('message', function(event) {
      try {
        const data = JSON.parse(event.data);
        
        // Handle different message types
        switch(data.type) {
          case 'message':
            addMessageToUI(data.message);
            break;
          case 'status':
            updateUserStatus(data.userId, data.status);
            break;
          case 'error':
            console.error('WebSocket error:', data.message);
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });
    
    // Connection closed
    socket.addEventListener('close', function(event) {
      console.log('WebSocket disconnected');
      
      // Attempt to reconnect after 5 seconds
      setTimeout(initWebSocket, 5000);
    });
    
    // Store socket for later use
    window.chatSocket = socket;
  } catch (error) {
    console.error('Error initializing WebSocket:', error);
  }
}

// Initialize voice recording functionality
function initVoiceRecording() {
  const recordButton = document.querySelector('button[title="Record voice message"]');
  const voiceRecordingUI = document.getElementById('voiceRecordingUI');
  const cancelRecordingBtn = document.getElementById('cancelRecordingBtn');
  const stopRecordingBtn = document.getElementById('stopRecordingBtn');
  
  if (!recordButton || !voiceRecordingUI) return;
  
  let mediaRecorder;
  let audioChunks = [];
  let recordingTimer;
  let recordingTime = 0;
  
  // Record button click handler
  recordButton.addEventListener('click', function() {
    // Request microphone access
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        // Show recording UI
        voiceRecordingUI.classList.remove('hidden');
        
        // Create media recorder
        mediaRecorder = new MediaRecorder(stream);
        
        // Start recording
        mediaRecorder.start();
        
        // Start timer
        recordingTimer = setInterval(updateRecordingTime, 1000);
        
        // Collect audio chunks
        mediaRecorder.addEventListener('dataavailable', function(event) {
          audioChunks.push(event.data);
        });
        
        // Recording stopped
        mediaRecorder.addEventListener('stop', function() {
          // Reset UI
          voiceRecordingUI.classList.add('hidden');
          clearInterval(recordingTimer);
          recordingTime = 0;
          
          // Reset timer display
          document.querySelector('.recording-time').textContent = '00:00';
          
          // Create audio blob
          const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
          
          // Send audio
          sendVoiceMessage(audioBlob);
          
          // Reset chunks
          audioChunks = [];
          
          // Stop all tracks
          stream.getTracks().forEach(track => track.stop());
        });
      })
      .catch(error => {
        console.error('Error accessing microphone:', error);
        alert('Could not access microphone. Please check your browser permissions.');
      });
  });
  
  // Cancel recording button
  cancelRecordingBtn.addEventListener('click', function() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      audioChunks = [];
    }
  });
  
  // Stop recording button
  stopRecordingBtn.addEventListener('click', function() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
  });
  
  // Update recording time display
  function updateRecordingTime() {
    recordingTime++;
    const minutes = Math.floor(recordingTime / 60).toString().padStart(2, '0');
    const seconds = (recordingTime % 60).toString().padStart(2, '0');
    document.querySelector('.recording-time').textContent = `${minutes}:${seconds}`;
  }
  
  // Send voice message to server
  function sendVoiceMessage(audioBlob) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'voice-message.wav');
    
    fetch('/api/chat/send-voice', {
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        console.log('Voice message sent successfully');
      } else {
        throw new Error(data.message || 'Failed to send voice message');
      }
    })
    .catch(error => {
      console.error('Error sending voice message:', error);
    });
  }
}

// Initialize message actions (reply, react, etc.)
function initMessageActions() {
  // Use event delegation for message actions
  document.addEventListener('click', function(event) {
    // Reply button
    if (event.target.closest('.reply-btn')) {
      const messageElement = event.target.closest('.message');
      if (messageElement) {
        const messageId = messageElement.getAttribute('data-message-id');
        const messageContent = messageElement.querySelector('.message-content').textContent;
        const messageSender = messageElement.classList.contains('outgoing') ? 'You' : 'John';
        
        // Set up reply UI
        document.getElementById('replyContainer').classList.remove('hidden');
        document.querySelector('.reply-author').textContent = messageSender;
        document.querySelector('.reply-text').textContent = messageContent;
        
        // Store message ID for reply
        document.getElementById('replyContainer').setAttribute('data-reply-to', messageId);
      }
    }
    
    // Cancel reply button
    if (event.target.closest('.cancel-reply')) {
      document.getElementById('replyContainer').classList.add('hidden');
      document.getElementById('replyContainer').removeAttribute('data-reply-to');
    }
    
    // React button
    if (event.target.closest('.react-btn')) {
      const messageElement = event.target.closest('.message');
      if (messageElement) {
        const messageId = messageElement.getAttribute('data-message-id');
        
        // Position reaction picker relative to the clicked button
        const button = event.target.closest('.react-btn');
        const reactionPicker = document.getElementById('reactionPicker');
        
        const buttonRect = button.getBoundingClientRect();
        reactionPicker.style.top = `${buttonRect.top - reactionPicker.offsetHeight - 5}px`;
        reactionPicker.style.left = `${buttonRect.left - (reactionPicker.offsetWidth / 2) + (button.offsetWidth / 2)}px`;
        
        // Show reaction picker
        reactionPicker.classList.remove('hidden');
        
        // Store message ID for reaction
        reactionPicker.setAttribute('data-message-id', messageId);
      }
    }
    
    // Reaction picker options
    if (event.target.closest('.reaction-btn')) {
      const reactionPicker = document.getElementById('reactionPicker');
      const messageId = reactionPicker.getAttribute('data-message-id');
      const reaction = event.target.closest('.reaction-btn').getAttribute('data-reaction');
      
      if (messageId && reaction) {
        // Handle custom reaction
        if (reaction === 'custom') {
          const customReaction = prompt('Enter a custom emoji:');
          if (customReaction) {
            sendReaction(messageId, customReaction);
          }
        } else {
          sendReaction(messageId, reaction);
        }
      }
      
      // Hide reaction picker
      reactionPicker.classList.add('hidden');
    }
    
    // More options button
    if (event.target.closest('.more-btn')) {
      // Show more options menu
      alert('More options not implemented yet');
    }
  });
  
  // Click outside reaction picker to close it
  document.addEventListener('click', function(event) {
    if (!event.target.closest('.react-btn') && !event.target.closest('.reaction-btn')) {
      document.getElementById('reactionPicker')?.classList.add('hidden');
    }
  });
  
  // Send reaction to server
  function sendReaction(messageId, reaction) {
    fetch('/api/chat/react', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messageId,
        reaction
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        // Add reaction to UI
        const messageElement = document.querySelector(`.message[data-message-id="${messageId}"]`);
        if (messageElement) {
          // Check if reaction already exists
          let reactionsContainer = messageElement.querySelector('.message-reactions');
          
          if (!reactionsContainer) {
            // Create reactions container
            reactionsContainer = document.createElement('div');
            reactionsContainer.className = 'message-reactions';
            messageElement.querySelector('.message-wrapper').appendChild(reactionsContainer);
          }
          
          // Add reaction
          const reactionElement = document.createElement('span');
          reactionElement.className = 'message-reaction';
          reactionElement.textContent = reaction;
          reactionsContainer.appendChild(reactionElement);
        }
      }
    })
    .catch(error => {
      console.error('Error sending reaction:', error);
    });
  }
}

// Initialize emoji picker
function initEmojiPicker() {
  const emojiButton = document.querySelector('.emoji-btn');
  const emojiPicker = document.getElementById('emojiPickerModal');
  
  if (!emojiButton || !emojiPicker) return;
  
  // Emoji button click handler
  emojiButton.addEventListener('click', function() {
    emojiPicker.classList.remove('hidden');
    
    // Load emojis if not already loaded
    if (!emojiPicker.dataset.loaded) {
      loadEmojis();
      emojiPicker.dataset.loaded = 'true';
    }
  });
  
  // Close emoji picker
  document.querySelector('.close-modal-btn')?.addEventListener('click', function() {
    emojiPicker.classList.add('hidden');
  });
  
  // Emoji category buttons
  document.querySelectorAll('.emoji-category').forEach(button => {
    button.addEventListener('click', function() {
      // Remove active class from all buttons
      document.querySelectorAll('.emoji-category').forEach(btn => {
        btn.classList.remove('active');
      });
      
      // Add active class to clicked button
      this.classList.add('active');
      
      // Show emojis for selected category
      const category = this.getAttribute('data-category');
      loadEmojis(category);
    });
  });
  
  // Load emojis for a category
  function loadEmojis(category = 'recent') {
    const emojiGrid = document.getElementById('emojiGrid');
    
    // Clear existing emojis
    emojiGrid.innerHTML = '';
    
    // Get emojis for category
    const emojis = getEmojisForCategory(category);
    
    // Add emojis to grid
    emojis.forEach(emoji => {
      const emojiButton = document.createElement('button');
      emojiButton.className = 'emoji-button';
      emojiButton.textContent = emoji;
      emojiButton.addEventListener('click', function() {
        insertEmoji(emoji);
      });
      
      emojiGrid.appendChild(emojiButton);
    });
  }
  
  // Get emojis for a category
  function getEmojisForCategory(category) {
    const emojiCategories = {
      recent: ['😀', '😂', '👍', '❤️', '🎉', '🔥', '👏', '🙏'],
      smileys: ['😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊', '😋', '😎', '😍', '😘'],
      animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🦝', '🐻', '🐼', '🦘', '🦡', '🐨', '🐯', '🦁'],
      food: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍'],
      activities: ['⚽', '🏀', '🏈', '⚾', '🥎', '🏐', '🏉', '🎱', '🏓', '🏸', '🥅', '🏒', '🏑', '🥍'],
      travel: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🚚', '🚛', '🚜', '🛴'],
      objects: ['⌚', '📱', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿', '📀'],
      symbols: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '❣️', '💕', '💞', '💓', '💗', '💖', '💘']
    };
    
    return emojiCategories[category] || emojiCategories.recent;
  }
  
  // Insert emoji into editor
  function insertEmoji(emoji) {
    const quill = window.chatQuill;
    
    if (quill) {
      // Get current selection
      const selection = quill.getSelection(true);
      
      // Insert emoji
      quill.insertText(selection.index, emoji);
      
      // Update cursor position
      quill.setSelection(selection.index + emoji.length);
    }
    
    // Hide emoji picker
    emojiPicker.classList.add('hidden');
  }
}

// Initialize button handlers
function initButtonHandlers() {
  // Send message button
  document.getElementById('sendMessageBtn')?.addEventListener('click', function() {
    const quill = window.chatQuill;
    
    if (!quill) return;
    
    // Get message content
    const messageHtml = quill.root.innerHTML;
    const messageText = quill.getText().trim();
    
    if (messageText.length === 0) return;
    
    // Get reply info
    const replyContainer = document.getElementById('replyContainer');
    const replyTo = replyContainer.classList.contains('hidden') ? null : replyContainer.getAttribute('data-reply-to');
    
    // Send message
    fetch('/api/chat/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: messageHtml,
        replyTo: replyTo
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        // Clear editor
        quill.setText('');
        
        // Clear reply
        replyContainer.classList.add('hidden');
        replyContainer.removeAttribute('data-reply-to');
      } else {
        throw new Error(data.message || 'Failed to send message');
      }
    })
    .catch(error => {
      console.error('Error sending message:', error);
    });
  });
  
  // Attach file button
  document.getElementById('attachBtn')?.addEventListener('click', function() {
    document.getElementById('file-upload')?.click();
  });
  
  // File upload change handler
  document.getElementById('file-upload')?.addEventListener('change', function(e) {
    const files = e.target.files;
    
    if (!files || files.length === 0) return;
    
    // Upload each file
    for (let i = 0; i < files.length; i++) {
      uploadFile(files[i]);
    }
    
    // Reset file input
    e.target.value = '';
  });
  
  // Remove the startAiChat button event handler
  
  // Invite participant button
  document.querySelectorAll('.invite-participant-btn').forEach(button => {
    button.addEventListener('click', function() {
      document.getElementById('inviteParticipantModal')?.classList.remove('hidden');
    });
  });
  
  // Schedule meeting button
  document.getElementById('scheduleBtn')?.addEventListener('click', function() {
    document.getElementById('scheduleMeetingModal')?.classList.remove('hidden');
  });
  
  // Audio call button
  document.getElementById('audioCallBtn')?.addEventListener('click', function() {
    startCall('audio');
  });
  
  // Video call button
  document.getElementById('videoCallBtn')?.addEventListener('click', function() {
    startCall('video');
  });
  
  // Mobile menu versions
  document.getElementById('audioCallMenuBtn')?.addEventListener('click', function() {
    startCall('audio');
  });
  
  document.getElementById('videoCallMenuBtn')?.addEventListener('click', function() {
    startCall('video');
  });
  
  // Other action buttons
  document.getElementById('archiveConversationBtn')?.addEventListener('click', function() {
    alert('Archive conversation functionality will be implemented soon.');
  });
  
  document.getElementById('muteConversationBtn')?.addEventListener('click', function() {
    alert('Mute notifications functionality will be implemented soon.');
  });
  
  document.getElementById('exportConversationBtn')?.addEventListener('click', function() {
    alert('Export chat functionality will be implemented soon.');
  });
  
  document.getElementById('blockUserBtn')?.addEventListener('click', function() {
    if (confirm('Are you sure you want to block this user?')) {
      alert('User block functionality will be implemented soon.');
    }
  });
  
  // Upload file to server
  function uploadFile(file) {
    // Create FormData
    const formData = new FormData();
    formData.append('file', file);
    formData.append('conversationId', currentConversationId || 'temp');
    
    // Show upload progress
    const uploadProgressContainer = document.getElementById('upload-progress-container');
    const uploadFilename = document.querySelector('.upload-filename');
    const uploadProgressBar = document.querySelector('.upload-progress-bar');
    
    if (uploadProgressContainer && uploadFilename && uploadProgressBar) {
      uploadFilename.textContent = file.name;
      uploadProgressBar.style.width = '0%';
      uploadProgressContainer.classList.remove('hidden');
    }
    
    // Get token
    const token = localStorage.getItem('token') || 
                  document.querySelector('meta[name="auth-token"]')?.content;
    
    // Upload file
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', function(e) {
      if (e.lengthComputable) {
        const percentComplete = Math.round((e.loaded / e.total) * 100);
        uploadProgressBar.style.width = percentComplete + '%';
      }
    });
    
    xhr.addEventListener('load', function() {
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText);
          
          if (response.success) {
            // Add file to message input or send directly
            if (response.fileType === 'image') {
              insertImageAttachment(response.file);
            } else {
              insertFileAttachment(response.file);
            }
          } else {
            console.error('Upload failed:', response.error);
            showToast('File upload failed: ' + (response.error || 'Unknown error'), 'error');
          }
        } catch (error) {
          console.error('Error parsing upload response:', error);
          showToast('Error processing upload response', 'error');
        }
      } else {
        console.error('Upload failed with status:', xhr.status);
        showToast('File upload failed', 'error');
      }
      
      // Hide upload progress
      uploadProgressContainer.classList.add('hidden');
    });
    
    xhr.addEventListener('error', function() {
      console.error('Upload failed with network error');
      showToast('Network error during upload', 'error');
      uploadProgressContainer.classList.add('hidden');
    });
    
    xhr.addEventListener('abort', function() {
      console.log('Upload aborted');
      showToast('Upload canceled', 'info');
      uploadProgressContainer.classList.add('hidden');
    });
    
    // Cancel upload button
    document.querySelector('.cancel-upload-btn')?.addEventListener('click', function() {
      xhr.abort();
    });
    
    // Open connection and send FormData
    xhr.open('POST', '/api/chat/upload-file');
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    xhr.send(formData);
  }
  
  // Insert image attachment into message
  function insertImageAttachment(image) {
    const quill = window.chatQuill;
    
    if (quill) {
      // Get current selection
      const selection = quill.getSelection(true);
      
      // Insert image
      quill.insertEmbed(selection.index, 'image', image.url);
      
      // Move cursor after image
      quill.setSelection(selection.index + 1);
    } else {
      // If Quill is not available, send message directly
      sendFileMessage(image);
    }
  }
  
  // Insert file attachment into message
  function insertFileAttachment(file) {
    const quill = window.chatQuill;
    
    if (quill) {
      // Get current selection
      const selection = quill.getSelection(true);
      
      // Insert file attachment placeholder
      quill.insertText(selection.index, `[File: ${file.name}] `, {
        'attachment': file,
        'color': '#3B82F6',
        'bold': true,
        'link': file.url
      });
      
      // Move cursor after attachment
      quill.setSelection(selection.index + `[File: ${file.name}] `.length);
    } else {
      // If Quill is not available, send message directly
      sendFileMessage(file);
    }
  }
  
  // Send file message directly
  function sendFileMessage(file) {
    const token = localStorage.getItem('token') || 
                  document.querySelector('meta[name="auth-token"]')?.content;
    
    if (!token) {
      showToast('You need to be logged in to send files', 'error');
      return;
    }
    
    fetch('/api/chat/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        conversationId: currentConversationId,
        content: '',
        attachments: [file],
        type: 'file'
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to send file message');
      }
      return response.json();
    })
    .then(data => {
      if (data.success) {
        console.log('File message sent successfully');
        showToast('File sent', 'success');
      } else {
        throw new Error(data.error || 'Failed to send file message');
      }
    })
    .catch(error => {
      console.error('Error sending file message:', error);
      showToast('Error sending file', 'error');
    });
  }
  
  // Function to show toast messages
  function showToast(message, type = 'info') {
    // Check if toast container exists
    let toastContainer = document.getElementById('toast-container');
    
    // Create container if it doesn't exist
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.className = 'fixed bottom-4 right-4 z-50 flex flex-col space-y-2';
      document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `p-3 rounded-lg shadow-lg flex items-center max-w-xs transition-all duration-300 transform translate-y-0 opacity-100`;
    
    // Set background color based on type
    if (type === 'error') {
      toast.classList.add('bg-red-500', 'text-white');
    } else if (type === 'success') {
      toast.classList.add('bg-green-500', 'text-white');
    } else if (type === 'warning') {
      toast.classList.add('bg-yellow-500', 'text-white');
    } else {
      toast.classList.add('bg-blue-500', 'text-white');
    }
    
    // Add icon based on type
    let icon = 'info-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'warning') icon = 'exclamation-triangle';
    
    toast.innerHTML = `
      <i class="fas fa-${icon} mr-2"></i>
      <span>${message}</span>
    `;
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => {
        toastContainer.removeChild(toast);
      }, 300);
    }, 3000);
  }
}

// Update addMessageToUI to handle file attachments
function addMessageToUI(message) {
  // Make sure we have all required data
  if (!message) {
    console.error('No message data provided to addMessageToUI');
    return;
  }
  
  // Get current user ID from multiple sources
  const currentUserId = 
    window.currentUserId || 
    document.querySelector('[data-user-id]')?.dataset.userId || 
    document.querySelector('meta[name="user-id"]')?.content;
  
  // Determine if message is from current user
  const isCurrentUser = String(message.sender_id) === String(currentUserId);
  
  // Create the message element BEFORE trying to set its properties
  const messageElement = document.createElement('div');
  messageElement.className = `message ${isCurrentUser ? 'outgoing' : 'incoming'}`;
  messageElement.setAttribute('data-message-id', message.id || 'temp-' + Date.now());
  messageElement.setAttribute('data-sender-id', message.sender_id || 'unknown');
  
  // Add debug info
  if (window.chatDebug) {
    messageElement.setAttribute('data-current-user', currentUserId || 'not-set');
    messageElement.setAttribute('data-is-current', isCurrentUser ? 'yes' : 'no');
  }
  
  // Define the user labels
  const userLabel = isCurrentUser ? 'User 1 (You)' : 'User 2';
  
  // If there's an avatar image in the message, add error handling
  if (message.sender_id && !message.is_system_message) {
    const defaultImg = '/images/default-profile.png';
    const avatarHtml = `
      <div class="message-avatar">
        <img 
          src="${message.sender_profile_pic || defaultImg}" 
          alt="${message.sender_name || userLabel}" 
          class="avatar-image"
          data-original-src="${message.sender_profile_pic || defaultImg}"
          onerror="this.onerror=null; this.src='${defaultImg}'; if(typeof markImageAsFailed === 'function') markImageAsFailed(this);" 
        />
      </div>
    `;
    
    // Add avatar to message
    messageElement.innerHTML = avatarHtml + `
      <div class="message-wrapper">
        ${!isCurrentUser ? `<div class="message-sender">${message.sender_name || userLabel}</div>` : ''}
        <div class="message-content">${message.content}</div>
        <div class="message-time">${formatTime(message.created_at || new Date())}</div>
        ${isCurrentUser ? `<div class="message-sender text-right">${userLabel}</div>` : ''}
      </div>
    `;
  } else {
    // System message doesn't need an avatar
    messageElement.innerHTML = `
      <div class="message-wrapper">
        <div class="message-content">${message.content}</div>
        <div class="message-time">${formatTime(message.created_at || new Date())}</div>
      </div>
    `;
  }
  
  // Check for attachments
  if (message.attachments && message.attachments.length > 0) {
    const attachmentsContainer = document.createElement('div');
    attachmentsContainer.className = 'message-attachments mt-2 space-y-2';
    
    message.attachments.forEach(attachment => {
      if (isImageAttachment(attachment)) {
        // Image attachment
        const imgContainer = document.createElement('div');
        imgContainer.className = 'image-attachment';
        
        const img = document.createElement('img');
        img.src = attachment.url;
        img.alt = attachment.name || 'Image';
        img.className = 'max-w-full rounded-lg max-h-60 cursor-pointer hover:opacity-90';
        img.onclick = () => openImageViewer(attachment.url);
        
        imgContainer.appendChild(img);
        attachmentsContainer.appendChild(imgContainer);
      } else {
        // File attachment
        const fileContainer = document.createElement('div');
        fileContainer.className = 'file-attachment bg-gray-100 rounded-lg p-2 flex items-center';
        
        // File icon based on type
        const iconClass = getFileIconClass(attachment.name);
        
        fileContainer.innerHTML = `
          <div class="file-icon mr-2">
            <i class="${iconClass} text-lg"></i>
          </div>
          <div class="file-info flex-grow">
            <div class="file-name text-sm font-medium text-gray-700 truncate">${attachment.name}</div>
            <div class="file-size text-xs text-gray-500">${formatFileSize(attachment.size)}</div>
          </div>
          <a href="${attachment.url}" target="_blank" class="file-download ml-2 text-blue-500 hover:text-blue-700">
            <i class="fas fa-download"></i>
          </a>
        `;
        
        attachmentsContainer.appendChild(fileContainer);
      }
    });
    
    // Add attachments to message
    const messageContent = messageElement.querySelector('.message-content');
    if (messageContent) {
      messageContent.appendChild(attachmentsContainer);
    }
  }
    // Find the messages container
  const messagesContainer = document.getElementById('messages-list') || 
                           document.getElementById('messagesContainer') ||
                           document.getElementById('chatMessages') ||
                           document.querySelector('.chat-body');
  
  // Add message to container if it exists
  if (messagesContainer) {
    messagesContainer.appendChild(messageElement);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  } else {
    console.error('No message container found to add message to');
  }
  
  return messageElement;
}

// Helper functions for attachments
function isImageAttachment(attachment) {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const fileName = attachment.name?.toLowerCase() || '';
  return imageExtensions.some(ext => fileName.endsWith(ext)) || 
         attachment.type?.startsWith('image/');
}

function getFileIconClass(fileName) {
  const extension = fileName.split('.').pop().toLowerCase();
  
  switch (extension) {
    case 'pdf':
      return 'fas fa-file-pdf text-red-500';
    case 'doc':
    case 'docx':
      return 'fas fa-file-word text-blue-600';
    case 'xls':
    case 'xlsx':
      return 'fas fa-file-excel text-green-600';
    case 'ppt':
    case 'pptx':
      return 'fas fa-file-powerpoint text-orange-500';
    case 'zip':
    case 'rar':
    case '7z':
      return 'fas fa-file-archive text-yellow-600';
    case 'txt':
      return 'fas fa-file-alt text-gray-600';
    case 'mp3':
    case 'wav':
    case 'ogg':
      return 'fas fa-file-audio text-purple-500';
    case 'mp4':
    case 'avi':
    case 'mov':
      return 'fas fa-file-video text-blue-500';
    default:
      return 'fas fa-file text-gray-500';
  }
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function openImageViewer(imageUrl) {
  // Create modal container
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75';
  
  // Create image element
  const img = document.createElement('img');
  img.src = imageUrl;
  img.className = 'max-w-[90%] max-h-[90vh] object-contain';
  
  // Create close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'absolute top-4 right-4 text-white text-2xl';
  closeBtn.innerHTML = '<i class="fas fa-times"></i>';
  closeBtn.onclick = () => document.body.removeChild(modal);
  
  // Add elements to modal
  modal.appendChild(img);
  modal.appendChild(closeBtn);
  
  // Add click handler to close on background click
  modal.onclick = (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  };
  
  // Add to body
  document.body.appendChild(modal);
}

// Helper function to format time
function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  // Less than 24 hours, show hour:minute
  if (diff < 24 * 60 * 60 * 1000) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // Within a week, show day of week
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  
  // Otherwise show date
  return date.toLocaleDateString();
}

// Enhance the chat interface to handle business inquiries

(function() {
  // State variables
  let currentConversation = null;
  let businessContext = null;
  
  // Initialize when DOM is loaded
  document.addEventListener('DOMContentLoaded', init);

  /**
   * Initialize the chat interface
   */
  function init() {
    // Get conversation ID from URL if present
    const urlParams = new URLSearchParams(window.location.search);
    const conversationId = urlParams.get('conversation');
    const isNew = urlParams.get('new') === '1';
    
    if (conversationId) {
      loadConversation(conversationId, isNew);
    }
    
    // Setup event listeners
    setupEventListeners();
    
    // Enable WebSocket connection
    initializeWebSocket();
  }
  
  /**
   * Load a specific conversation
   */
  function loadConversation(conversationId, isNewConversation = false) {    // Find the chat messages container or create one if it doesn't exist
    const chatMessagesEl = document.getElementById('chatMessages') || 
                          document.getElementById('messages-list') || 
                          document.getElementById('messagesContainer');
    
    // Check if element exists before trying to modify it
    if (!chatMessagesEl) {
      console.error('Chat messages container not found');
      return;
    }
    
    // Show loading state
    chatMessagesEl.innerHTML = '<div class="loading-spinner">Loading conversation...</div>';
    
    // Check if current user has access to this conversation
    const token = localStorage.getItem('token') || document.querySelector('meta[name="auth-token"]')?.content;
    if (!token) {
      chatMessagesEl.innerHTML = `
        <div class="error-message">
          <p>You need to be logged in to view this conversation.</p>
          <a href="/login2?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}" 
             class="btn btn-primary">Sign In</a>
        </div>
      `;
      return;
    }
    
    // Fetch conversation data with proper error handling
    fetch(`/api/chat/conversation/${conversationId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    .then(response => {
      if (response.status === 403) {
        // User doesn't have access to this conversation
        throw new Error('ACCESS_DENIED');
      }
      if (!response.ok) {
        throw new Error('Failed to load conversation');
      }
      return response.json();
    })
    .then(data => {
      if (!data.success) throw new Error(data.message || 'Error loading conversation');
      
      // Save current conversation
      currentConversation = data.conversation;
      
      // Save business context if present
      businessContext = data.businessContext;
      
      // Render conversation - use the proper function name
      displayConversation(currentConversation, isNewConversation);
      
      // Render business context if available
      if (businessContext) {
        renderBusinessContext(businessContext);
      }
      
      // Mark as read
      if (window.chatSocket) {
        // Fix: Use the correct variable name - currentConversation instead of conversation
        if (typeof window.chatSocket.markAsRead === 'function') {
          window.chatSocket.markAsRead(currentConversation.id);
        } else if (typeof window.chatSocket.markConversationRead === 'function') {
          window.chatSocket.markConversationRead(currentConversation.id);
        } else {
          // Fallback - use the API directly if socket functions aren't available
          markConversationReadViaAPI(currentConversation.id);
        }
      }
    })
    .catch(error => {
      console.error('Error loading conversation:', error);
      
      if (error.message === 'ACCESS_DENIED') {
        // Special handling for access denied errors
        chatMessagesEl.innerHTML = `
          <div class="error-message">
            <i class="fas fa-lock"></i>
            <p>You don't have permission to view this conversation.</p>
            <a href="/chat" class="btn btn-primary">Go to Your Conversations</a>
          </div>
        `;
        
        // Also update page title to indicate access issue
        document.title = 'Access Denied | Chat';
        
        // If there's a conversation list, remove the active class from this conversation
        const conversationItem = document.querySelector(`.conversation-item[data-conversation-id="${conversationId}"]`);
        if (conversationItem) {
          conversationItem.classList.remove('active');
        }
      } else {
        // Generic error handler
        chatMessagesEl.innerHTML = `
          <div class="error-message">
            <i class="fas fa-exclamation-circle"></i>
            <p>Failed to load conversation. ${error.message || ''}</p>
            <button onclick="location.reload()" class="btn btn-secondary">Try Again</button>
          </div>
        `;
      }
    });
  }
  
  /**
   * Display a conversation in the UI
   * @param {Object} conversation - The conversation object to render
   * @param {boolean} isNewConversation - Whether this is a new conversation
   */
  function displayConversation(conversation, isNewConversation = false) {    // Find the container for messages
    const messagesContainer = document.getElementById('chatMessages') || 
                             document.getElementById('messages-list') ||
                             document.getElementById('messagesContainer') ||
                             document.querySelector('.chat-body');
    
    if (!messagesContainer) {
      console.error('Messages container not found');
      return;
    }
    
    // Set conversation title
    const titleElement = document.getElementById('conversation-title');
    if (titleElement) {
      let title = 'Chat';
      
      if (conversation.recipient && conversation.recipient.name) {
        title = conversation.recipient.name;
      } else if (conversation.group_name) {
        title = conversation.group_name;
      } else if (conversation.business_name) {
        title = `Chat about ${conversation.business_name}`;
      }
      
      titleElement.textContent = title;
      document.title = `${title} | Chat`;
    }
    
    // Clear container and display messages
    messagesContainer.innerHTML = '';
    
    // Show welcome message for new conversations
    if (isNewConversation) {
      const welcomeEl = document.createElement('div');
      welcomeEl.className = 'welcome-message';
      welcomeEl.innerHTML = `
        <div class="text-center p-4 text-gray-500">
          <i class="fas fa-comments text-3xl mb-2"></i>
          <p>This is the beginning of your conversation.</p>
          <p class="text-sm">Send a message to get started!</p>
        </div>
      `;
      messagesContainer.appendChild(welcomeEl);
    }
    
    // Display messages if available
    if (conversation.messages && conversation.messages.length > 0) {
      conversation.messages.forEach(message => {
        addMessageToUI(message);
      });
      
      // Scroll to the bottom
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } else if (!isNewConversation) {
      // Show empty state for existing conversations with no messages
      messagesContainer.innerHTML = `
        <div class="text-center p-4 text-gray-500">
          <p>No messages yet. Start the conversation!</p>
        </div>
      `;
    }
    
    // Update message form target if needed
    const messageForm = document.getElementById('message-form');
    if (messageForm) {
      messageForm.dataset.conversationId = conversation.id;
    }
    
    // Highlight this conversation in the sidebar
    document.querySelectorAll('.conversation-item').forEach(item => {
      item.classList.toggle('active', item.dataset.conversationId === conversation.id);
    });
  }
  
  /**
   * Mark conversation as read using the API directly (fallback)
   * @param {string|number} conversationId - The conversation ID to mark as read
   */
  function markConversationReadViaAPI(conversationId) {
    if (!conversationId) return;
    
    // Get token from various possible sources
    const token = localStorage.getItem('token') || 
                  document.querySelector('meta[name="auth-token"]')?.content ||
                  '';
    
    if (!token) {
      console.warn('No authentication token available for marking conversation as read');
      return;
    }
    
    // Make API request to mark conversation as read
    fetch('/api/chat/mark-read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ conversationId })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to mark conversation as read: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('Conversation marked as read via API');
    })
    .catch(error => {
      console.error('Error marking conversation as read:', error);
    });
  }
  
  /**
   * Render business context panel
   */
  function renderBusinessContext(business) {
    // Create business context element if it doesn't exist
    let contextPanel = document.getElementById('businessContextPanel');
    if (!contextPanel) {
      contextPanel = document.createElement('div');
      contextPanel.id = 'businessContextPanel';
      contextPanel.className = 'business-context-panel';
      
      // Insert after header
      const header = document.querySelector('header');
      header.parentNode.insertBefore(contextPanel, header.nextSibling);
    }
    
    // Format price
    const formattedPrice = new Intl.NumberFormat('en-GB', { 
      style: 'currency', 
      currency: 'GBP',
      maximumFractionDigits: 0
    }).format(business.price);
    
    // Populate business context
    contextPanel.innerHTML = `
      <div class="business-context-content">
        <div class="business-info">
          <h3>
            <a href="/businesses/${business.id}" target="_blank">${business.name}</a>
          </h3>
          <div class="business-meta">
            <span class="business-price">${formattedPrice}</span>
            <span class="business-divider">•</span>
            <span class="business-industry">${business.industry}</span>
            <span class="business-divider">•</span>
            <span class="business-location">${business.location}</span>
          </div>
        </div>
        <div class="context-actions">
          <button class="view-listing-btn" onclick="window.open('/businesses/${business.id}', '_blank')">
            <i class="fas fa-external-link-alt"></i> View Listing
          </button>
          <button class="minimize-context-btn" onclick="toggleBusinessContext()">
            <i class="fas fa-chevron-up"></i>
          </button>
        </div>
      </div>
    `;
    
    // Add global function to toggle context panel
    window.toggleBusinessContext = function() {
      contextPanel.classList.toggle('minimized');
      const icon = contextPanel.querySelector('.minimize-context-btn i');
      if (contextPanel.classList.contains('minimized')) {
        icon.className = 'fas fa-chevron-down';
      } else {
        icon.className = 'fas fa-chevron-up';
      }
    };
  }
  
  // ...existing code for rendering conversations and messages...
  
  /**
   * Initialize WebSocket connection for real-time updates
   */
  function initializeWebSocket() {
    // Check if chat-ws-client.js has loaded
    if (typeof window.chatSocket === 'undefined') {
      console.warn('WebSocket client not loaded yet');
      setTimeout(initializeWebSocket, 500);
      return;
    }
    
    // Listen for new conversations
    document.addEventListener('ws-authenticated', () => {
      console.log('WebSocket authenticated, listening for chat events');
    });
    
    // Handle incoming message
    document.addEventListener('chat-message-received', (event) => {
      const message = event.detail;
      if (currentConversation && message.conversation_id === currentConversation.id) {
        addMessageToChat(message);
      }
    });
  }
  
  // ...rest of existing code...
})();

/**
 * Chat Interface
 * Handles the UI interactions for the chat interface
 */

(function() {
  // DOM elements
  let messagesContainer;
  let messageInput;
  let sendButton;
  let currentConversationId = null;
  
  // Initialize when DOM is loaded
  document.addEventListener('DOMContentLoaded', init);
  
  /**
   * Initialize chat interface
   */
  function init() {
    console.log('Initializing chat interface');
    
    // Get elements from DOM
    messagesContainer = document.getElementById('messages-list');
    messageInput = document.getElementById('message-input');
    sendButton = document.querySelector('#message-form button[type="submit"]');
    
    // Get conversation ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    currentConversationId = urlParams.get('conversation');
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize conversation list
    if (typeof window.initConversationList === 'function') {
      window.initConversationList();
    }
  }
  
  /**
   * Set up event listeners
   */
  function setupEventListeners() {
    // Message form submission
    const messageForm = document.getElementById('message-form');
    if (messageForm) {
      messageForm.addEventListener('submit', handleMessageSubmit);
    }
    
    // Message input typing
    if (messageInput) {
      messageInput.addEventListener('input', handleTyping);
      messageInput.addEventListener('keydown', function(e) {
        // Send message on Enter (without Shift)
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleMessageSubmit(e);
        }
      });
    }
    
    // New conversation button
    const newConversationBtn = document.getElementById('new-conversation-btn');
    if (newConversationBtn) {
      newConversationBtn.addEventListener('click', showNewConversationModal);
    }
    
    // Handle URL changes
    window.addEventListener('popstate', handleUrlChange);
  }
  
  /**
   * Handle message form submission
   */
  function handleMessageSubmit(e) {
    e.preventDefault();
    
    if (!messageInput || !currentConversationId) return;
    
    const message = messageInput.value.trim();
    if (!message) return;
    
    // Clear input
    messageInput.value = '';
    
    // Focus input field
    messageInput.focus();
    
    // Disable send button temporarily
    if (sendButton) {
      sendButton.disabled = true;
      setTimeout(() => {
        sendButton.disabled = false;
      }, 1000);
    }
    
    // Get token
    const token = localStorage.getItem('token') || getCookie('token');
    if (!token) {
      alert('You need to be logged in to send messages');
      window.location.href = `/login2?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      return;
    }
    
    // Add message to UI with pending status
    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      id: tempId,
      content: message,
      sender_id: 'current-user',
      created_at: new Date().toISOString(),
      status: 'sending'
    };
    
    // Add to UI
    if (typeof window.chatFunctions?.addMessageToChat === 'function') {
      window.chatFunctions.addMessageToChat(tempMessage);
    } else {
      addTempMessageToUI(tempMessage);
    }
    
    // Send to server
    fetch('/api/chat/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        conversationId: currentConversationId,
        content: message
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      return response.json();
    })
    .then(data => {
      console.log('Message sent successfully:', data);
      
      // Update message status in UI
      if (typeof window.chatFunctions?.updateMessageStatus === 'function') {
        window.chatFunctions.updateMessageStatus(tempId, 'sent', data.message.id);
      } else {
        updateTempMessageStatus(tempId, 'sent', data.message.id);
      }
    })
    .catch(error => {
      console.error('Error sending message:', error);
      
      // Update message status in UI
      if (typeof window.chatFunctions?.updateMessageStatus === 'function') {
        window.chatFunctions.updateMessageStatus(tempId, 'failed');
      } else {
        updateTempMessageStatus(tempId, 'failed');
      }
    });
    
    // Stop typing indicator
    if (window.chatSocket && typeof window.chatSocket.sendTypingStatus === 'function') {
      window.chatSocket.sendTypingStatus(false);
    }
  }
  
  /**
   * Handle typing events
   */
  function handleTyping() {
    if (!window.chatSocket || !currentConversationId) return;
    
    // Only send typing indicator if there's content
    const isTyping = messageInput.value.trim().length > 0;
    
    // Send typing status via WebSocket
    if (typeof window.chatSocket.sendTypingStatus === 'function') {
      window.chatSocket.sendTypingStatus(isTyping);
    }
  }
  
  /**
   * Handle URL changes (for browser navigation)
   */
  function handleUrlChange() {
    const urlParams = new URLSearchParams(window.location.search);
    const newConversationId = urlParams.get('conversation');
    
    // If conversation changed, load it
    if (newConversationId !== currentConversationId) {
      currentConversationId = newConversationId;
      
      // Update active conversation in sidebar
      document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.remove('active');
        
        if (item.dataset.conversationId === currentConversationId) {
          item.classList.add('active');
        }
      });
      
      // Load conversation
      if (typeof window.loadConversation === 'function' && currentConversationId) {
        window.loadConversation(currentConversationId);
      }
    }
  }
  
  /**
   * Show new conversation modal
   */
  function showNewConversationModal() {
    // Check if user is logged in
    const token = localStorage.getItem('token') || getCookie('token');
    if (!token) {
      window.location.href = `/login2?returnTo=${encodeURIComponent('/chat')}`;
      return;
    }
    
    // For now, just redirect to start-conversation page
    // This can be replaced with a modal in the future
    window.location.href = '/chat/start-conversation';
  }
  
  /**
   * Add temporary message to UI
   */
  function addTempMessageToUI(message) {
    if (!messagesContainer) return;
    
    const messageEl = document.createElement('div');
    messageEl.className = 'message outgoing';
    messageEl.setAttribute('data-message-id', message.id);
    
    messageEl.innerHTML = `
      <div class="message-content">
        <div class="message-bubble">
          ${message.content}
          <div class="message-time">${formatMessageTime(message.created_at)}</div>
          <div class="message-status ${message.status}">
            <i class="fas fa-check"></i>
          </div>
        </div>
      </div>
    `;
    
    messagesContainer.appendChild(messageEl);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
  
  /**
   * Update temporary message status
   */
  function updateTempMessageStatus(tempId, status, newId) {
    const messageEl = document.querySelector(`.message[data-message-id="${tempId}"]`);
    if (!messageEl) return;
    
    const statusEl = messageEl.querySelector('.message-status');
    if (statusEl) {
      statusEl.className = `message-status ${status}`;
      
      if (status === 'failed') {
        statusEl.innerHTML = '<i class="fas fa-exclamation-circle"></i>';
      } else if (status === 'sent') {
        statusEl.innerHTML = '<i class="fas fa-check"></i>';
      } else if (status === 'delivered') {
        statusEl.innerHTML = '<i class="fas fa-check"></i><i class="fas fa-check"></i>';
      } else if (status === 'seen') {
        statusEl.innerHTML = '<i class="fas fa-check"></i><i class="fas fa-check"></i>';
        statusEl.classList.add('seen');
      }
    }
    
    // Update message ID if provided
    if (newId) {
      messageEl.setAttribute('data-message-id', newId);
    }
  }
  
  /**
   * Format message time
   */
  function formatMessageTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // Make setupEventListeners available for global use
  window.setupEventListeners = setupEventListeners;
})();

// Update loadMessages to properly handle access denied errors
function loadMessages() {
  if (!currentConversationId) {
    console.warn('No conversation ID, cannot load messages');
    return;
  }
  
  const messagesList = document.getElementById('messages-list');
  if (!messagesList) {
    console.error('Messages list element not found');
    return;
  }
  
  console.log('Loading messages for conversation:', currentConversationId);
  
  // Show loading indicator
  messagesList.innerHTML = '<div class="loading text-center p-4 text-gray-500">Loading messages...</div>';
  
  // Fetch messages from the API with better error handling
  fetch(`/api/chat/messages?conversationId=${currentConversationId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    }
  })
  .then(response => {
    if (response.status === 403) {
      // User doesn't have access to this conversation
      throw new Error('ACCESS_DENIED');
    }
    if (!response.ok) {
      throw new Error(`Failed to load messages - Server returned ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    console.log('Loaded messages:', data);
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to load messages');
    }
    
    displayMessages(data.messages || []);
    
    // Mark conversation as read
    if (window.ChatSocket && window.ChatSocket.isConnected()) {
      window.ChatSocket.markAsRead(currentConversationId);
    }
  })
  .catch(error => {
    console.error('Error loading messages:', error);
    
    if (error.message === 'ACCESS_DENIED') {
      // Special handling for access denied errors
      messagesList.innerHTML = `
        <div class="error-message p-4 bg-red-100 text-red-800 rounded">
          <p class="mb-3">You don't have permission to view this conversation.</p>
          <a href="/chat" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Go to Your Conversations
          </a>
        </div>
      `;
      
      // Redirect to main chat page after a delay
      setTimeout(() => {
        window.location.href = '/chat';
      }, 3000);
    } else {
      // Generic error with retry button
      messagesList.innerHTML = `
        <div class="error-message p-4 bg-red-100 text-red-800 rounded">
          <p class="mb-3">Failed to load messages: ${error.message}</p>
          <button class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600" 
            onclick="window.initChat(); return false;">Try Again</button>
        </div>
      `;
    }
  });
}

// ...existing code...

// Make this function available globally for the chat.ejs template to call
window.fetchUserProfileData = function() {
  const token = localStorage.getItem('token') || 
              document.querySelector('meta[name="auth-token"]')?.content;
  
  if (!token) {
    console.log('No auth token found, skipping profile fetch');
    return;
  }
  
  // Show loading state
  const usernameElement = document.getElementById('sidebar-username');
  if (usernameElement && usernameElement.textContent === 'Loading...') {
    usernameElement.innerHTML = '<span class="animate-pulse">Loading...</span>';
  }
  
  console.log('Fetching profile data with token');
  
  // Fetch profile data from API
  fetch('/api/profile', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Cache-Control': 'no-cache'
    }
  })
  .then(response => {
    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, try to refresh or redirect to login
        console.error('Authentication failed, token may be expired');
        throw new Error('AUTH_FAILED');
      }
      throw new Error(`Profile fetch failed with status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    console.log('Profile API response:', data);
    
    // More flexible handling of API response formats
    if (data.success === true && data.profile) {
      // Standard format: { success: true, profile: {...} }
      console.log('Using standard profile format');
      updateProfileDisplay(data.profile);
      window.currentUserProfile = data.profile;
      window.currentUserId = data.profile.id;
      setUserOnlineStatus(true);
    } else if (data.user) {
      // Alternative format: { user: {...} }
      console.log('Using alternative profile format (user property)');
      updateProfileDisplay(data.user);
      window.currentUserProfile = data.user;
      window.currentUserId = data.user.id;
      setUserOnlineStatus(true);
    } else if (data.id) {
      // Profile object directly: { id: ..., username: ..., etc. }
      console.log('Using direct profile object format');
      updateProfileDisplay(data);
      window.currentUserProfile = data;
      window.currentUserId = data.id;
      setUserOnlineStatus(true);
    } else {
      console.error('Invalid profile data format. Response:', data);
      throw new Error('Invalid profile data format');
    }
  })
  .catch(error => {
    console.error('Error fetching profile data:', error);
    
    if (error.message === 'AUTH_FAILED') {
      // Handle auth failure - could redirect to login
      const loginUrl = `/login2?returnTo=${encodeURIComponent(window.location.pathname)}`;
      
      // Show auth error in UI
      const usernameElement = document.getElementById('sidebar-username');
      if (usernameElement) {
        usernameElement.innerHTML = `<span class="text-red-500">Session expired. <a href="${loginUrl}" class="underline">Login</a></span>`;
      }
    } else {
      // Show generic error
      const usernameElement = document.getElementById('sidebar-username');
      if (usernameElement) {
        usernameElement.textContent = 'Profile load failed';
      }
    }
    
    // Set status to offline
    setUserOnlineStatus(false);
  });
};

// Define setUserOnlineStatus function to handle user status updates
function setUserOnlineStatus(isOnline) {
  const statusIndicator = document.querySelector('.status-indicator');
  const statusText = document.querySelector('.status-text');
  
  if (!statusIndicator || !statusText) {
    console.log('Status elements not found in DOM');
    return;
  }
  
  if (isOnline) {
    statusIndicator.classList.remove('bg-gray-400');
    statusIndicator.classList.add('bg-green-500');
    statusText.textContent = 'Online';
  } else {
    statusIndicator.classList.remove('bg-green-500', 'bg-yellow-500');
    statusIndicator.classList.add('bg-gray-400');
    statusText.textContent = 'Offline';
  }
}

// Function to update profile display in chat interface
function updateProfileDisplay(profile) {
  if (!profile) {
    console.error('No profile data provided to updateProfileDisplay');
    return;
  }
  
  console.log('Updating profile display with:', profile);
  
  // Update username
  const usernameElement = document.getElementById('sidebar-username');
  if (usernameElement) {
    usernameElement.textContent = profile.username || 'Unknown User';
  }
  
  // Update profile picture - handle property name differences between APIs
  const profilePicElement = document.getElementById('sidebar-profile-picture');
  if (profilePicElement) {
    // Try all possible profile picture property names
    const profilePicUrl = getFormattedProfilePictureUrl(
      profile.profilePicture || profile.profile_picture || profile.avatar || profile.avatar_url
    );
    
    if (profilePicUrl) {
      profilePicElement.src = profilePicUrl;
      
      // Add error handling
      profilePicElement.onerror = function() {
        this.onerror = null; // Prevent infinite loops
        this.src = '/images/default-profile.png';
        
        // Track failed image
        if (window.failedImages) {
          window.failedImages.add(profilePicUrl);
        } else {
          window.failedImages = new Set([profilePicUrl]);
        }
      };
    }
  }
  
  // Update user activity status if available
  const lastActive = profile.last_active || profile.lastActive;
  if (lastActive) {
    updateUserActivityTimestamp(lastActive);
  }
}

// Helper function to update user activity timestamp display
function updateUserActivityTimestamp(timestamp) {
  const statusText = document.querySelector('.status-text');
  if (!statusText) return;
  
  const now = new Date();
  const lastActive = new Date(timestamp);
  const diffInMinutes = Math.floor((now - lastActive) / (1000 * 60));
  
  // Only update if we're not showing 'Online'
  if (statusText.textContent !== 'Online') {
    if (diffInMinutes < 60) {
      statusText.textContent = `Active ${diffInMinutes}m ago`;
    } else if (diffInMinutes < 24 * 60) {
      const hours = Math.floor(diffInMinutes / 60);
      statusText.textContent = `Active ${hours}h ago`;
    } else {
      statusText.textContent = `Active ${lastActive.toLocaleDateString()}`;
    }
  }
}

// Helper function to format profile picture URL
function getFormattedProfilePictureUrl(url) {
  if (!url) return '/images/default-profile.png';
  
  // If URL is already a full URL (starts with http or https), return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If URL is a relative path starting with /uploads, it's a local file
  if (url.startsWith('/uploads/')) {
    return url;
  }
  
  // If URL doesn't have a path prefix, assume it's in the uploads directory
  if (!url.startsWith('/')) {
    return `/uploads/${url}`;
  }
  
  // If URL starts with / but not /uploads, assume it's a local file at the root
  return url;
}

// ...existing code...

import { AudioService } from '/js/audioService.js';

export class VoiceChat {
    constructor() {
        // Initialize core properties and state
        this.init();
        
        // Set up DOM-dependent features when ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeAfterDOM());
        } else {
            this.initializeAfterDOM();
        }
    }

    init() {
        // Core state initialization
        this.isListening = false;
        this.isProcessingResponse = false;
        this.isAssistantSpeaking = false;
        this.shouldPauseRecognition = false;
        this.isInConversation = false;
        this.interruptRequested = false;
        this.debugMode = localStorage.getItem('voiceChatDebug') === 'true';
        
        // Remember mute state across page reloads
        this.isAIMuted = localStorage.getItem('aiMuted') === 'true';
        this.isUserMuted = localStorage.getItem('userMuted') === 'true';
        
        // Speech processing state
        this.conversationHistory = [];
        this.audioQueue = [];
        this.isProcessingSpeech = false;
        this.currentResponse = '';
        this.currentAudioSource = null;
        this.sentenceRegex = /[^.!?]+[.!?]+/g;
        this.partialBuffer = '';
        
        // Rate limiting
        this.requestCount = 0;
        this.requestReset = setInterval(() => this.requestCount = 0, 60000);
        this.maxRequestsPerMinute = 60;
        
        // Configure voice settings
        this.settings = {
            voice: localStorage.getItem('preferredVoice') || 'shimmer',
            volume: parseFloat(localStorage.getItem('voiceVolume')) || 1.0,
            rate: parseFloat(localStorage.getItem('voiceRate')) || 1.4,
            visualizer: localStorage.getItem('visualizerEnabled') !== 'false'
        };
        
        // Initialize API configuration
        this.apiKey = window.OPENAI_CONFIG?.apiKey;
        this.apiEndpoint = window.OPENAI_CONFIG?.endpoint || 'https://api.openai.com/v1/chat/completions';
        this.wsEndpoint = window.OPENAI_CONFIG?.wsEndpoint || 'ws://localhost:5000';
        this.model = window.OPENAI_CONFIG?.model || 'gpt-4';
        this.ttsModel = window.OPENAI_CONFIG?.ttsModel || 'tts-1';
        this.voice = window.OPENAI_CONFIG?.voice || 'shimmer';
        this.whisperModel = window.OPENAI_CONFIG?.whisperModel || 'whisper-1';
        
        // Add real-time conversation config
        this.realtimeConfig = {
            model: window.OPENAI_CONFIG?.model || 'gpt-4',
            temperature: 0.7,
            maxTokens: 4096,
            topP: 1,
            frequencyPenalty: 0,
            presencePenalty: 0
        };
        
        // Speech recognition config
        this.recognitionConfig = {
            continuous: true,
            interimResults: true,
            lang: 'en-GB',
            maxAlternatives: 1
        };
        
        // Voice activity detection config
        this.vadConfig = {
            minVolume: 0.2,         // Minimum volume threshold to detect speech
            silenceThreshold: 1000,  // Time in ms of silence to consider speech ended
            speakingThreshold: 100   // Time in ms of speech to consider speaking started
        };
        
        // Initialize VAD state
        this.vadState = {
            isSpeaking: false,
            lastVolumeTime: 0,
            volumeHistory: []
        };
        
        // Constants
        this.DATA_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
        this.maxConversationHistory = 50;
        
        console.log('Voice Chat core initialized');
    }

    async initializeAfterDOM() {
        try {
            // Find and store UI elements
            this.setupDOMElements();
            
            // Set up UI event listeners
            this.setupUI();
            
            // Set up speech recognition
            this.setupSpeechRecognition();
            
            // Initialize audio service for TTS
            this.audioService = new AudioService(this.apiKey);
            
            // Create toast notification container
            this.createToastContainer();
            
            // Check overlay visibility for debugging
            this.checkOverlayVisibility();
            
            console.log('Voice Chat fully initialized');
            this.showToast('Voice assistant ready', 'info');
        } catch (error) {
            console.error('Voice Chat initialization error:', error);
            this.handleError(error);
        }
    }

    setupDOMElements() {
        // Find core UI elements
        this.elements = {
            chatMessages: document.getElementById('chatMessages'),
            userInput: document.getElementById('userInput'),
            startConversationBtn: document.getElementById('startConversationBtn'),
            sendBtn: document.getElementById('sendBtn'),
            voicePopupOverlay: document.getElementById('voicePopupOverlay'),
            fluidCircleContainer: document.getElementById('fluidCircleContainer'),
            speakerIndicator: document.getElementById('speakerIndicator'),
            fluidCircle: document.getElementById('fluidCircle')
        };

        // Validate required elements
        const missingElements = Object.entries(this.elements)
            .filter(([key, element]) => !element)
            .map(([key]) => key);

        if (missingElements.length > 0) {
            console.warn('Missing UI elements:', missingElements);
        }
        
        // Log found elements in debug mode
        if (this.debugMode) {
            console.log('DOM Elements found:', Object.keys(this.elements).filter(key => this.elements[key]));
        }
    }

    setupUI() {
        // Create toast container for notifications
        this.toastContainer = this.createToastContainer();

        // Set up conversation toggle button
        if (this.elements.startConversationBtn) {
            this.elements.startConversationBtn.addEventListener('click', () => {
                if (!this.isListening) {
                    this.startConversationFlow();
                } else {
                    this.endConversationFlow();
                }
            });
        }

        // Set up text input handlers
        if (this.elements.userInput) {
            this.elements.userInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        if (this.elements.sendBtn) {
            this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        }

        // Set up keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl+Space to toggle conversation
            if (e.ctrlKey && e.code === 'Space') {
                e.preventDefault();
                this.elements.startConversationBtn?.click();
            }
            
            // Escape to end conversation
            if (e.key === 'Escape' && this.isInConversation) {
                this.endConversationFlow();
            }
        });

        // Set up overlay controls with detailed logging
        console.log('Setting up overlay controls');
        const overlayMuteBtn = document.querySelector('#voicePopupOverlay .overlay-controls .mute');
        const overlayCloseBtn = document.querySelector('#voicePopupOverlay .overlay-controls .close');

        if (overlayMuteBtn) {
            console.log('Overlay mute button found');
            overlayMuteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('Overlay mute button clicked');
                const isActive = overlayMuteBtn.classList.contains('active');
                this.toggleMicrophone(!isActive); // Toggle from current state
            });
        } else {
            console.warn('Overlay mute button not found');
        }

        if (overlayCloseBtn) {
            console.log('Overlay close button found');
            overlayCloseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('Overlay close button clicked');
                this.endConversationFlow();
            });
        } else {
            console.warn('Overlay close button not found');
        }

        // Add background overlay click handler
        const overlay = this.elements.voicePopupOverlay;
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                // Only close if clicking directly on the overlay (not its children)
                if (e.target === overlay) {
                    console.log('Overlay background clicked');
                    this.endConversationFlow();
                }
            });
        }
    }

    setupSpeechRecognition() {
        if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
            console.error('Speech recognition not supported in this browser');
            this.appendMessage('system', 'Speech recognition is not supported in your browser. Please use a different browser or type your messages.');
            return;
        }
        
        this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        
        // Apply configuration
        Object.assign(this.recognition, this.recognitionConfig);

        // Set up event handlers with improved error handling
        this.recognition.onstart = () => {
            // Stop any ongoing speech when recognition starts
            if (this.isAssistantSpeaking) {
                this.interruptSpeech();
            }
            this.updateVoiceStatus('Listening...');
            this.isListening = true;
            this.recognition.starting = false; // Clear the starting flag
        };

        this.recognition.onresult = async (event) => {
            if (this.isAssistantSpeaking || this.shouldPauseRecognition) {
                return; // Don't process if AI is speaking or recognition is paused
            }

            // Debounce processing to avoid multiple rapid calls
            if (this._recognitionTimeout) {
                clearTimeout(this._recognitionTimeout);
            }

            this._recognitionTimeout = setTimeout(async () => {
                try {
                    let finalTranscript = '';
                    let interimTranscript = '';
                    
                    // Process recognition results
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        const transcript = event.results[i][0].transcript;
                        if (event.results[i].isFinal) {
                            finalTranscript += transcript;
                        } else {
                            interimTranscript += transcript;
                            // Show interim results in UI for better feedback
                            this.updateInterimTranscript(interimTranscript);
                        }
                    }

                    // Only process final transcripts if we're not already processing
                    if (finalTranscript && !this.isProcessingResponse) {
                        this.clearInterimTranscript();
                        await this.processVoiceInput(finalTranscript);
                    }
                } catch (error) {
                    console.error('Speech recognition processing error:', error);
                    this.handleError(error);
                }
            }, 100); // Small delay to batch close results
        };

        this.recognition.onerror = (event) => {
            console.error('Voice recognition error:', event.error);
            // Only show error message for errors other than no-speech
            if (event.error !== 'no-speech') {
                switch (event.error) {
                    case 'network':
                        this.appendMessage('system', 'Network error. Please check your connection.');
                        break;
                    case 'not-allowed':
                        this.appendMessage('system', 'Microphone access denied. Please enable microphone access.');
                        break;
                    case 'aborted':
                        // This is often due to intentional stops, so don't show an error
                        break;
                    default:
                        this.appendMessage('system', `Voice recognition error: ${event.error}`);
                }
            }
            
            // Stop listening on critical errors
            if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(event.error)) {
                this.stopListening(true); // Force stop
            }
        };

        this.recognition.onend = () => {
            // Auto-restart recognition if we're still supposed to be listening
            if (this.isListening && !this.shouldPauseRecognition && !this.recognition.starting) {
                try {
                    this.recognition.starting = true; // Flag to prevent duplicate starts
                    this.recognition.start();
                    console.log('Recognition restarted');
                } catch (error) {
                    console.error('Recognition restart error:', error);
                    // If we can't restart, end the conversation
                    if (error.name === 'InvalidStateError') {
                        this.isListening = false;
                        this.updateVoiceStatus('Listening stopped');
                    }
                } finally {
                    // Clear starting flag after a short delay
                    setTimeout(() => {
                        this.recognition.starting = false;
                    }, 200);
                }
            } else {
                // If we're not restarting, update the UI
                if (!this.isListening) {
                    this.updateVoiceStatus('Ready');
                }
            }
        };
    }

    // Show interim transcription results in UI for better feedback
    updateInterimTranscript(text) {
        const interimElement = document.getElementById('interimTranscript');
        if (!interimElement) {
            const div = document.createElement('div');
            div.id = 'interimTranscript';
            div.className = 'interim-transcript text-slate-500 italic text-sm mt-2';
            div.textContent = `Listening: ${text}...`;
            this.elements.chatMessages.appendChild(div);
            this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
        } else {
            interimElement.textContent = `Listening: ${text}...`;
            this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
        }
    }

    // Clear interim transcript from UI
    clearInterimTranscript() {
        const interimElement = document.getElementById('interimTranscript');
        if (interimElement) {
            interimElement.remove();
        }
    }

    // Method to start a conversation flow
    startConversationFlow() {
        // Update UI first for responsiveness
        this.elements.startConversationBtn.classList.add('active');
        this.elements.startConversationBtn.querySelector('.btn-text').textContent = 'End Conversation';
        
        // Show fluid circle visualizer if available
        if (this.elements.fluidCircleContainer) {
            this.elements.fluidCircleContainer.style.display = 'flex';
            this.elements.fluidCircleContainer.style.animation = 'fadeIn 0.3s ease forwards';
        }
        
        // Start the actual conversation
        this.startConversation().catch(error => {
            console.error('Failed to start conversation:', error);
            this.handleError(error);
            this.resetVoiceUI();
            
            // Reset button state on error
            this.elements.startConversationBtn.classList.remove('active');
            this.elements.startConversationBtn.querySelector('.btn-text').textContent = 'Start Conversation';
        });
    }

    // Method to end conversation flow
    endConversationFlow() {
        // Update UI first for responsiveness
        this.elements.startConversationBtn.classList.remove('active');
        this.elements.startConversationBtn.querySelector('.btn-text').textContent = 'Start Conversation';
        
        // Hide fluid circle with animation
        if (this.elements.fluidCircleContainer) {
            this.elements.fluidCircleContainer.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => {
                this.elements.fluidCircleContainer.style.display = 'none';
            }, 300);
        }
        
        // End the conversation
        this.endConversation();
    }

    // Core conversation start method
    async startConversation() {
        if (this.isInConversation) return;
        
        // Check microphone availability
        const micAvailable = await this.checkMicrophoneAvailability();
        if (!micAvailable) return;

        // Set conversation state
        this.isInConversation = true;
        this.updateVoiceStatus('Conversation started - Listening...');
        
        // Explicitly show the overlay with proper visibility
        this.activateOverlay();
        
        // Start speech recognition
        await this.startListening();
        
        // Update UI with welcome message
        this.appendMessage('system', 'Conversation started. Speak naturally or type your messages.');
        
        // Configure recognition for continuous mode
        if (this.recognition) {
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
        }
        
        // Load previous conversation history if available
        this.loadConversationHistory();
    }

    // Activate overlay with explicit visibility
    activateOverlay() {
        const overlay = this.elements.voicePopupOverlay;
        if (overlay) {
            console.log('Activating voice overlay');
            
            // Force overlay to be visible and active
            overlay.style.visibility = 'visible';
            overlay.style.display = 'block'; 
            overlay.classList.add('active');
            
            // Force repaint to ensure visibility
            void overlay.offsetWidth;
            
            // Reset mute button state
            const overlayMuteBtn = overlay.querySelector('.overlay-controls .mute');
            if (overlayMuteBtn) {
                overlayMuteBtn.classList.remove('active');
                overlayMuteBtn.style.visibility = 'visible';
                overlayMuteBtn.style.display = 'flex';
                console.log('Reset overlay mute button');
            } else {
                console.warn('Overlay mute button not found');
            }
            
            // Make sure overlay controls are visible
            const controls = overlay.querySelector('.overlay-controls');
            if (controls) {
                controls.style.visibility = 'visible';
                controls.style.display = 'flex';
                console.log('Overlay controls visible');
            }
            
            document.body.classList.add('popup-open');
        } else {
            console.warn('Voice popup overlay element not found');
        }
    }

    // End conversation and cleanup
    async endConversation() {
        if (!this.isInConversation) return;
        
        // Update state
        this.isInConversation = false;
        
        // Stop listening and any ongoing speech
        this.stopListening(true);
        this.interruptSpeech();
        
        // Reset UI
        this.updateVoiceStatus('Conversation ended');
        this.appendMessage('system', 'Conversation ended');
        this.resetVoiceUI();
        
        // Save conversation before ending
        this.saveConversationHistory();
    }

    // Toggle microphone mute state with explicit UI updates
    toggleMicrophone(isMuted) {
        console.log(`Toggling microphone: ${isMuted ? 'muted' : 'unmuted'}`);
        
        if (this.mediaStream) {
            // Update actual audio tracks
            const audioTracks = this.mediaStream.getAudioTracks();
            audioTracks.forEach(track => {
                track.enabled = !isMuted;
            });
            
            // Update all UI elements that show mute state
            this.updateMuteUIState(isMuted);
            
            // Update status text
            this.updateVoiceStatus(isMuted ? 'Microphone muted' : 'Listening...');
            
            // Show toast notification
            this.showToast(isMuted ? 'Microphone muted' : 'Microphone active', isMuted ? 'warning' : 'info');
        } else {
            console.warn('Cannot toggle microphone - no media stream available');
        }
    }

    // Update all UI elements that reflect mute state
    updateMuteUIState(isMuted) {
        // Update overlay mute button state
        const overlayMuteBtn = document.querySelector('#voicePopupOverlay .overlay-controls .mute');
        if (overlayMuteBtn) {
            if (isMuted) {
                overlayMuteBtn.classList.add('active');
            } else {
                overlayMuteBtn.classList.remove('active');
            }
        }
        
        // Update popup mute button if it exists
        const popupMuteBtn = document.querySelector('.voice-popup-btn.mute');
        if (popupMuteBtn) {
            if (isMuted) {
                popupMuteBtn.classList.add('active');
            } else {
                popupMuteBtn.classList.remove('active');
            }
        }
        
        // Update any inline mute button
        const inlineMuteBtn = document.querySelector('.user-mute-btn');
        if (inlineMuteBtn) {
            if (isMuted) {
                inlineMuteBtn.classList.add('active');
            } else {
                inlineMuteBtn.classList.remove('active');
            }
        }
        
        // Update fluid circle state if applicable
        if (this.elements.fluidCircle) {
            if (isMuted) {
                this.elements.fluidCircle.classList.add('muted');
                this.elements.fluidCircle.classList.remove('user-speaking');
            } else {
                this.elements.fluidCircle.classList.remove('muted');
            }
        }
        
        // Update speaker indicator text
        if (this.elements.speakerIndicator) {
            this.elements.speakerIndicator.textContent = isMuted ? 'Microphone muted' : 'Listening...';
        }
    }

    // Handle microphone check with better error messages
    async checkMicrophoneAvailability() {
        try {
            // First check if user has already granted permission
            const permissionStatus = await navigator.permissions.query({ name: 'microphone' })
                .catch(() => ({ state: 'prompt' })); // Default to prompt if query fails
            
            if (permissionStatus.state === 'denied') {
                throw new Error('Microphone permission denied. Please enable microphone access in your browser settings.');
            }
            
            // Request access to microphone
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Release the stream immediately after checking
            stream.getTracks().forEach(track => track.stop());
            
            // Check for available devices
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioDevices = devices.filter(device => device.kind === 'audioinput');
            
            if (audioDevices.length === 0) {
                throw new Error('No microphone found. Please connect a microphone and try again.');
            }

            if (this.debugMode) {
                console.log('Available audio devices:', audioDevices);
            }

            return true;
        } catch (error) {
            console.error('Microphone check failed:', error);
            this.appendMessage('system', error.message);
            this.showToast(error.message, 'error');
            return false;
        }
    }

    // Start listening with enhanced error handling
    async startListening() {
        if (!this.voiceInitialized) {
            await this.initializeVoice().catch(error => {
                console.error('Failed to initialize voice:', error);
                throw error;
            });
        }
        
        if (this.isAssistantSpeaking) {
            this.interruptSpeech();
            await new Promise(resolve => setTimeout(resolve, 100)); // Brief delay for cleanup
        }

        try {
            // Initialize audio context for audio analysis
            await this.initializeAudio();
            
            // Don't restart if already listening
            if (this.isListening) return;

            this.isListening = true;
            this.updateVoiceStatus('Starting voice recognition...');

            // Setup for volume detection
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            
            this.mediaStream = stream;
            await this.setupVolumeDetection();
            
            // Connect to audio analyzer
            const source = this.audioContext.createMediaStreamSource(stream);
            source.connect(this.analyser);
            
            // Start volume detection
            this.startVolumeDetection();
            
            // Start speech recognition
            if (this.recognition) {
                this.recognition.start();
                console.log('Speech recognition started');
            }
            
            this.updateVoiceStatus('Listening...');
            this.updateFluidCircleState('idle');
        } catch (error) {
            this.isListening = false;
            console.error('Failed to start listening:', error);
            
            // Provide user-friendly error messages
            let errorMessage = 'Failed to start voice recognition.';
            
            if (error.name === 'NotAllowedError') {
                errorMessage = 'Microphone access denied. Please enable microphone access in your browser settings.';
            } else if (error.name === 'NotFoundError') {
                errorMessage = 'No microphone found. Please check your microphone connection.';
            } else if (error.name === 'NotReadableError') {
                errorMessage = 'Your microphone is busy or not responding. Please try unplugging and reconnecting it.';
            } else if (error.name === 'AbortError') {
                errorMessage = 'Microphone access was aborted. Please try again.';
            }
            
            this.showToast(errorMessage, 'error');
            this.appendMessage('system', errorMessage);
            throw error;
        }
    }

    // Stop listening with clean teardown
    stopListening(force = false) {
        if (!this.isListening && !force) return;
        
        console.log('Stopping voice recognition');
        this.isListening = false;
        this.shouldPauseRecognition = true;
        
        // Stop recognition
        try {
            if (this.recognition) {
                this.recognition.stop();
                this.recognition.starting = false;
            }
        } catch (error) {
            console.warn('Recognition stop error:', error);
        }
        
        // Clean up volume detection
        if (this.volumeDetectionInterval) {
            clearInterval(this.volumeDetectionInterval);
            this.volumeDetectionInterval = null;
        }
        
        // Release media stream
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => {
                track.stop();
                console.log('Media track stopped');
            });
            this.mediaStream = null;
        }
        
        // Suspend audio context if possible
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.suspend().catch(error => {
                console.warn('Error suspending audio context:', error);
            });
        }
        
        this.updateVoiceStatus('Voice recognition stopped');
        this.updateFluidCircleState('idle');
        this.clearInterimTranscript();
    }

    // Set up volume detection for better speech detection
    async setupVolumeDetection() {
        try {
            if (!this.audioContext) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                this.audioContext = new AudioContext();
            }
            
            if (!this.analyser) {
                this.analyser = this.audioContext.createAnalyser();
                // Configure for optimal voice detection
                this.analyser.fftSize = 1024;
                this.analyser.smoothingTimeConstant = 0.8;
                this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            }

            await this.audioContext.resume();
            console.log('Audio context ready for volume detection');
        } catch (error) {
            console.error('Volume detection setup failed:', error);
            throw error;
        }
    }

    // Start volume detection to visualize and detect speech
    startVolumeDetection() {
        if (this.volumeDetectionInterval) {
            clearInterval(this.volumeDetectionInterval);
        }
        
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        // Check volume at regular intervals
        this.volumeDetectionInterval = setInterval(() => {
            if (!this.isListening || !this.analyser) return;
            
            try {
                // Get current audio data
                this.analyser.getByteFrequencyData(dataArray);
                
                // Calculate average volume
                const sum = dataArray.reduce((acc, val) => acc + val, 0);
                const avgVolume = sum / bufferLength / 256; // Normalize to 0-1
                
                // Update VAD state and visualizations
                this.updateVADState(avgVolume);
                this.updateVoiceVisualization(avgVolume);
            } catch (error) {
                console.warn('Volume detection error:', error);
            }
        }, 50); // Check every 50ms
    }

    // Update voice activity detection state
    updateVADState(volume) {
        const now = Date.now();
        this.vadState.volumeHistory.push({ time: now, volume });
        
        // Keep only recent history
        this.vadState.volumeHistory = this.vadState.volumeHistory.filter(
            entry => now - entry.time < this.vadConfig.silenceThreshold
        );
        
        // Calculate average volume
        const avgVolume = this.vadState.volumeHistory.reduce(
            (sum, entry) => sum + entry.volume, 0
        ) / Math.max(1, this.vadState.volumeHistory.length);
        
        // Detect speech state changes with some hysteresis
        const wasSpeaking = this.vadState.isSpeaking;
        
        // Add hysteresis to prevent rapid switching
        if (wasSpeaking) {
            this.vadState.isSpeaking = avgVolume > (this.vadConfig.minVolume * 0.7);
        } else {
            this.vadState.isSpeaking = avgVolume > this.vadConfig.minVolume;
        }
        
        if (this.vadState.isSpeaking !== wasSpeaking) {
            if (this.vadState.isSpeaking) {
                this.onSpeechStart();
            } else {
                this.onSpeechEnd();
            }
        }
    }

    // Handle speech start events
    onSpeechStart() {
        if (this.elements.fluidCircle && !this.elements.fluidCircle.classList.contains('muted')) {
            this.updateFluidCircleState('user-speaking');
        }
        
        this.updateVoiceStatus('Speaking...');
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'speech_start' }));
        }
    }

    // Handle speech end events
    onSpeechEnd() {
        if (this.elements.fluidCircle) {
            this.updateFluidCircleState('idle');
        }
        
        this.updateVoiceStatus('Processing...');
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'speech_end' }));
        }
    }

    // Update fluid circle state for better visual feedback
    updateFluidCircleState(state) {
        if (this.elements.fluidCircle) {
            // Reset all potential classes
            this.elements.fluidCircle.className = 'fluid-circle';
            // Add the requested state
            this.elements.fluidCircle.classList.add(state);
        }
    }

    // Update voice visualization with simplified approach
    updateVoiceVisualization(volume) {
        if (!this.elements.fluidCircle || !this.settings.visualizer) return;

        // Get the fluid circle element
        const fluidCircle = this.elements.fluidCircle;
        
        // Simple scale effect based on volume
        const scale = 1 + (volume * 0.15); // Scale between 1.0 and 1.15
        fluidCircle.style.transform = `scale(${scale})`;
        
        // Adjust glow intensity based on volume
        const glowIntensity = 10 + (volume * 15); // Between 10px and 25px
        fluidCircle.style.boxShadow = `0 0 ${glowIntensity}px rgba(59, 130, 246, ${0.5 + volume * 0.3})`;
        
        // Update status text and styles
        const statusText = document.querySelector('.voice-status-text');
        if (statusText) {
            if (volume > 0.1) {
                statusText.textContent = 'Listening...';
                statusText.style.color = '#4f46e5';
                this.elements.fluidCircleContainer.classList.add('active-voice');
            } else {
                statusText.textContent = 'Speak now';
                statusText.style.color = '#6b7280';
                this.elements.fluidCircleContainer.classList.remove('active-voice');
            }
        }
    }

    // Initialize audio context for TTS - fix this method
    async initializeAudio() {
        if (!this.audioInitialized) {
            try {
                console.log('Initializing audio context');
                await this.audioService.initializeAudioContext();
                
                // Play a silent sound to initialize audio (browser requires user gesture)
                const context = this.audioService.getAudioContext();
                const silentBuffer = context.createBuffer(1, 1, 22050);
                const source = context.createBufferSource();
                source.buffer = silentBuffer;
                source.connect(context.destination);
                source.start();
                
                this.audioInitialized = true;
                console.log('Audio context initialized successfully');
            } catch (error) {
                console.error('Failed to initialize audio context:', error);
                throw error;
            }
        }
    }

    // Initialize voice features
    async initializeVoice() {
        try {
            if (!window.AudioContext && !window.webkitAudioContext) {
                throw new Error('Audio playback not supported');
            }
            
            this.voiceInitialized = true;
            console.log('Voice initialized: Using OpenAI Shimmer');
            
            const debugInfo = document.getElementById('voiceDebugInfo');
            if (debugInfo) {
                debugInfo.textContent = 'Using voice: OpenAI Shimmer';
            }
        } catch (error) {
            console.error('Voice initialization failed:', error);
            this.appendMessage('system', 'Voice features unavailable. Using text only.');
            throw error;
        }
    }

    // Process voice input with improved handling
    async processVoiceInput(input) {
        if (this.isAssistantSpeaking) {
            this.interruptSpeech();
            await new Promise(resolve => setTimeout(resolve, 100)); // Brief delay for cleanup
        }

        this.interruptRequested = false;

        try {
            this.checkRateLimit();
            
            const sanitizedInput = this.sanitizeInput(input);
            this.debug('Processing voice input:', sanitizedInput);
            
            if (this.elements.userInput) {
                this.elements.userInput.value = '';
            }

            if (this.isAssistantSpeaking || this.processingMessage || !sanitizedInput || this.isProcessingResponse) {
                this.debug('Skipping processing - already in progress or empty input');
                return;
            }

            this.processingMessage = true;
            this.showLoadingState();

            await this.handleRealTimeConversation(sanitizedInput);
            
        } catch (error) {
            console.error('Voice processing error:', error);
            this.debug('Voice processing error:', error);
            this.appendMessage('system', 'Error processing voice input');
        } finally {
            this.processingMessage = false;
            this.hideLoadingState();
        }

        if (this.isInConversation) {
            this.shouldPauseRecognition = false;
        }
    }

    // Optimized method to handle real-time conversation with faster response
    async handleRealTimeConversation(userInput) {
        if (this.isAssistantSpeaking) {
            this.interruptSpeech();
        }

        try {
            // Add immediate feedback first
            const typingMessage = this.appendMessage('assistant', '...', 'typing');
            typingMessage.style.opacity = '1'; // Show typing indicator immediately
            
            // Fetch data in parallel with API call preparation
            const marketplaceDataPromise = this.fetchMarketplaceData();
            
            this.currentResponse = '';
            this.streamingResponse = true;
            this.isProcessingResponse = true;
            
            let sentenceBuffer = '';
            let processingPromise = null;

            const systemMessage = {
                role: 'system',
                content: `You are Arzani, an energetic and helpful business marketplace assistant. 
                         Keep initial responses brief and conversational.
                         Respond in complete British English sentences.
                         Speak naturally using contractions and casual language.
                         When providing market information, be concise but accurate with numbers.`
            };

            // Add user message to history
            this.conversationHistory.push({
                role: 'user',
                content: userInput
            });
            
            // Resolve marketplace data
            const marketplaceData = await marketplaceDataPromise;
            
            // Add marketplace context only if needed (making initial prompt smaller)
            if (userInput.toLowerCase().includes('business') || 
                userInput.toLowerCase().includes('market') ||
                userInput.toLowerCase().includes('price') || 
                userInput.toLowerCase().includes('sale')) {
                systemMessage.content += `\nYou have access to these marketplace listings:
                ${JSON.stringify(marketplaceData?.businesses?.slice(0, 5) || [])}`;
            }
            
            // Use faster temperature for more immediate responses
            const temperature = userInput.length < 20 ? 0.9 : 0.7;
            
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.realtimeConfig.model,
                    messages: [
                        systemMessage,
                        ...this.conversationHistory.slice(-5) // Only use last 5 messages for faster context processing
                    ],
                    temperature: temperature,
                    stream: true
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            // Process the stream more efficiently
            while (true) {
                const { done, value } = await reader.read();
                if (done || this.interruptRequested) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim() !== '');
                
                for (const line of lines) {
                    if (this.interruptRequested) break;
                    if (line.trim() === 'data: [DONE]') continue;
                    
                    if (line.startsWith('data: ')) {
                        try {
                            const jsonStr = line.slice(6);
                            if (jsonStr) {
                                const data = JSON.parse(jsonStr);
                                const partial = data.choices[0]?.delta?.content;
                                
                                if (partial) {
                                    this.currentResponse += partial;
                                    sentenceBuffer += partial;
                                    
                                    // Update UI immediately
                                    if (typingMessage) {
                                        typingMessage.querySelector('.message-content').textContent = this.currentResponse;
                                    }
                                    
                                    // Process complete sentences in parallel without waiting
                                    if (sentenceBuffer.match(/[.!?]/)) {
                                        const sentences = sentenceBuffer.match(/[^.!?]+[.!?]+/g) || [];
                                        if (sentences.length > 0) {
                                            // Extract complete sentences
                                            const completeText = sentences.join(' ');
                                            sentenceBuffer = sentenceBuffer.replace(/[^.!?]+[.!?]+/g, '');
                                            
                                            // Only process speech if not muted
                                            if (!this.isAIMuted) {
                                                if (processingPromise) {
                                                    // Wait for previous speech to finish before starting new one
                                                    await processingPromise;
                                                }
                                                
                                                // Start new speech immediately
                                                processingPromise = this.speakPartial(completeText.trim());
                                            }
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            if (!line.includes('[DONE]')) {
                                console.warn('Error parsing stream data:', e);
                            }
                        }
                    }
                }
            }

            // Process any remaining text (only for TTS if not muted)
            if (!this.interruptRequested && sentenceBuffer.trim() && !this.isAIMuted) {
                await this.speakPartial(sentenceBuffer.trim());
            }

            this.streamingResponse = false;
            if (this.currentResponse) {
                typingMessage.classList.remove('typing-message');
                
                // Add response to conversation history
                this.conversationHistory.push({
                    role: 'assistant',
                    content: this.currentResponse
                });
            }

        } catch (error) {
            console.error('Real-time conversation error:', error);
            this.appendMessage('system', 'Sorry, I encountered an error processing your request.');
            requestAnimationFrame(() => {
                document.querySelector('.typing-message')?.remove();
            });
        } finally {
            this.isProcessingResponse = false;
            this.interruptRequested = false;
        }
    }

    // Optimized method to speak partial text
    async speakPartial(sentence) {
        if (!sentence.trim() || this.interruptRequested) return;

        try {
            // Don't process speech if AI is muted - skip TTS entirely
            if (this.isAIMuted) {
                console.log('Skipping TTS due to AI mute state');
                return Promise.resolve(); // Return resolved promise to maintain flow
            }

            console.log('Speaking sentence:', sentence.substring(0, 30) + '...');
            await this.initializeAudio();
            this.isAssistantSpeaking = true;
            
            // Use improved audio service with faster speech processing
            console.log('Creating audio source');
            const audioSource = await this.audioService.createAudioSourceFast(sentence.trim(), {
                rate: this.settings.rate,
                onEnd: () => {
                    console.log('Audio playback ended');
                    this.currentAudioSource = null;
                    this.isAssistantSpeaking = false;
                }
            });
            
            this.currentAudioSource = audioSource;
            
            if (!this.interruptRequested) {
                console.log('Starting audio playback');
                return audioSource.start();
            }
            
        } catch (error) {
            console.error('Partial speech synthesis error:', error);
            this.isAssistantSpeaking = false;
        }
    }

    // Interrupt ongoing speech
    interruptSpeech() {
        this.interruptRequested = true;
        
        if (this.currentAudioSource) {
            this.currentAudioSource.stop();
        }
        
        this.audioQueue = [];
        this.isAssistantSpeaking = false;
        this.partialBuffer = '';
        this.shouldPauseRecognition = false;
        
        if (this.audioContext && this.audioContext.state === 'running') {
            this.audioContext.suspend();
        }
    }

    // Check rate limit for requests
    checkRateLimit() {
        this.requestCount++;
        
        if (this.requestCount > this.maxRequestsPerMinute) {
            throw new Error('Rate limit exceeded. Please try again later.');
        }
    }

    // Sanitize user input
    sanitizeInput(input) {
        return input
            .replace(/[<>]/g, '')
            .replace(/[{}]/g, '')
            .replace(/[[\]]/g, '')
            .trim();
    }

    // Show loading state
    showLoadingState() {
        const loadingDiv = document.querySelector('.loading-indicator');
        if (loadingDiv) {
            loadingDiv.style.display = 'block';
        }
    }

    // Hide loading state
    hideLoadingState() {
        const loadingDiv = document.querySelector('.loading-indicator');
        if (loadingDiv) {
            loadingDiv.style.display = 'none';
        }
    }

    // Append message to chat
    appendMessage(sender, text, messageType = 'message') {
        if (!this.elements.chatMessages) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('chat-message', sender);
        
        if (messageType === 'typing') {
            messageDiv.classList.add('typing-message');
        }
        
        messageDiv.innerHTML = `
            ${sender === 'assistant' ? 
                '<div class="assistant-avatar"><img src="/images/talk-to-azani-icon.png" alt="Arzani"></div>' 
                : ''
            }
            <div class="message-content">${text}</div>
        `;
        
        requestAnimationFrame(() => {
            this.elements.chatMessages.appendChild(messageDiv);
            requestAnimationFrame(() => {
                this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
            });
        });

        return messageDiv;
    }

    // Send user message
    async sendMessage() {
        if (this.isProcessingResponse) return;
        
        const message = this.elements.userInput.value.trim();
        if (!message) return;
        
        this.appendMessage('user', message);
        
        this.elements.userInput.value = '';
        
        await this.processVoiceInput(message);
    }

    // Fetch marketplace data
    async fetchMarketplaceData() {
        try {
            const now = Date.now();
            if (this.marketplaceData && this.lastDataFetch && 
                (now - this.lastDataFetch) < this.DATA_REFRESH_INTERVAL) {
                return this.marketplaceData;
            }

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

    // Handle errors with improved feedback
    handleError(error) {
        this.debug('Error occurred:', error);
        
        if (this._errorTimeout) {
            clearTimeout(this._errorTimeout);
        }

        this._errorTimeout = setTimeout(() => {
            let userMessage = 'An error occurred. Please try again.';
            let toastType = 'error';
            
            if (error.name === 'NotAllowedError') {
                userMessage = 'Please enable microphone access to use voice features.';
            } else if (error.message.includes('rate limit')) {
                userMessage = 'Too many requests. Please wait a moment before trying again.';
                toastType = 'warning';
            }
            
            this.showToast(userMessage, toastType);
            this.appendMessage('system', userMessage);
            
            this.stopListening();
            this.hideLoadingState();
        }, 300);
    }

    // Create toast container for notifications
    createToastContainer() {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    }

    // Show toast notification
    showToast(message, type = 'info') {
        if (!this.toastContainer) {
            this.toastContainer = this.createToastContainer();
        }
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        this.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Load conversation history
    loadConversationHistory() {
        try {
            const saved = localStorage.getItem('conversationHistory');
            this.conversationHistory = saved ? JSON.parse(saved) : [];
            if (this.conversationHistory.length > this.maxConversationHistory) {
                this.conversationHistory = this.conversationHistory.slice(-this.maxConversationHistory);
            }
        } catch (error) {
            console.error('Error loading conversation history:', error);
            this.conversationHistory = [];
        }
    }

    // Save conversation history
    saveConversationHistory() {
        try {
            localStorage.setItem('conversationHistory', JSON.stringify(this.conversationHistory));
        } catch (error) {
            console.error('Error saving conversation history:', error);
        }
    }

    // Reset voice UI components
    resetVoiceUI() {
        if (this.voicePopup) {
            this.voicePopup.classList.remove('active');
            document.body.classList.remove('popup-open');
        }
        
        const overlay = document.getElementById('voicePopupOverlay');
        if (overlay) {
            overlay.classList.remove('active');
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 300);
        }
        
        const fluidCircleContainer = document.getElementById('fluidCircleContainer');
        if (fluidCircleContainer) {
            fluidCircleContainer.style.display = 'none';
            
            const fluidCircle = document.getElementById('fluidCircle');
            if (fluidCircle) {
                fluidCircle.className = 'fluid-circle idle';
            }
            
            const speakerIndicator = document.getElementById('speakerIndicator');
            if (speakerIndicator) {
                speakerIndicator.className = 'speaker-indicator';
                speakerIndicator.textContent = 'Listening...';
            }
        }
    }

    // Update connection status
    updateConnectionStatus(status) {
        const statusIndicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        
        if (statusIndicator && statusText) {
            statusIndicator.className = 'status-indicator';
            statusIndicator.classList.add(status);
            
            switch (status) {
                case 'connected':
                    statusText.textContent = 'Connected';
                    break;
                case 'disconnected':
                    statusText.textContent = 'Disconnected';
                    break;
                case 'connecting':
                    statusText.textContent = 'Connecting...';
                    break;
                default:
                    statusText.textContent = 'Unknown status';
            }
        }
    }

    // Check overlay visibility for debugging
    checkOverlayVisibility() {
        console.log('Checking overlay visibility');
        this.checkElementVisibility('#voicePopupOverlay');
        this.checkElementVisibility('#voicePopupOverlay .overlay-controls');
        this.checkElementVisibility('#voicePopupOverlay .overlay-controls .mute');
        this.checkElementVisibility('#voicePopupOverlay .overlay-controls .close');
    }

    // Utility method for debugging element visibility
    checkElementVisibility(selector) {
        const element = document.querySelector(selector);
        if (!element) {
            console.log(`Element not found: ${selector}`);
            return;
        }
        
        const style = window.getComputedStyle(element);
        console.log(`Element: ${selector}`);
        console.log(`- Display: ${style.display}`);
        console.log(`- Visibility: ${style.visibility}`);
        console.log(`- Opacity: ${style.opacity}`);
        console.log(`- Z-index: ${style.zIndex}`);
        console.log(`- Position: ${style.position}`);
    }

    // Update voice status text in UI
    updateVoiceStatus(status) {
        // Update status text in multiple places for consistent feedback
        const statusElement = document.getElementById('voiceStatus');
        if (statusElement) {
            statusElement.textContent = status;
        }
        
        // Update speaker indicator if available
        if (this.elements.speakerIndicator) {
            this.elements.speakerIndicator.textContent = status;
        }
        
        // Update any voice status text elements in the popup
        const voiceStatusText = document.querySelector('.voice-status-text');
        if (voiceStatusText) {
            voiceStatusText.textContent = status;
        }
        
        // Log status change in debug mode
        this.debug('Voice status changed:', status);
    }

    // Debug logging method with timestamp
    debug(message, data = null) {
        if (this.debugMode) {
            const timestamp = new Date().toISOString().split('T')[1].split('.')[0]; // HH:MM:SS
            console.log(`[${timestamp}] ${message}`, data || '');
            
            // Update debug panel if it exists
            const debugPanel = document.getElementById('voiceDebugInfo');
            if (debugPanel) {
                const debugLine = document.createElement('div');
                debugLine.className = 'debug-entry';
                
                const timestampSpan = document.createElement('span');
                timestampSpan.className = 'debug-timestamp';
                timestampSpan.textContent = `[${timestamp}] `;
                
                const messageSpan = document.createElement('span');
                messageSpan.className = 'debug-message';
                messageSpan.textContent = message;
                
                debugLine.appendChild(timestampSpan);
                debugLine.appendChild(messageSpan);
                
                if (data) {
                    const dataSpan = document.createElement('pre');
                    dataSpan.className = 'debug-context';
                    dataSpan.textContent = typeof data === 'object' ? 
                        JSON.stringify(data, null, 2) : String(data);
                    debugLine.appendChild(dataSpan);
                }
                
                debugPanel.appendChild(debugLine);
                
                // Keep only last 50 messages
                while (debugPanel.childNodes.length > 50) {
                    debugPanel.removeChild(debugPanel.firstChild);
                }
            }
        }
    }

    // Clean up resources
    cleanup() {
        // Clear all intervals
        clearInterval(this.requestReset);
        if (this.volumeDetectionInterval) {
            clearInterval(this.volumeDetectionInterval);
        }
        
        // Stop listening and release media resources
        this.stopListening(true);
        
        // Close audio context
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close().catch(error => {
                console.warn('Error closing audio context:', error);
            });
        }
        
        // Interrupt any ongoing speech
        this.interruptSpeech();
        
        // Reset UI
        this.resetVoiceUI();
        
        // Save any pending conversation history
        if (this.isInConversation) {
            this.saveConversationHistory();
        }
    }

    // Add event listener for page unload to clean up resources
    setupUnloadHandler() {
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    // Toggle AI voice mute state
    toggleAIMute() {
        this.isAIMuted = !this.isAIMuted;
        
        // Save state to localStorage
        localStorage.setItem('aiMuted', this.isAIMuted.toString());
        
        // Update audio service mute state
        if (this.audioService) {
            this.audioService.setAIMute(this.isAIMuted);
        }
        
        // If we're muting, stop any current speech
        if (this.isAIMuted) {
            this.interruptSpeech();
        }
        
        console.log(`AI voice ${this.isAIMuted ? 'muted' : 'unmuted'}`);
        return this.isAIMuted;
    }
    
    // Toggle user microphone mute state
    toggleUserMute() {
        this.isUserMuted = !this.isUserMuted;
        
        // Save state to localStorage
        localStorage.setItem('userMuted', this.isUserMuted.toString());
        
        // Update audio service mute state
        if (this.audioService) {
            this.audioService.setUserMute(this.isUserMuted);
        }
        
        console.log(`User microphone ${this.isUserMuted ? 'muted' : 'unmuted'}`);
        return this.isUserMuted;
    }
}

// Initialize voice chat when script is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.voiceChat = new VoiceChat();
});

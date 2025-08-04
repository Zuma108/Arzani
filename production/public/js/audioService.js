class AudioService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.currentAudioContext = null; // Consistent naming
        this.queue = [];
        this.isPlaying = false;
        this.currentAudio = null;
        this.abortController = null;
    }

    // Optimize the initialization of the audio context
    async initializeAudioContext() {
        if (!this.currentAudioContext) {
            try {
                // Try to use pre-initialized context if available
                if (window._preInitializedAudioContext) {
                    console.log('Using pre-initialized audio context');
                    this.currentAudioContext = window._preInitializedAudioContext;
                    if (this.currentAudioContext.state === 'suspended') {
                        await this.currentAudioContext.resume();
                    }
                    return this.currentAudioContext;
                }
                
                // Otherwise create a new one
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                this.currentAudioContext = new AudioContext({
                    latencyHint: 'interactive',
                    sampleRate: 44100
                });
                
                // Create a silent oscillator to warm up the audio context
                const oscillator = this.currentAudioContext.createOscillator();
                const gainNode = this.currentAudioContext.createGain();
                gainNode.gain.value = 0; // Silent
                oscillator.connect(gainNode);
                gainNode.connect(this.currentAudioContext.destination);
                oscillator.start(0);
                oscillator.stop(0.1); // Just a short burst to initialize
                
                console.log('Audio context initialized');
            } catch (err) {
                console.error('Error initializing audio context:', err);
                throw err;
            }
        }
        
        if (this.currentAudioContext.state === 'suspended') {
            await this.currentAudioContext.resume();
        }
        
        return this.currentAudioContext;
    }

    getAudioContext() {
        return this.currentAudioContext; // Consistent naming
    }

    async createSpeech(text) {
        try {
            await this.initializeAudioContext();

            const response = await fetch('https://api.openai.com/v1/audio/speech', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: "tts-1",
                    voice: "shimmer",
                    input: text,
                    speed: 2.0,
                    response_format: "mp3",
                    quality: "high"
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'TTS request failed');
            }

            const audioBuffer = await response.arrayBuffer();
            return await this.currentAudioContext.decodeAudioData(audioBuffer);
        } catch (error) {
            console.error('Speech creation failed:', error);
            throw error;
        }
    }

    async playAudio(audioBuffer) {
        try {
            await this.initializeAudioContext();
            
            return new Promise((resolve, reject) => {
                const source = this.currentAudioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(this.currentAudioContext.destination);
                
                source.onended = () => {
                    this.isPlaying = false;
                    resolve();
                };

                source.onerror = (error) => {
                    this.isPlaying = false;
                    reject(error);
                };

                source.start(0);
                this.isPlaying = true;
                this.currentSource = source;
            });
        } catch (error) {
            console.error('Audio playback failed:', error);
            throw error;
        }
    }

    async playAudioBuffer(audioBase64) {
        if (!this.currentAudioContext) {
            await this.initializeAudioContext();
        }

        const base64 = audioBase64.split(',')[1];
        const binaryString = window.atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const audioBuffer = await this.currentAudioContext.decodeAudioData(bytes.buffer);
        const source = this.currentAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.currentAudioContext.destination);
        source.start(0);

        return new Promise(resolve => {
            source.onended = resolve;
        });
    }

    async queueAudio(text, priority = false) {
        if (priority) {
            this.queue.unshift(text);
        } else {
            this.queue.push(text);
        }

        if (!this.isPlaying) {
            await this.processQueue();
        }
    }

    async processQueue() {
        if (this.isProcessingQueue) return;
        
        try {
            this.isProcessingQueue = true;
            
            while (this.queue.length > 0) {
                this.isPlaying = true;
                const text = this.queue.shift();

                try {
                    this.abortController = new AbortController();
                    const response = await fetch('https://api.openai.com/v1/audio/speech', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${this.apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            model: 'tts-1',
                            input: text,
                            voice: 'shimmer',
                            speed: 1.1
                        }),
                        signal: this.abortController.signal
                    });

                    if (!response.ok) throw new Error('TTS request failed');

                    const audioBlob = await response.blob();
                    const audioUrl = URL.createObjectURL(audioBlob);
                    
                    // Wait for current audio to finish before playing next
                    await this.playAudio(audioUrl);
                    URL.revokeObjectURL(audioUrl);

                } catch (error) {
                    if (error.name === 'AbortError') {
                        console.log('Audio playback aborted');
                        break; // Exit the loop if aborted
                    } else {
                        console.error('Audio processing error:', error);
                    }
                }
            }
        } finally {
            this.isProcessingQueue = false;
            this.isPlaying = false;
        }
    }

    playAudio(url) {
        return new Promise((resolve, reject) => {
            const audio = new Audio(url);
            this.currentAudio = audio;

            audio.onended = () => {
                this.currentAudio = null;
                resolve();
            };

            audio.onerror = (error) => {
                this.currentAudio = null;
                reject(error);
            };

            audio.play().catch(reject);
        });
    }

    stop() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
        if (this.abortController) {
            this.abortController.abort();
        }
        this.queue = []; // Clear the queue
        this.isPlaying = false;
        this.isProcessingQueue = false;
    }

    async createAudioSource(text, options = {}) {
        try {
            if (!this.currentAudioContext) {
                await this.initializeAudioContext();
            }

            // Add timeout for better diagnostics
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            console.log('Requesting TTS for:', text.substring(0, 50) + '...');
            
            const response = await fetch('https://api.openai.com/v1/audio/speech', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'tts-1',
                    input: text,
                    voice: 'shimmer',
                    speed: options.rate || 1.0
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                console.error('TTS error status:', response.status);
                throw new Error(`TTS request failed with status: ${response.status}`);
            }

            console.log('TTS response received, processing audio...');
            const audioBlob = await response.blob();
            console.log('Audio blob received:', audioBlob.size, 'bytes');
            const audioBuffer = await this.currentAudioContext.decodeAudioData(await audioBlob.arrayBuffer());
            console.log('Audio decoded successfully, duration:', audioBuffer.duration);
            
            const source = this.currentAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            
            // Create gain controller for volume
            const gainNode = this.currentAudioContext.createGain();
            gainNode.gain.value = options.volume || 1.0;
            
            // Connect audio pipeline
            source.connect(gainNode);
            gainNode.connect(this.currentAudioContext.destination);
            
            if (options.onEnd) {
                source.onended = options.onEnd;
            }

            console.log('Audio source ready for playback');
            return {
                start: () => {
                    return new Promise((resolve, reject) => {
                        try {
                            console.log('Starting audio playback');
                            source.start(0);
                            source.onended = () => {
                                console.log('Audio playback complete');
                                resolve();
                            };
                        } catch (error) {
                            console.error('Audio start error:', error);
                            reject(error);
                        }
                    });
                },
                stop: () => {
                    try {
                        console.log('Stopping audio playback');
                        source.stop();
                        source.disconnect();
                        gainNode.disconnect();
                    } catch (error) {
                        console.warn('Error stopping audio source:', error);
                    }
                }
            };
        } catch (error) {
            console.error('Error creating audio source:', error);
            throw error;
        }
    }

    async createAudioSourceFast(text, options = {}) {
        try {
            // If AI is muted, return a dummy audio source that does nothing
            if (this.isAIMuted) {
                console.log('AI is muted, skipping audio synthesis');
                return {
                    start: () => Promise.resolve(),
                    stop: () => {}
                };
            }

            if (!this.currentAudioContext) {
                await this.initializeAudioContext();
            }

            // Make sure the audio context is running
            if (this.currentAudioContext.state !== 'running') {
                await this.currentAudioContext.resume();
            }

            // Add logging for debugging
            console.log('Creating fast audio source for text:', text.substring(0, 30) + '...');
            
            // Use smaller chunks or prioritize speed based on text length
            const useHighQuality = text.length > 100;
            
            // Add timeout for better diagnostics
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const response = await fetch('https://api.openai.com/v1/audio/speech', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'tts-1',
                    input: text,
                    voice: 'shimmer',
                    speed: options.rate || 1.0,
                    response_format: useHighQuality ? "mp3" : "opus", // opus is typically faster
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                console.error('TTS error status:', response.status);
                throw new Error(`TTS request failed with status: ${response.status}`);
            }

            console.log('TTS response received, processing audio...');
            
            // Process in parallel
            const audioBlob = await response.blob();
            console.log('Audio blob received:', audioBlob.size, 'bytes');
            
            const audioArrayBuffer = await audioBlob.arrayBuffer();
            console.log('Audio array buffer created:', audioArrayBuffer.byteLength, 'bytes');
            
            const audioBuffer = await this.currentAudioContext.decodeAudioData(audioArrayBuffer);
            console.log('Audio decoded successfully, duration:', audioBuffer.duration);
            
            const source = this.currentAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            
            // Create gain controller
            const gainNode = this.currentAudioContext.createGain();
            gainNode.gain.value = options.volume || 1.0;
            
            // Connect audio pipeline
            source.connect(gainNode);
            gainNode.connect(this.currentAudioContext.destination);
            
            if (options.onEnd) {
                source.onended = options.onEnd;
            }

            // Create a more efficient audio source object
            let isPlaying = false;
            console.log('Audio source ready for playback');
            
            return {
                start: () => {
                    return new Promise((resolve) => {
                        if (isPlaying) return resolve();
                        isPlaying = true;
                        
                        const originalOnEnded = source.onended;
                        source.onended = () => {
                            console.log('Audio playback complete');
                            isPlaying = false;
                            if (originalOnEnded) originalOnEnded();
                            resolve();
                        };
                        
                        console.log('Starting audio playback');
                        source.start(0);
                    });
                },
                stop: () => {
                    if (!isPlaying) return;
                    try {
                        console.log('Stopping audio playback');
                        source.stop();
                        source.disconnect();
                        gainNode.disconnect();
                        isPlaying = false;
                    } catch (error) {
                        console.warn('Error stopping audio source:', error);
                    }
                }
            };
        } catch (error) {
            console.error('Error creating fast audio source:', error);
            throw error;
        }
    }

    /**
     * Set AI voice mute state
     * @param {boolean} muted - Whether to mute AI voice
     */
    setAIMute(muted) {
        this.isAIMuted = muted;
        
        // If muting, stop any currently playing audio
        if (muted) {
            this.stopAllAudio();
        }
    }

    /**
     * Stop all currently playing audio
     */
    stopAllAudio() {
        // Stop current audio element if it exists
        if (this.currentAudioElement) {
            this.currentAudioElement.pause();
            this.currentAudioElement.currentTime = 0;
        }
        
        // Stop any buffer source
        if (this.currentSource) {
            try {
                this.currentSource.stop();
                this.currentSource.disconnect();
            } catch (e) {
                console.warn("Error stopping current source:", e);
            }
        }
        
        // Clear audio queue
        this.queue = [];
        this.isPlaying = false;
        
        // Any additional resources that need cleaning up
        if (this.gainNode) {
            try {
                this.gainNode.disconnect();
            } catch (e) {
                console.warn("Error disconnecting gain node:", e);
            }
        }
        
        console.log('All audio playback stopped');
    }

    /**
     * Set user microphone mute state
     * @param {boolean} muted - Whether to mute user microphone
     */
    setUserMute(muted) {
        this.isUserMuted = muted;
        
        // If there's an active microphone stream
        if (this.microphoneStream) {
            const audioTracks = this.microphoneStream.getAudioTracks();
            audioTracks.forEach(track => {
                track.enabled = !muted;
            });
        }
    }
}

export { AudioService };

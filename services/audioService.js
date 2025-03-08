class AudioService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.currentAudioContext = null;
        this.source = null;
        this.settings = {
            voice: 'shimmer',
            rate: 1.3, // Increased from 1.2
            volume: 1.0
        };
    }

    async initializeAudioContext() {
        if (!this.currentAudioContext) {
            this.currentAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.currentAudioContext.state === 'suspended') {
            await this.currentAudioContext.resume();
        }
        return this.currentAudioContext;
    }

    async createAudioSource(text, options = {}) {
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'tts-1',
                voice: this.settings.voice,
                input: text
            })
        });

        if (!response.ok) {
            throw new Error('TTS request failed');
        }

        const arrayBuffer = await response.arrayBuffer();
        const audioContext = await this.initializeAudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.playbackRate.value = options.rate || this.settings.rate;

        const gainNode = audioContext.createGain();
        gainNode.gain.value = this.settings.volume;

        source.connect(gainNode);
        gainNode.connect(audioContext.destination);

        if (options.onEnd) {
            source.onended = options.onEnd;
        }

        return {
            start: () => {
                return new Promise((resolve) => {
                    source.onended = () => {
                        if (options.onEnd) options.onEnd();
                        resolve();
                    };
                    source.start(0);
                });
            },
            stop: () => {
                try {
                    source.stop(0);
                } catch (error) {
                    console.warn('Audio stop error:', error);
                }
            }
        };
    }

    stop() {
        if (this.source) {
            try {
                this.source.stop(0);
            } catch (error) {
                console.warn('Stop error:', error);
            }
            this.source = null;
        }
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
    }
}

export default AudioService;

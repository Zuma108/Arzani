// Pre-initialize voice systems
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('Audio preloader: Initializing audio context');
        
        // Try to initialize audio context early
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            const audioContext = new AudioContext();
            
            // Create a silent sound to activate the audio context
            const buffer = audioContext.createBuffer(1, 1, 22050);
            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContext.destination);
            source.start(0);
            
            console.log('Audio context pre-initialized:', audioContext.state);
            
            // Store for later use
            window._preInitializedAudioContext = audioContext;
            
            // Add a click handler to resume audio context on first user interaction
            document.addEventListener('click', function resumeAudioContext() {
                if (audioContext.state === 'suspended') {
                    audioContext.resume().then(() => {
                        console.log('Audio context resumed on user interaction');
                    });
                }
                // Remove the event listener after first click
                document.removeEventListener('click', resumeAudioContext);
            }, { once: true });
        }
        
        // Pre-fetch OpenAI model info to warm up connection
        if (window.OPENAI_CONFIG?.apiKey) {
            const modelResponse = await fetch('https://api.openai.com/v1/models', {
                headers: {
                    'Authorization': `Bearer ${window.OPENAI_CONFIG.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (modelResponse.ok) {
                console.log('OpenAI connection pre-initialized');
            }
        }
    } catch (error) {
        console.log('Pre-initialization failed (non-critical):', error);
    }
});

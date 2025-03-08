import express from 'express';
import OpenAI from 'openai';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const OPENAI_CONFIG = {
    model: 'gpt-4',
    ttsModel: 'tts-1',
    voice: 'shimmer',
    whisperModel: 'whisper-1'
};

// Main routes
router.get('/talk-to-arzani', (req, res) => {
    res.render('talk-to-arzani');
});

// Update the voice chat endpoint
router.post('/api/voice-chat', async (req, res) => {
    try {
        const { audioInput, text } = req.body;
        
        // Get input either from direct text or audio transcription
        let userInput = text;
        if (audioInput) {
            const transcription = await openai.audio.transcriptions.create({
                file: Buffer.from(audioInput.split(',')[1], 'base64'),
                model: OPENAI_CONFIG.whisperModel
            });
            userInput = transcription.text;
        }

        // Get marketplace context
        const businessData = await pool.query(`
            SELECT id, business_name, industry, price, description 
            FROM businesses 
            ORDER BY date_listed DESC 
            LIMIT 10
        `);

        // Generate completion
        const completion = await openai.chat.completions.create({
            model: OPENAI_CONFIG.model,
            messages: [
                {
                    role: 'system',
                    content: `You are Arzani, a helpful UK business marketplace assistant.
                             Context: ${JSON.stringify(businessData.rows)}`
                },
                { role: 'user', content: userInput }
            ],
            temperature: 0.7
        });

        const responseText = completion.choices[0].message.content;

        // Generate speech
        const speechResponse = await openai.audio.speech.create({
            model: OPENAI_CONFIG.ttsModel,
            voice: OPENAI_CONFIG.voice,
            input: responseText
        });

        const audioBuffer = await speechResponse.arrayBuffer();
        const audioBase64 = Buffer.from(audioBuffer).toString('base64');

        res.json({
            response: responseText,
            audio: `data:audio/mp3;base64,${audioBase64}`,
            businessContext: businessData.rows
        });

    } catch (error) {
        console.error('Voice chat error:', error);
        res.status(500).json({ error: 'Voice processing failed' });
    }
});

// Voice transcription endpoint
router.post('/transcribe', authenticateToken, async (req, res) => {
    try {
        if (!req.files || !req.files.audio) {
            return res.status(400).json({ error: 'No audio file provided' });
        }

        const transcription = await openai.audio.transcriptions.create({
            file: req.files.audio,
            model: 'whisper-1'
        });

        res.json({ text: transcription.text });
    } catch (error) {
        console.error('Transcription error:', error);
        res.status(500).json({ error: 'Failed to transcribe audio' });
    }
});

// Text-to-speech endpoint
router.post('/synthesize', authenticateToken, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ error: 'No text provided' });
        }

        const mp3 = await openai.audio.speech.create({
            model: 'tts-1',
            voice: 'shimmer',
            input: text
        });

        const buffer = Buffer.from(await mp3.arrayBuffer());
        res.setHeader('Content-Type', 'audio/mpeg');
        res.send(buffer);
    } catch (error) {
        console.error('Speech synthesis error:', error);
        res.status(500).json({ error: 'Failed to synthesize speech' });
    }
});

export default router;

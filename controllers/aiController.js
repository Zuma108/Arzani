/**
 * AI Controller - Handles AI chat and suggestions
 */

const axios = require('axios');
const User = require('../models/user');
const AiCredit = require('../models/aiCredit');
const AssistantInteraction = require('../models/assistantInteraction');
const config = require('../config');

// AI API configuration
const AI_API_KEY = config.ai.apiKey;
const AI_API_URL = config.ai.apiUrl;
const AI_MODEL = config.ai.model || 'gpt-4';
const DEFAULT_CREDITS_PER_USER = config.ai.defaultCreditsPerUser || 30;
const CREDIT_REFRESH_INTERVAL = config.ai.creditRefreshInterval || 'monthly';

/**
 * Handle chat message to AI assistant
 */
exports.chatWithAssistant = async (req, res) => {
    try {
        const { message, conversationId } = req.body;
        const userId = req.user.id;

        // Check if user has available credits
        const aiCredit = await getOrCreateAiCredit(userId);
        
        if (aiCredit.credits <= 0) {
            return res.status(403).json({
                success: false,
                message: 'You have used all your AI credits for this period',
                creditsRemaining: 0
            });
        }

        // Call AI API
        const response = await callAiApi(message, userId, conversationId);
        
        // Save interaction to database
        await saveAssistantInteraction(userId, conversationId, message, response, 1);
        
        // Deduct credits
        const creditsUsed = 1;
        aiCredit.credits -= creditsUsed;
        await aiCredit.save();
        
        // Return the AI response
        return res.json({
            success: true,
            response: response,
            creditsUsed,
            creditsRemaining: aiCredit.credits
        });
    } catch (error) {
        console.error('Error in AI chat:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while processing your request'
        });
    }
};

/**
 * Get AI suggestion for regular chat
 */
exports.getAiSuggestion = async (req, res) => {
    try {
        const { query, conversationId } = req.body;
        const userId = req.user.id;

        // Check if user has available credits
        const aiCredit = await getOrCreateAiCredit(userId);
        
        if (aiCredit.credits <= 0) {
            return res.status(403).json({
                success: false,
                message: 'You have used all your AI credits for this period',
                creditsRemaining: 0
            });
        }

        // Formulate a prompt specifically for suggesting content
        const prompt = `Based on the following query related to a business marketplace conversation, provide a helpful suggestion: ${query}`;
        
        // Call AI API
        const suggestion = await callAiApi(prompt, userId, conversationId);
        
        // Save interaction to database
        await saveAssistantInteraction(userId, conversationId, query, suggestion, 1, 'suggestion');
        
        // Deduct credits
        const creditsUsed = 1;
        aiCredit.credits -= creditsUsed;
        await aiCredit.save();
        
        // Return the AI suggestion
        return res.json({
            success: true,
            suggestion: suggestion,
            creditsUsed,
            creditsRemaining: aiCredit.credits
        });
    } catch (error) {
        console.error('Error in AI suggestion:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while processing your request'
        });
    }
};

/**
 * Get user's AI credits
 */
exports.getAiCredits = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get or create user AI credits
        const aiCredit = await getOrCreateAiCredit(userId);
        
        return res.json({
            success: true,
            credits: aiCredit.credits,
            refreshDate: aiCredit.nextRefreshDate,
            maxCredits: aiCredit.maxCredits
        });
    } catch (error) {
        console.error('Error getting AI credits:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while processing your request'
        });
    }
};

/**
 * Helper function to get or create AI credits for a user
 */
async function getOrCreateAiCredit(userId) {
    let aiCredit = await AiCredit.findOne({ userId });
    
    if (!aiCredit) {
        // Create new AI credit record for user
        aiCredit = new AiCredit({
            userId,
            credits: DEFAULT_CREDITS_PER_USER,
            maxCredits: DEFAULT_CREDITS_PER_USER,
            nextRefreshDate: calculateNextRefreshDate()
        });
        
        await aiCredit.save();
    } else {
        // Check if credits need to be refreshed
        const now = new Date();
        if (now >= new Date(aiCredit.nextRefreshDate)) {
            aiCredit.credits = aiCredit.maxCredits;
            aiCredit.nextRefreshDate = calculateNextRefreshDate();
            await aiCredit.save();
        }
    }
    
    return aiCredit;
}

/**
 * Helper function to calculate next refresh date based on refresh interval
 */
function calculateNextRefreshDate() {
    const now = new Date();
    let nextRefreshDate = new Date(now);
    
    switch (CREDIT_REFRESH_INTERVAL.toLowerCase()) {
        case 'daily':
            nextRefreshDate.setDate(nextRefreshDate.getDate() + 1);
            nextRefreshDate.setHours(0, 0, 0, 0);
            break;
        case 'weekly':
            nextRefreshDate.setDate(nextRefreshDate.getDate() + (7 - nextRefreshDate.getDay()));
            nextRefreshDate.setHours(0, 0, 0, 0);
            break;
        case 'monthly':
        default:
            nextRefreshDate.setMonth(nextRefreshDate.getMonth() + 1);
            nextRefreshDate.setDate(1);
            nextRefreshDate.setHours(0, 0, 0, 0);
    }
    
    return nextRefreshDate;
}

/**
 * Helper function to call AI API
 */
async function callAiApi(message, userId, conversationId) {
    try {
        // Get user details for better context
        const user = await User.findById(userId).select('name email');
        
        // Get recent interactions for context
        let recentInteractions = [];
        if (conversationId) {
            recentInteractions = await AssistantInteraction.find({
                userId,
                conversationId
            })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('userMessage botResponse')
            .lean();
            
            // Reverse to get chronological order
            recentInteractions.reverse();
        }
        
        // Format recent interactions for context
        const conversationHistory = recentInteractions.map(interaction => ({
            role: 'user',
            content: interaction.userMessage
        })).concat(recentInteractions.map(interaction => ({
            role: 'assistant',
            content: interaction.botResponse
        })));
        
        // System message providing context about the platform
        const systemMessage = {
            role: 'system',
            content: `You are an AI assistant for a business marketplace platform. You help users with market research, business valuations, negotiation strategies, and other business-related questions. The user's name is ${user.name}. Be professional, concise, and helpful.`
        };
        
        // Format messages for API
        const messages = [
            systemMessage,
            ...conversationHistory,
            {
                role: 'user',
                content: message
            }
        ];
        
        // Make API call
        const response = await axios.post(AI_API_URL, {
            model: AI_MODEL,
            messages: messages,
            temperature: 0.7,
            max_tokens: 1000
        }, {
            headers: {
                'Authorization': `Bearer ${AI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('Error calling AI API:', error);
        throw new Error('Failed to get response from AI service');
    }
}

/**
 * Helper function to save assistant interaction
 */
async function saveAssistantInteraction(userId, conversationId, userMessage, botResponse, creditsUsed, type = 'chat') {
    try {
        const interaction = new AssistantInteraction({
            userId,
            conversationId,
            userMessage,
            botResponse,
            creditsUsed,
            type
        });
        
        await interaction.save();
    } catch (error) {
        console.error('Error saving assistant interaction:', error);
        // Don't throw error, continue gracefully
    }
}

/**
 * Get AI interaction history for a user
 */
exports.getInteractionHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { conversationId } = req.params;
        
        // Get interaction history
        const interactions = await AssistantInteraction.find({
            userId,
            ...(conversationId && { conversationId })
        })
        .sort({ createdAt: 1 })
        .select('userMessage botResponse type createdAt')
        .lean();
        
        return res.json({
            success: true,
            interactions
        });
    } catch (error) {
        console.error('Error getting AI interaction history:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while retrieving interaction history'
        });
    }
};
/**
 * Assistant Interaction model - Tracks user interactions with AI
 */

const mongoose = require('mongoose');

const assistantInteractionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    conversationId: {
        type: String,
        index: true
    },
    userMessage: {
        type: String,
        required: true
    },
    botResponse: {
        type: String,
        required: true
    },
    creditsUsed: {
        type: Number,
        required: true,
        default: 1
    },
    type: {
        type: String,
        enum: ['chat', 'suggestion'],
        default: 'chat'
    }
}, { timestamps: true });

// Create compound index on userId and conversationId
assistantInteractionSchema.index({ userId: 1, conversationId: 1 });

module.exports = mongoose.model('AssistantInteraction', assistantInteractionSchema);
/**
 * AI Credit model - Tracks user credits for AI interactions
 */

const mongoose = require('mongoose');

const aiCreditSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    totalCredits: {
        type: Number,
        required: true,
        default: 50 // Default starting credits
    },
    usedCredits: {
        type: Number,
        required: true,
        default: 0
    },
    lastReset: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Virtual for available credits
aiCreditSchema.virtual('availableCredits').get(function() {
    return this.totalCredits - this.usedCredits;
});

// Method to use credits
aiCreditSchema.methods.useCredits = async function(amount) {
    if (this.availableCredits < amount) {
        return false; // Not enough credits
    }
    
    this.usedCredits += amount;
    await this.save();
    return true;
};

// Method to add credits
aiCreditSchema.methods.addCredits = async function(amount) {
    this.totalCredits += amount;
    await this.save();
    return true;
};

// Ensure virtuals are included in JSON
aiCreditSchema.set('toJSON', { virtuals: true });
aiCreditSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('AiCredit', aiCreditSchema);
/**
 * Simple OpenAI helper function
 * Provides a basic interface for calling OpenAI API
 */

import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Call OpenAI API with a simple prompt
 * @param {string} prompt - The prompt to send to OpenAI
 * @param {Object} options - Optional parameters
 * @returns {string} The response from OpenAI
 */
export async function callOpenAI(prompt, options = {}) {
  try {
    const {
      model = 'gpt-4',
      maxTokens = 1000,
      temperature = 0.7
    } = options;

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: maxTokens,
      temperature: temperature
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    throw new Error(`OpenAI API call failed: ${error.message}`);
  }
}

export default { callOpenAI };

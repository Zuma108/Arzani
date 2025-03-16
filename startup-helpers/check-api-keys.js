/**
 * Utility to check if API keys are properly configured
 * and if GPT-4o is available for the current OpenAI API key
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

export async function checkOpenAIAPIKey() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ OpenAI API key not found in environment variables');
    return false;
  }
  
  try {
    const openai = new OpenAI({ apiKey });
    
    // Test with a simple query
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // Test with a model that should always work
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 5
    });
    
    console.log('✅ OpenAI API key is valid');
    return true;
  } catch (error) {
    console.error('❌ OpenAI API key is invalid:', error.message);
    return false;
  }
}

export async function checkGPT4oAvailability() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ OpenAI API key not found in environment variables');
    return false;
  }
  
  try {
    const openai = new OpenAI({ apiKey });
    
    // Test with GPT-4o
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 5
    });
    
    console.log('✅ GPT-4o is available for this API key');
    return true;
  } catch (error) {
    console.error('❌ GPT-4o is not available:', error.message);
    console.error('You may need to join the GPT-4o waitlist or upgrade your OpenAI plan');
    return false;
  }
}

// Execute if this script is run directly
if (process.argv[1].endsWith('check-api-keys.js')) {
  Promise.all([
    checkOpenAIAPIKey(),
    checkGPT4oAvailability()
  ]).then(([apiKeyValid, gpt4oAvailable]) => {
    if (apiKeyValid && gpt4oAvailable) {
      console.log('✅ All API keys are valid and GPT-4o is available');
      process.exit(0);
    } else {
      console.error('❌ API key validation failed');
      process.exit(1);
    }
  }).catch(error => {
    console.error('Error checking API keys:', error);
    process.exit(1);
  });
}

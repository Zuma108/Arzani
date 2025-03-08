import OpenAI from 'openai';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

export default class ChatService {
    constructor(businessMetricsService) {
        this.businessMetricsService = businessMetricsService;
        
        // Verify API key exists
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is not set in environment variables');
        }

        // Initialize OpenAI with configuration
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            timeout: 30000, // 30 second timeout
            maxRetries: 3 // Allow 3 retries
        });
    }

    async testConnection() {
        try {
            await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [{ role: "system", content: "Test connection" }],
                max_tokens: 5
            });
            return true;
        } catch (error) {
            console.error('OpenAI connection test failed:', error);
            return false;
        }
    }

    async processQuery(userMessage, marketplaceData) {
        // Add retry logic
        const maxRetries = 3;
        let lastError = null;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                // Test connection before making the actual request
                const isConnected = await this.testConnection();
                if (!isConnected) {
                    throw new Error('Cannot connect to OpenAI API');
                }

                // Get additional metrics if available
                let metrics = {};
                try {
                    metrics = await this.businessMetricsService.getAllIndustryMetrics();
                } catch (error) {
                    console.warn('Could not fetch industry metrics:', error);
                }

                // Format marketplace data for the AI
                const formattedBusinesses = marketplaceData.map(business => ({
                    name: business.business_name,
                    industry: business.industry,
                    price: `£${parseFloat(business.price).toLocaleString()}`,
                    location: business.location,
                    revenue: business.gross_revenue ? `£${parseFloat(business.gross_revenue).toLocaleString()}` : 'Not disclosed',
                    ebitda: business.ebitda ? `£${parseFloat(business.ebitda).toLocaleString()}` : 'Not disclosed'
                }));

                const completion = await this.openai.chat.completions.create({
                    model: "gpt-4",
                    messages: [
                        {
                            role: "system",
                            content: `You are Arzani, a knowledgeable UK business marketplace assistant. 
                            
                            Current marketplace data:
                            ${JSON.stringify(formattedBusinesses)}
                            
                            Industry metrics and trends:
                            ${JSON.stringify(metrics)}
                            
                            Guidelines:
                            1. Use British English and GBP (£)
                            2. Focus on providing accurate information about available businesses
                            3. Never share business IDs or sensitive details
                            4. Be professional yet conversational
                            5. If you need more specific information, ask clarifying questions
                            6. Provide relevant business recommendations based on user queries`
                        },
                        {
                            role: "user",
                            content: userMessage
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 500
                });

                return completion.choices[0].message.content;

            } catch (error) {
                console.error(`Attempt ${attempt + 1} failed:`, error);
                lastError = error;

                // If it's not a connection error, don't retry
                if (!error.message.includes('ENOTFOUND') && 
                    !error.message.includes('timeout') && 
                    !error.message.includes('network')) {
                    throw error;
                }

                // Wait before retrying (exponential backoff)
                if (attempt < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                }
            }
        }

        // If all retries failed, throw the last error
        throw new Error(`Failed after ${maxRetries} attempts. Last error: ${lastError.message}`);
    }
}
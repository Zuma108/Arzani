import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

export default class TrendsChatService {
    constructor(businessMetricsService) {
        this.businessMetricsService = businessMetricsService;
        
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is not set in environment variables');
        }

        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            timeout: 30000,
            maxRetries: 3
        });
    }

    async processQuery(userMessage, trendsData) {
        const maxRetries = 3;
        let lastError = null;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const metrics = await this.businessMetricsService.getAllIndustryMetrics();
                
                const completion = await this.openai.chat.completions.create({
                    model: "gpt-4",
                    messages: [
                        {
                            role: "system",
                            content: `You are Arzani, a market trends analyst specializing in UK business marketplace data.
                            
                            Current market trends data:
                            ${JSON.stringify(trendsData)}
                            
                            Industry metrics:
                            ${JSON.stringify(metrics)}
                            
                            Guidelines:
                            1. Use British English and GBP (£)
                            2. Focus on market trends, patterns, and insights
                            3. Provide data-driven analysis
                            4. Be specific about time periods and changes
                            5. Highlight significant trends and anomalies
                            6. Compare current data with historical patterns`
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

                if (!error.message.includes('ENOTFOUND') && 
                    !error.message.includes('timeout') && 
                    !error.message.includes('network')) {
                    throw error;
                }

                if (attempt < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                }
            }
        }

        throw new Error(`Failed after ${maxRetries} attempts. Last error: ${lastError.message}`);
    }
}

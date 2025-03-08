import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

class ValuationService {
    async calculateValuation(businessData) {
        try {
            // Count valid fields
            const validFields = Object.entries(businessData).filter(([_, value]) => {
                return value !== null && value !== undefined && value !== '';
            });

            if (validFields.length < 8) {
                throw new Error('Minimum 8 fields required for valuation');
            }

            // Format business data for prompt, handling missing values gracefully
            const businessInfo = `
                Industry: ${businessData.industry || 'Not specified'}
                Price: ${businessData.price ? `£${businessData.price}` : 'Not specified'}
                Cash Flow: ${businessData.cashFlow ? `£${businessData.cashFlow}` : 'Not specified'}
                Gross Revenue: ${businessData.grossRevenue ? `£${businessData.grossRevenue}` : 'Not specified'}
                EBITDA: ${businessData.ebitda ? `£${businessData.ebitda}` : 'Not specified'}
                Years in Operation: ${businessData.yearsInOperation || 'Not specified'}
                Location: ${businessData.location || 'Not specified'}
                Employees: ${businessData.employees || 'Not specified'}
                Growth Rate: ${businessData.growthRate ? `${businessData.growthRate}%` : 'Not specified'}
                Sales Multiple: ${businessData.salesMultiple || 'Not specified'}
                Profit Margin: ${businessData.profitMargin || 'Not specified'}
                Debt Service: ${businessData.debtService || 'Not specified'}
                Cash on Cash: ${businessData.cashOnCash || 'Not specified'}
                Down Payment: ${businessData.downPayment || 'Not specified'}
                FFE: ${businessData.ffe || 'Not specified'}
                Inventory: ${businessData.inventory || 'Not specified'}
                Recurring Revenue: ${businessData.recurringRevenue ? `${businessData.recurringRevenue}%` : 'Not specified'}
                Website Traffic: ${businessData.websiteTraffic ? `${businessData.websiteTraffic} monthly visits` : 'Not specified'}
                Social Media Followers: ${businessData.socialFollowers || 'Not specified'}
                Intellectual Property: ${businessData.intellectualProperty || 'Not specified'}
                Business Description: ${businessData.description || 'Not specified'}
            `;

            const completion = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: `You are a UK business valuation expert. You must respond ONLY with a JSON object in this exact format (no additional text):
                        {
                            "minValue": number,
                            "maxValue": number,
                            "confidence": number between 0-100,
                            "explanation": "string explanation",
                            "insights": ["string array of insights"]
                        }`
                    },
                    {
                        role: "user",
                        content: `Based on this business data, provide a valuation: ${businessInfo}`
                    }
                ],
                temperature: 0.7,
                response_format: { type: "json_object" } // Add this line to ensure JSON response
            });

            let response;
            try {
                const content = completion.choices[0].message.content.trim();
                console.log('GPT Response:', content); // Debug log
                response = JSON.parse(content);
                
                // Validate response structure and types
                if (!response || typeof response !== 'object') throw new Error('Invalid response format');
                if (!Number.isFinite(response.minValue)) throw new Error('Invalid minValue');
                if (!Number.isFinite(response.maxValue)) throw new Error('Invalid maxValue');
                if (!Number.isFinite(response.confidence)) throw new Error('Invalid confidence');
                if (typeof response.explanation !== 'string') throw new Error('Invalid explanation');
                if (!Array.isArray(response.insights)) throw new Error('Invalid insights');
                
            } catch (parseError) {
                console.error('Failed to parse GPT response:', parseError);
                console.log('Raw response:', completion.choices[0].message.content);
                
                // Use fallback calculation
                response = this.generateFallbackValuation(businessData);
            }

            return {
                valuationRange: {
                    min: Math.round(response.minValue),
                    max: Math.round(response.maxValue)
                },
                confidence: response.confidence,
                explanation: response.explanation,
                insights: Array.isArray(response.insights) ? response.insights : [response.insights]
            };

        } catch (error) {
            console.error('Valuation calculation error:', error);
            
            // Enhanced fallback calculation considering additional metrics
            const baseValue = this.calculateBaseValue(businessData);
            const multiplier = this.calculateMultiplier(businessData);
            
            return {
                valuationRange: {
                    min: Math.round(baseValue * multiplier * 0.8),
                    max: Math.round(baseValue * multiplier * 1.2)
                },
                confidence: this.calculateConfidenceScore(businessData),
                explanation: "Valuation based on comprehensive business metrics including digital presence and growth indicators.",
                insights: this.generateInsights(businessData)
            };
        }
    }

    async calculateAdvancedValuation(businessData) {
        try {
            const {
                industry,
                price,
                cashFlow,
                grossRevenue,
                ebitda,
                inventory,
                salesMultiple,
                profitMargin,
                yearsInOperation,
                recurringRevenue,
                growthRate,
                websiteTraffic,
                socialFollowers,
                intellectualProperty,
                employees,
                location,
                ffe, // FF&E
                debtService,
                downPayment
            } = businessData;

            // Constants (these could be moved to configuration)
            const alpha = {
                ebitda: 0.4,
                cashFlow: 0.1,
                revenue: 0.15,
                inventory: 0.05,
                ffe: 0.05,
                online: 0.1,
                recurring: 0.1,
                debt: 0.05,
                downPayment: 0.05,
                ip: 0.05,
                employees: 0.05
            };

            const beta = {
                websiteTraffic: 0.6,
                socialMedia: 0.4
            };

            const norm = {
                websiteTraffic: 10000,
                socialFollowers: 5000
            };

            // Calculate components
            const onlineFactor = beta.websiteTraffic * (websiteTraffic / norm.websiteTraffic) +
                               beta.socialMedia * (socialFollowers / norm.socialFollowers);
            
            const revenueComponent = grossRevenue * (profitMargin / 100);
            const recurringGrowthComponent = (recurringRevenue / 100) * (growthRate / 100);
            
            // Location quality score based on market data
            const locationScore = this.calculateLocationScore(location);
            
            // Base valuation
            let valuation = 
                alpha.ebitda * (ebitda * salesMultiple) +
                alpha.cashFlow * cashFlow +
                alpha.revenue * revenueComponent +
                alpha.inventory * inventory +
                alpha.ffe * ffe +
                alpha.online * onlineFactor +
                alpha.recurring * recurringGrowthComponent;

            // Growth adjustment
            const growthAdjustment = Math.pow((1 + (growthRate / 100)), yearsInOperation);
            valuation *= growthAdjustment * locationScore;

            // Financial obligations
            valuation -= alpha.debt * debtService;
            valuation -= alpha.downPayment * downPayment;

            // Add intangibles
            const ipValue = this.calculateIntellectualPropertyValue(intellectualProperty);
            valuation += alpha.ip * ipValue;
            valuation += alpha.employees * (employees * 5000); // Assuming £5000 per employee value

            return {
                value: Math.round(valuation),
                confidence: this.calculateAdvancedConfidenceScore(businessData),
                components: {
                    onlineFactor,
                    revenueComponent,
                    recurringGrowthComponent,
                    growthAdjustment,
                    locationScore,
                    ipValue
                }
            };

        } catch (error) {
            console.error('Advanced valuation error:', error);
            throw new Error('Failed to calculate advanced valuation');
        }
    }

    calculateLocationScore(location) {
        // Add location-based scoring logic
        const locationScores = {
            'London': 1.3,
            'Manchester': 1.2,
            'Birmingham': 1.15,
            // Add more cities/regions
            'default': 1.0
        };

        return locationScores[location] || locationScores.default;
    }

    calculateIntellectualPropertyValue(ip) {
        if (!ip) return 0;
        
        // Basic IP valuation logic
        const ipTypes = ip.toLowerCase().split(',').map(t => t.trim());
        let value = 0;

        const ipValues = {
            'patent': 100000,
            'trademark': 50000,
            'copyright': 25000,
            'trade secret': 75000,
            'software': 60000
        };

        ipTypes.forEach(type => {
            Object.entries(ipValues).forEach(([key, baseValue]) => {
                if (type.includes(key)) {
                    value += baseValue;
                }
            });
        });

        return value;
    }

    calculateAdvancedConfidenceScore(businessData) {
        const requiredFields = [
            'industry',
            'price',
            'grossRevenue',
            'ebitda',
            'yearsInOperation',
            'location',
            'employees'
        ];

        const optionalFields = [
            'websiteTraffic',
            'socialFollowers',
            'intellectualProperty',
            'recurringRevenue',
            'growthRate',
            'profitMargin'
        ];

        // Define industry multipliers as a separate object
        const industryMultipliers = {
            'Financial Services': { revenue: { min: 1.0, max: 2.5 }, profit: { min: 3.5, max: 6.0 } },
            'Health Care & Fitness': { revenue: { min: 0.8, max: 1.8 }, profit: { min: 3.0, max: 5.0 } },
            'Manufacturing': { revenue: { min: 0.6, max: 1.2 }, profit: { min: 2.5, max: 4.0 } },
            'Online & Technology': { revenue: { min: 1.0, max: 3.0 }, profit: { min: 4.0, max: 8.0 } },
            'Pet Services': { revenue: { min: 0.5, max: 1.0 }, profit: { min: 2.0, max: 3.5 } },
            'Restaurants & Food': { revenue: { min: 0.3, max: 0.7 }, profit: { min: 1.5, max: 3.0 } },
            'Retail': { revenue: { min: 0.3, max: 0.8 }, profit: { min: 2.0, max: 3.5 } },
            'Service Businesses': { revenue: { min: 0.5, max: 1.5 }, profit: { min: 2.0, max: 4.0 } },
            'Transportation & Storage': { revenue: { min: 0.4, max: 0.9 }, profit: { min: 2.0, max: 3.5 } },
            'Travel': { revenue: { min: 0.4, max: 1.0 }, profit: { min: 2.0, max: 3.5 } },
            'Wholesale & Distributors': { revenue: { min: 0.3, max: 0.7 }, profit: { min: 1.8, max: 3.0 } }
        };

        // Calculate confidence score
        let filledRequired = requiredFields.filter(field => 
            businessData[field] !== undefined && businessData[field] !== null
        ).length;
        
        let filledOptional = optionalFields.filter(field => 
            businessData[field] !== undefined && businessData[field] !== null
        ).length;

        // Weight required fields more heavily than optional fields
        const confidence = ((filledRequired / requiredFields.length) * 0.7 + 
                           (filledOptional / optionalFields.length) * 0.3) * 100;

        return Math.round(confidence);
    }

    calculateBaseValue(businessData) {
        // Convert string values to numbers and handle missing values
        const ebitda = Number(businessData.ebitda) || 0;
        const grossRevenue = Number(businessData.grossRevenue) || 0;
        const cashFlow = Number(businessData.cashFlow) || 0;

        // Use EBITDA as primary metric, fallback to other metrics if not available
        if (ebitda > 0) {
            return ebitda;
        } else if (cashFlow > 0) {
            return cashFlow;
        } else if (grossRevenue > 0) {
            return grossRevenue * 0.15; // Assume 15% profit margin if no other metrics
        }
        return 0;
    }

    calculateMultiplier(businessData) {
        // Get industry-specific multiplier or default
        const industry = businessData.industry || 'default';
        const multipliers = {
            'Financial Services': 4.5,
            'Health Care & Fitness': 4.0,
            'Manufacturing': 3.5,
            'Online & Technology': 5.0,
            'Pet Services': 3.0,
            'Restaurants & Food': 2.5,
            'Retail': 3.0,
            'Service Businesses': 3.5,
            'Transportation & Storage': 3.0,
            'Travel': 3.0,
            'Wholesale & Distributors': 2.5,
            'default': 3.0
        };

        // Base multiplier from industry
        let multiplier = multipliers[industry] || multipliers.default;

        // Adjust multiplier based on business metrics
        const yearsInOperation = Number(businessData.yearsInOperation) || 0;
        const growthRate = Number(businessData.growthRate) || 0;
        const recurringRevenue = Number(businessData.recurringRevenue) || 0;

        // Add premium for established businesses
        if (yearsInOperation > 5) multiplier *= 1.2;
        if (yearsInOperation > 10) multiplier *= 1.3;

        // Add premium for growth
        if (growthRate > 20) multiplier *= 1.2;
        if (growthRate > 50) multiplier *= 1.3;

        // Add premium for recurring revenue
        if (recurringRevenue > 50) multiplier *= 1.2;
        if (recurringRevenue > 80) multiplier *= 1.3;

        return multiplier;
    }

    generateInsights(businessData) {
        const insights = [];
        
        // Add basic insights based on available data
        if (businessData.yearsInOperation > 5) {
            insights.push(`Established business with ${businessData.yearsInOperation} years of operation`);
        }

        if (businessData.growthRate > 0) {
            insights.push(`Showing positive growth rate of ${businessData.growthRate}%`);
        }

        if (businessData.recurringRevenue > 50) {
            insights.push(`Strong recurring revenue at ${businessData.recurringRevenue}%`);
        }

        // Add industry-specific insights
        const industryInsights = {
            'Financial Services': 'Regulated industry with high barriers to entry',
            'Online & Technology': 'High scalability potential in tech sector',
            'Manufacturing': 'Asset-heavy business with tangible value'
            // Add more industry-specific insights as needed
        };

        if (businessData.industry && industryInsights[businessData.industry]) {
            insights.push(industryInsights[businessData.industry]);
        }

        return insights.length > 0 ? insights : ['Basic valuation based on industry standards'];
    }

    validatePrice(askingPrice, valuationRange) {
        const price = parseFloat(askingPrice) || 0;
        const min = parseFloat(valuationRange.min) || 0;
        const max = parseFloat(valuationRange.max) || 0;

        if (price < min) return { 
            status: 'below', 
            difference: Math.round(min - price) 
        };
        if (price > max) return { 
            status: 'above', 
            difference: Math.round(price - max) 
        };
        return { 
            status: 'within', 
            difference: 0 
        };
    }

    calculateConfidenceScore(businessData) {
        const requiredFields = [
            'industry',
            'price',
            'grossRevenue',
            'ebitda',
            'yearsInOperation',
            'location',
            'employees'
        ];

        const optionalFields = [
            'websiteTraffic',
            'socialFollowers',
            'intellectualProperty',
            'recurringRevenue',
            'growthRate',
            'profitMargin'
        ];

        // Calculate filled fields
        const filledRequired = requiredFields.filter(field => 
            businessData[field] !== undefined && 
            businessData[field] !== null && 
            businessData[field] !== ''
        ).length;

        const filledOptional = optionalFields.filter(field => 
            businessData[field] !== undefined && 
            businessData[field] !== null && 
            businessData[field] !== ''
        ).length;

        // Weight required fields more heavily
        const confidence = (
            (filledRequired / requiredFields.length * 0.7) +
            (filledOptional / optionalFields.length * 0.3)
        ) * 100;

        return Math.round(confidence);
    }

    generateFallbackValuation(businessData) {
        const baseValue = this.calculateBaseValue(businessData);
        const multiplier = this.calculateMultiplier(businessData);
        const confidence = this.calculateConfidenceScore(businessData);

        return {
            minValue: Math.round(baseValue * multiplier * 0.8),
            maxValue: Math.round(baseValue * multiplier * 1.2),
            confidence: confidence,
            explanation: "Valuation based on standard industry metrics and business fundamentals.",
            insights: this.generateInsights(businessData)
        };
    }
}

export default new ValuationService();

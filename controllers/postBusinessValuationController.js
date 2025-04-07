import postBusinessValuationService from '../services/postBusinessValuationService.js';

class PostBusinessValuationController {
    /**
     * Calculate business valuation using industry metrics with enhanced asking price integration
     */
    async calculateValuation(req, res) {
        try {
            console.log('Post Business Valuation Controller - calculating valuation');
            
            // Extract all business data from request
            const businessData = req.body;
            
            if (!businessData) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing business data in request body'
                });
            }
            
            // Log the incoming data
            console.log('Valuation request data:', {
                industry: businessData.industry || 'Not specified',
                gross_revenue: businessData.gross_revenue || 0,
                ebitda: businessData.ebitda || 0,
                cash_flow: businessData.cash_flow || 0,
                price: businessData.price || 0 // Log the asking price specifically
            });
            
            // Calculate comprehensive valuation using all available inputs
            const valuation = await postBusinessValuationService.calculateBusinessValuation(businessData);
            
            // Calculate price comparison with enhanced context
            const priceComparison = this.calculatePriceComparison(businessData.price, valuation);
            
            // Generate insights based on the valuation data with asking price context
            const insights = this.generateInsights(valuation, businessData);
            
            // Add the insights to the valuation object
            valuation.insights = insights;
            
            // Generate explanation with asking price context
            valuation.explanation = this.generateValuationExplanation(valuation, businessData);
            
            // Return success response with comprehensive valuation data
            return res.json({
                success: true,
                valuation: valuation,
                priceComparison: priceComparison
            });
        } catch (error) {
            console.error('Error in post-business valuation controller:', error);
            
            return res.status(500).json({
                success: false,
                message: 'Failed to calculate valuation',
                error: error.message
            });
        }
    }
    
    /**
     * Compare asking price to the valuation with enhanced detail
     */
    calculatePriceComparison(askingPrice, valuation) {
        const price = parseFloat(askingPrice) || 0;
        if (price <= 0) {
            return { status: 'unknown', difference: 0 };
        }
        
        // Safety check for valuation data
        if (!valuation || !valuation.valuationRange) {
            return { status: 'unknown', difference: 0 };
        }
        
        const min = valuation.valuationRange.min;
        const max = valuation.valuationRange.max;
        const estimated = valuation.estimatedValue;
        
        // Calculate percentage difference from the estimated value
        const differenceFromEstimated = price - estimated;
        const percentDifference = estimated > 0 ? (differenceFromEstimated / estimated) * 100 : 0;
        
        // Add more nuanced status with percentages
        let status;
        if (price > max) {
            status = price > max * 1.2 ? 'significantly_above' : 'above';
        } else if (price < min) {
            status = price < min * 0.8 ? 'significantly_below' : 'below';
        } else if (price > estimated) {
            status = 'within_high';
        } else if (price < estimated) {
            status = 'within_low';
        } else {
            status = 'optimal';
        }
        
        return {
            status: status,
            difference: Math.abs(Math.round(price - estimated)),
            percentDifference: Math.round(Math.abs(percentDifference)),
            direction: price > estimated ? 'above' : 'below',
            insightText: this.getPriceComparisonInsight(status, Math.abs(percentDifference))
        };
    }
    
    /**
     * Generate a user-friendly insight based on price comparison
     */
    getPriceComparisonInsight(status, percentDifference) {
        switch(status) {
            case 'significantly_above':
                return `Your asking price is significantly higher than the estimated market value (${percentDifference}% above). While ambitious pricing can reflect unique business qualities, it may limit buyer interest.`;
            case 'above':
                return `Your asking price is above the estimated market value (${percentDifference}% higher). This is within reasonable negotiation range if your business has unique strengths.`;
            case 'within_high':
                return `Your asking price is within our estimated valuation range, on the higher end. This is an attractive position for negotiations.`;
            case 'within_low':
                return `Your asking price is within our estimated valuation range, on the lower end. This should attract buyer interest while leaving room for negotiation.`;
            case 'below':
                return `Your asking price is below our estimated market value (${percentDifference}% lower). While this may attract buyers quickly, you might be leaving money on the table.`;
            case 'significantly_below':
                return `Your asking price is significantly below the estimated market value (${percentDifference}% lower). This could raise questions from buyers about potential issues or might result in undervaluing your business.`;
            case 'optimal':
                return `Your asking price aligns perfectly with our estimated market value. This balanced approach typically attracts serious buyers while maximizing value.`;
            default:
                return `Your asking price has been analyzed against market metrics.`;
        }
    }
    
    /**
     * Generate insights based on the valuation data
     */
    generateInsights(valuation, businessData) {
        const insights = [];
        
        // Industry insight
        insights.push(`${businessData.industry || 'Your industry'} businesses typically sell for ${valuation.industryData?.min_revenue_multiplier || '0.5'}x-${valuation.industryData?.max_revenue_multiplier || '1.5'}x revenue or ${valuation.industryData?.ebitda_multiplier || '3.0'}x EBITDA.`);
        
        // Financial insight
        const revenue = parseFloat(businessData.gross_revenue) || 0;
        const ebitda = parseFloat(businessData.ebitda) || 0;
        const cashFlow = parseFloat(businessData.cash_flow) || 0;
        
        if (ebitda > 0 && revenue > 0) {
            const margin = (ebitda / revenue) * 100;
            insights.push(`Your current profit margin of ${margin.toFixed(1)}% ${margin > 15 ? 'is strong and positively impacts' : 'could be improved to increase'} your overall valuation.`);
        } else if (cashFlow > 0 && revenue > 0) {
            const margin = (cashFlow / revenue) * 100;
            insights.push(`Your cash flow represents ${margin.toFixed(1)}% of revenue. Improving profitability metrics could increase your valuation.`);
        }
        
        // Business age insight
        const yearsInOperation = parseInt(businessData.years_in_operation) || 0;
        if (yearsInOperation > 10) {
            insights.push(`Your business's ${yearsInOperation} year track record demonstrates significant stability, which is valued by buyers.`);
        } else if (yearsInOperation > 5) {
            insights.push(`With ${yearsInOperation} years in operation, your business has established a solid operational history.`);
        } else if (yearsInOperation > 0) {
            insights.push(`At ${yearsInOperation} years old, your business is relatively young. A longer operational history typically increases valuation.`);
        }
        
        // Growth insight
        const growthRate = parseFloat(businessData.growth_rate) || 0;
        if (growthRate > 10) {
            insights.push(`Your growth rate of ${growthRate.toFixed(1)}% is above average and significantly enhances your business valuation.`);
        } else if (growthRate > 0) {
            insights.push(`Your modest growth rate of ${growthRate.toFixed(1)}% provides some positive impact on valuation.`);
        } else if (growthRate < 0) {
            insights.push(`Your negative growth rate of ${growthRate.toFixed(1)}% is concerning to potential buyers and reduces valuation.`);
        }
        
        // Recurring revenue insight
        const recurringRevenue = parseFloat(businessData.recurring_revenue) || 0;
        if (recurringRevenue > 0 && revenue > 0) {
            const recurringPercentage = (recurringRevenue / revenue) * 100;
            if (recurringPercentage > 50) {
                insights.push(`Your business has ${recurringPercentage.toFixed(1)}% recurring revenue, which is excellent and significantly increases buyer interest and valuation.`);
            } else if (recurringPercentage > 20) {
                insights.push(`Your ${recurringPercentage.toFixed(1)}% recurring revenue provides stability that buyers value.`);
            }
        }
        
        // Systems and documentation insight
        if (businessData.has_systems && businessData.has_training) {
            insights.push(`Your documented systems and training materials increase business transferability and positively impact valuation.`);
        } else if (businessData.has_systems || businessData.has_training) {
            insights.push(`Having ${businessData.has_systems ? 'documented systems' : 'training materials'} increases business transferability.`);
        }
        
        // Owner involvement insight
        const ownerHours = parseFloat(businessData.owner_hours) || 0;
        if (ownerHours >= 40) {
            insights.push(`The owner currently works ${ownerHours} hours weekly. High owner dependence typically reduces business value.`);
        } else if (ownerHours < 20 && ownerHours > 0) {
            insights.push(`The owner only works ${ownerHours} hours weekly, indicating good systems and low owner dependence.`);
        }
        
        // Asset insight
        const ffeValue = parseFloat(businessData.ffe) || parseFloat(businessData.ffe_value) || 0;
        const inventoryValue = parseFloat(businessData.inventory) || 0;
        if ((ffeValue + inventoryValue) > 0) {
            insights.push(`Your business includes tangible assets worth approximately £${(ffeValue + inventoryValue).toLocaleString()}, which adds value beyond just revenue multiples.`);
        }
        
        // Client concentration insight
        const clientConcentration = parseFloat(businessData.client_concentration) || 0;
        if (clientConcentration > 30) {
            insights.push(`Client concentration of ${clientConcentration.toFixed(1)}% (revenue from top client) creates risk that reduces business value.`);
        }
        
        // Confidence level insight
        if (valuation.confidence > 70) {
            insights.push(`The valuation confidence score of ${valuation.confidence}% indicates that sufficient data was provided for a reliable estimate.`);
        } else if (valuation.confidence > 50) {
            insights.push(`The valuation confidence score of ${valuation.confidence}% suggests this is a moderate estimate that could be refined with more data.`);
        } else {
            insights.push(`The valuation confidence score of ${valuation.confidence}% indicates this is a preliminary estimate. Providing more business details would improve accuracy.`);
        }
        
        return insights;
    }
    
    /**
     * Generate a coherent explanation of the valuation
     */
    generateValuationExplanation(valuation, businessData) {
        // Find the top positive and negative factors
        const sortedFactors = Object.entries(valuation.factors || {})
            .map(([key, factor]) => ({ key, ...factor }))
            .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
        
        const positiveFactors = sortedFactors.filter(f => f.impact > 0);
        const negativeFactors = sortedFactors.filter(f => f.impact < 0);
        
        let explanation = `Based on ${businessData.industry || 'your industry'} benchmarks, `;
        
        // Describe what the valuation is primarily based on
        if (valuation.multipleType === 'ebitda') {
            explanation += `your business valuation uses an EBITDA multiple of ${valuation.multiple.toFixed(1)}x. `;
        } else if (valuation.multipleType === 'cash_flow') {
            explanation += `your business valuation uses a Cash Flow multiple of ${valuation.multiple.toFixed(1)}x. `;
        } else if (valuation.multipleType === 'revenue') {
            explanation += `your business valuation uses a Revenue multiple of ${valuation.multiple.toFixed(2)}x. `;
        } else {
            explanation += `your business valuation is based on standard industry metrics. `;
        }
        
        // Add positive factors
        if (positiveFactors.length > 0) {
            explanation += `Key strengths increasing your valuation include `;
            
            if (positiveFactors.length === 1) {
                explanation += positiveFactors[0].analysis.toLowerCase() + '. ';
            } else {
                const descriptions = positiveFactors.slice(0, 2).map(f => f.analysis.toLowerCase());
                explanation += descriptions.join(' and ') + '. ';
            }
        }
        
        // Add negative factors
        if (negativeFactors.length > 0) {
            explanation += `Factors that may be limiting your valuation include `;
            
            if (negativeFactors.length === 1) {
                explanation += negativeFactors[0].analysis.toLowerCase() + '. ';
            } else {
                const descriptions = negativeFactors.slice(0, 2).map(f => f.analysis.toLowerCase());
                explanation += descriptions.join(' and ') + '. ';
            }
        }
        
        // Add confidence level
        explanation += `The valuation confidence is ${valuation.confidence}%, meaning it is ${valuation.confidence > 70 ? 'highly reliable' : valuation.confidence > 50 ? 'moderately reliable' : 'a general estimate'} based on the information provided.`;
        
        return explanation;
    }
}

export default new PostBusinessValuationController();

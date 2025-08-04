import OpenAI from 'openai';
import pool from '../db.js';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

class ValuationService {

    // Main public method called by the controller
    async calculateBusinessValuation(businessData) {
        console.log('--- Starting Business Valuation Process ---');
        try {
            // 1. Get Industry Multiplier Data
            const industry = businessData.industry || 'Other';
            const multiplierData = await this.getIndustryMultiplierData(industry);
            if (!multiplierData) {
                console.error(`Failed to retrieve multiplier data for industry: ${industry}`);
                throw new Error('Could not retrieve necessary industry data for valuation.');
            }

            // 2. Perform Comprehensive Valuation Calculation
            const valuationResult = this.calculateComprehensiveValuation(businessData, multiplierData);

            console.log('--- Valuation Process Complete ---');
            return valuationResult;

        } catch (error) {
            console.error('Error during calculateBusinessValuation:', error);
            // Attempt a simpler fallback if comprehensive fails catastrophically
            try {
                console.warn('Comprehensive valuation failed, attempting fallback...');
                const fallbackMultiplierData = await this.getIndustryMultiplierData(businessData.industry || 'Other');
                if (fallbackMultiplierData) {
                    return this.generateFallbackValuation(businessData, fallbackMultiplierData);
                } else {
                    // Absolute fallback if even multiplier data fails
                     return this.generateAbsoluteFallback(businessData);
                }
            } catch (fallbackError) {
                console.error('Error during fallback valuation:', fallbackError);
                // If even fallback fails, return a minimal error structure
                return this.generateAbsoluteFallback(businessData, 'Fallback valuation also failed.');
            }
        }
    }

    // Refined Comprehensive Valuation Logic
    calculateComprehensiveValuation(businessData, multiplierData) {
        console.log('--- Starting Comprehensive Valuation Calculation ---');
        console.log('Input Data:', {
            industry: businessData.industry,
            revenue: businessData.revenue,
            ebitda: businessData.ebitda,
            years: businessData.yearsInOperation,
            growth: businessData.growthRate,
            ffe: businessData.ffeValue,
            debt: businessData.totalDebtAmount,
            scalability: businessData.scalability,
            debtTransferable: businessData.debtTransferable
        });
        console.log('Multiplier Data:', multiplierData);

        // Ensure essential financial data is numeric and positive where expected
        const revenue = Math.max(0, parseFloat(businessData.revenue) || 0);
        const ebitda = parseFloat(businessData.ebitda) || 0; // EBITDA can be negative
        const yearsInOperation = Math.max(0, parseInt(businessData.yearsInOperation) || 0);
        const growthRate = parseFloat(businessData.growthRate) || 0;
        const ffeValue = Math.max(0, parseFloat(businessData.ffeValue) || 0);
        const totalDebtAmount = Math.max(0, parseFloat(businessData.totalDebtAmount) || 0);

        // Initialize basic valuation variables
        let estimatedValue, minValue, maxValue, multipleUsed, multipleType;
        const factors = []; // Store detailed factors affecting valuation
        const MIN_REVENUE_FOR_VALUATION = 10000; // Minimum revenue threshold
        const MIN_VALUATION_FLOOR = 15000; // Absolute minimum valuation floor

        // STEP 1: Calculate base valuation using either EBITDA or revenue
        if (ebitda > 0 && revenue >= MIN_REVENUE_FOR_VALUATION) {
            // EBITDA-based valuation (preferred method)
            multipleUsed = multiplierData.ebitda_multiplier;
            multipleType = 'ebitda';
            estimatedValue = ebitda * multipleUsed;

            // Use revenue multipliers for the range bounds, ensure revenue is positive
            minValue = revenue * multiplierData.min_revenue_multiplier;
            maxValue = revenue * multiplierData.max_revenue_multiplier;

            factors.push({
                name: 'EBITDA', impact: 10, // Base impact score
                analysis: `Positive EBITDA (£${ebitda.toLocaleString()}) applied with a ${multipleUsed.toFixed(1)}x industry multiple.`
            });
            console.log(`Step 1 (EBITDA): Base Value = ${estimatedValue.toFixed(0)}`);

        } else if (revenue >= MIN_REVENUE_FOR_VALUATION) {
            // Revenue-based valuation (when EBITDA <= 0 or revenue too low for EBITDA)
            const avgRevenueMultiplier = (multiplierData.min_revenue_multiplier + multiplierData.max_revenue_multiplier) / 2;
            multipleUsed = avgRevenueMultiplier;
            multipleType = 'revenue';
            estimatedValue = revenue * avgRevenueMultiplier;

            // Direct revenue multiplier range
            minValue = revenue * multiplierData.min_revenue_multiplier;
            maxValue = revenue * multiplierData.max_revenue_multiplier;

            factors.push({
                name: 'Revenue', impact: 5, // Lower base impact than EBITDA
                analysis: `Valuation based on Revenue (£${revenue.toLocaleString()}) with an average ${multipleUsed.toFixed(2)}x industry multiple.`
            });
            console.log(`Step 1 (Revenue): Base Value = ${estimatedValue.toFixed(0)}`);
        } else {
            // Business too small or lacks data for standard valuation
            console.log('Business revenue/EBITDA below threshold for standard valuation.');
            estimatedValue = MIN_VALUATION_FLOOR; // Assign floor value
            minValue = MIN_VALUATION_FLOOR * 0.8;
            maxValue = MIN_VALUATION_FLOOR * 1.5;
            multipleUsed = 0;
            multipleType = 'N/A';
            factors.push({
                name: 'Low Financials', impact: -10,
                analysis: 'Revenue/EBITDA below minimum threshold (£10k Rev or Positive EBITDA) for standard valuation methods. Applied minimum floor value.'
            });
        }

        // Ensure base values are not negative before adjustments
        estimatedValue = Math.max(0, estimatedValue);
        minValue = Math.max(0, minValue);
        maxValue = Math.max(0, maxValue);

        // STEP 2: Apply industry-specific adjustments (Informational Factor)
        factors.push({
            name: 'Industry Context', impact: 0, // Neutral impact, just context
            analysis: `Industry: ${businessData.industry || 'Other'}. Benchmarks: Revenue Multiple (${multiplierData.min_revenue_multiplier}-${multiplierData.max_revenue_multiplier}x), EBITDA Multiple (${multiplierData.ebitda_multiplier}x).`
        });
        console.log(`Step 2 (Industry Context): Value = ${estimatedValue.toFixed(0)}`);

        // STEP 3: Adjust for growth rate
        if (growthRate !== 0) {
            // Apply a capped growth factor (e.g., max 1.5x for positive, min 0.7x for negative)
            // More aggressive cap for negative growth, gentler for positive
            const growthFactor = growthRate > 0
                ? Math.min(1.5, 1 + (growthRate / 100))
                : Math.max(0.7, 1 + (growthRate / 100));

            const originalValue = estimatedValue;
            estimatedValue *= growthFactor;

            // Adjust range bounds based on growth factor
            if (growthFactor > 1) maxValue *= growthFactor;
            else minValue *= growthFactor;

            const growthImpact = Math.round((growthFactor - 1) * 50); // Scale impact based on factor
            factors.push({
                name: 'Growth Rate', impact: growthImpact,
                analysis: `${growthRate > 0 ? 'Positive' : 'Negative'} growth rate (${growthRate}%) adjusted value by ${((growthFactor-1)*100).toFixed(1)}%. Factor: ${growthFactor.toFixed(2)}x.`
            });
            console.log(`Step 3 (Growth): Factor=${growthFactor.toFixed(2)}, Value = ${estimatedValue.toFixed(0)}`);
        } else {
             factors.push({ name: 'Growth Rate', impact: 0, analysis: 'No growth rate provided or zero.' });
        }

        // STEP 4: Adjust for historical performance (Simplified check)
        const ebitdaPrev = parseFloat(businessData.ebitdaPrevYear) || 0;
        const revenuePrev = Math.max(0, parseFloat(businessData.revenuePrevYear) || 0);
        let trendFactor = 1.0;
        let trendAnalysis = 'No significant recent trend detected or data unavailable.';
        let trendImpact = 0;

        if (ebitda > 0 && ebitdaPrev !== 0) {
            const ebitdaGrowth = ((ebitda - ebitdaPrev) / Math.abs(ebitdaPrev)) * 100;
            if (ebitdaGrowth > 15) { trendFactor = 1.05; trendImpact = 3; trendAnalysis = 'Positive recent EBITDA trend detected.'; }
            else if (ebitdaGrowth < -15) { trendFactor = 0.95; trendImpact = -3; trendAnalysis = 'Negative recent EBITDA trend detected.'; }
        } else if (revenue > 0 && revenuePrev > 0) {
            const revenueGrowth = ((revenue - revenuePrev) / revenuePrev) * 100;
            if (revenueGrowth > 15) { trendFactor = 1.03; trendImpact = 2; trendAnalysis = 'Positive recent revenue trend detected.'; }
            else if (revenueGrowth < -15) { trendFactor = 0.97; trendImpact = -2; trendAnalysis = 'Negative recent revenue trend detected.'; }
        }

        if (trendFactor !== 1.0) {
            estimatedValue *= trendFactor;
            factors.push({ name: 'Financial Trend', impact: trendImpact, analysis: trendAnalysis + ` Factor: ${trendFactor.toFixed(2)}x.` });
            console.log(`Step 4 (Trend): Factor=${trendFactor.toFixed(2)}, Value = ${estimatedValue.toFixed(0)}`);
        } else {
             factors.push({ name: 'Financial Trend', impact: 0, analysis: trendAnalysis });
        }


        // STEP 5: Adjust for business age/stability
        if (yearsInOperation > 0) {
            let ageFactor = 1.0;
            if (yearsInOperation > 10) ageFactor = 1.10;
            else if (yearsInOperation > 5) ageFactor = 1.05;
            else if (yearsInOperation < 2) ageFactor = 0.90; // Higher penalty for very young
            else if (yearsInOperation < 3) ageFactor = 0.95;

            if (ageFactor !== 1.0) {
                estimatedValue *= ageFactor;
                const ageImpact = Math.round((ageFactor - 1) * 50);
                factors.push({ name: 'Business Age', impact: ageImpact, analysis: `${yearsInOperation} years in operation. Stability factor applied: ${ageFactor.toFixed(2)}x.` });
                console.log(`Step 5 (Age): Factor=${ageFactor.toFixed(2)}, Value = ${estimatedValue.toFixed(0)}`);
            } else {
                 factors.push({ name: 'Business Age', impact: 0, analysis: `${yearsInOperation} years in operation. Considered stable.` });
            }
        } else {
             factors.push({ name: 'Business Age', impact: -2, analysis: 'Years in operation not specified or zero.' });
        }

        // STEP 6: Adjust for scalability
        const scalabilityMap = { 'High': 1.10, 'Medium': 1.0, 'Low': 0.90 };
        const scalabilityFactor = scalabilityMap[businessData.scalability] || 1.0;
        if (scalabilityFactor !== 1.0) {
            estimatedValue *= scalabilityFactor;
            const scaleImpact = Math.round((scalabilityFactor - 1) * 50);
            factors.push({ name: 'Scalability', impact: scaleImpact, analysis: `Reported scalability: ${businessData.scalability || 'Medium'}. Factor applied: ${scalabilityFactor.toFixed(2)}x.` });
            console.log(`Step 6 (Scalability): Factor=${scalabilityFactor.toFixed(2)}, Value = ${estimatedValue.toFixed(0)}`);
        } else {
             factors.push({ name: 'Scalability', impact: 0, analysis: `Reported scalability: ${businessData.scalability || 'Medium'}. No significant adjustment.` });
        }

        // STEP 7: Consider assets (FFE) value - Add a portion of FFE value
        if (ffeValue > 0) {
            // Add a fraction of FFE value, capped at a % of revenue/EBITDA base
            const baseFinancial = Math.max(revenue, ebitda * 5); // Estimate base size
            // Cap contribution to prevent FFE dominating valuation for low-profit businesses
            const ffeContribution = Math.min(ffeValue * 0.25, baseFinancial * 0.15, 100000); // Add up to 25% of FFE, capped at 15% of base size or £100k
            if (ffeContribution > 0) {
                estimatedValue += ffeContribution;
                factors.push({ name: 'Assets (FFE)', impact: 3, analysis: `Added £${ffeContribution.toLocaleString()} contribution based on reported FF&E value.` });
                console.log(`Step 7 (FFE): Added ${ffeContribution.toFixed(0)}, Value = ${estimatedValue.toFixed(0)}`);
            } else {
                 factors.push({ name: 'Assets (FFE)', impact: 0, analysis: `FF&E value (£${ffeValue.toLocaleString()}) considered, but contribution capped or negligible.` });
            }
        } else {
             factors.push({ name: 'Assets (FFE)', impact: 0, analysis: 'No FF&E value provided.' });
        }

        // STEP 8: Adjust for debt if transferable - Subtract a portion of debt
        const debtTransferable = String(businessData.debtTransferable).toLowerCase();
        if (totalDebtAmount > 0) {
            let debtDeduction = 0;
            let debtImpact = 0;
            let debtAnalysis = `Total debt reported: £${totalDebtAmount.toLocaleString()}.`;

            if (debtTransferable === 'yes' || debtTransferable === 'true') {
                // Subtract a significant portion of transferable debt
                debtDeduction = totalDebtAmount * 0.8; // Assume 80% impacts value directly
                debtImpact = -5;
                debtAnalysis += ` Assumed fully transferable, reducing value by £${debtDeduction.toLocaleString()}.`;
            } else if (debtTransferable === 'some') {
                debtDeduction = totalDebtAmount * 0.4; // Assume 40% impacts value
                debtImpact = -3;
                debtAnalysis += ` Assumed partially transferable, reducing value by £${debtDeduction.toLocaleString()}.`;
            } else { // 'no' or unspecified
                debtImpact = -1; // Small negative impact for having debt, even if not transferable
                debtAnalysis += ` Assumed not transferable, minimal direct impact on valuation.`;
            }

            if (debtDeduction > 0) {
                estimatedValue -= debtDeduction;
                console.log(`Step 8 (Debt): Subtracted ${debtDeduction.toFixed(0)}, Value = ${estimatedValue.toFixed(0)}`);
            } else {
                 console.log(`Step 8 (Debt): No direct deduction. Value = ${estimatedValue.toFixed(0)}`);
            }
             factors.push({ name: 'Debt', impact: debtImpact, analysis: debtAnalysis });

        } else {
             factors.push({ name: 'Debt', impact: 0, analysis: 'No debt reported.' });
        }

        // STEP 9: Final range adjustments and validation
        // Ensure estimated value is not below the absolute floor after all adjustments
        estimatedValue = Math.max(MIN_VALUATION_FLOOR, estimatedValue);

        // Recalculate min/max based on the final estimated value to provide a sensible range
        // Ensure range doesn't go below floor
        minValue = Math.max(MIN_VALUATION_FLOOR * 0.7, estimatedValue * 0.75); // Min is 75% of estimate or floor-based min
        maxValue = Math.max(minValue * 1.5, estimatedValue * 1.25); // Max is 125% of estimate or 1.5x min

        // Final check: Ensure estimated value is within the final calculated range
        estimatedValue = Math.max(minValue, Math.min(estimatedValue, maxValue));

        console.log(`Step 9 (Final Range): Min=${minValue.toFixed(0)}, Max=${maxValue.toFixed(0)}, Final Estimated=${estimatedValue.toFixed(0)}`);

        // Generate market comparables
        const marketComparables = this.generateMarketComparables(businessData, multiplierData, multipleUsed, multipleType);

        // Calculate confidence score
        const confidence = this.calculateConfidenceScore(businessData);

        // Generate intelligent recommendations
        const recommendations = this.generateRecommendations(businessData, factors);

        // Round final values to nearest £100 for cleaner presentation
        estimatedValue = Math.round(estimatedValue / 100) * 100;
        minValue = Math.round(minValue / 100) * 100;
        maxValue = Math.round(maxValue / 100) * 100;

        // Ensure min is not greater than max after rounding
        if (minValue > maxValue) {
            minValue = Math.round((maxValue * 0.9) / 100) * 100; // Adjust min if rounding caused inversion
        }
        // Ensure estimated is within rounded range
        estimatedValue = Math.max(minValue, Math.min(estimatedValue, maxValue));


        console.log('--- Comprehensive Valuation Calculation Complete ---');
        // Return the complete valuation object
        return {
            estimatedValue: estimatedValue,
            valuationRange: { min: minValue, max: maxValue },
            confidence: confidence,
            multiple: multipleUsed,
            multipleType: multipleType,
            summary: `Based on ${businessData.industry || 'standard industry'} benchmarks and ${factors.length} business-specific factors analyzed.`,
            // Convert factors array to object keyed by lowercase name
            factors: factors.reduce((obj, factor) => {
                // Create a simple key: lowercase name, replace spaces with underscores
                const key = factor.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                obj[key] = { impact: factor.impact, analysis: factor.analysis };
                return obj;
            }, {}),
            industryData: multiplierData, // Include the raw multiplier data used
            marketComparables: marketComparables,
            recommendations: recommendations,
            // Include key metrics used in calculation for reference
            businessMetrics: {
                revenue: revenue,
                ebitda: ebitda,
                yearsInOperation: yearsInOperation,
                growthRate: growthRate,
                ffeValue: ffeValue,
                totalDebtAmount: totalDebtAmount,
                scalability: businessData.scalability,
                debtTransferable: debtTransferable
            }
        };
    }


    // Helper to generate market comparables section
    generateMarketComparables(businessData, multiplierData, multipleUsed, multipleType) {
        const comparables = {
            intro: `Comparing your key metrics to typical benchmarks for the ${businessData.industry || 'Other'} industry:`,
            metrics: []
        };

        const revenue = Math.max(0, parseFloat(businessData.revenue) || 0);
        const ebitda = parseFloat(businessData.ebitda) || 0;

        // Revenue Multiple Comparison
        if (revenue > 0) {
            const yourRevMultiple = multipleType === 'revenue' ? multipleUsed : (ebitda > 0 ? (businessData.estimatedValue || 0) / revenue : 0);
             comparables.metrics.push({
                name: 'Revenue Multiple',
                yourValue: yourRevMultiple > 0 ? yourRevMultiple.toFixed(2) + 'x' : 'N/A',
                industryAverage: `${multiplierData.min_revenue_multiplier.toFixed(2)}x - ${multiplierData.max_revenue_multiplier.toFixed(2)}x`,
                unit: ''
            });
        }

        // EBITDA Multiple Comparison
        if (ebitda > 0) {
             const yourEbitdaMultiple = multipleType === 'ebitda' ? multipleUsed : (businessData.estimatedValue || 0) / ebitda;
             comparables.metrics.push({
                name: 'EBITDA Multiple',
                yourValue: yourEbitdaMultiple.toFixed(1) + 'x',
                industryAverage: multiplierData.ebitda_multiplier.toFixed(1) + 'x',
                unit: ''
            });
        } else {
             comparables.metrics.push({
                name: 'EBITDA Multiple',
                yourValue: 'N/A (EBITDA not positive)',
                industryAverage: multiplierData.ebitda_multiplier.toFixed(1) + 'x',
                unit: ''
            });
        }

        // Add Profit Margin comparison if possible
        if (revenue > 0 && ebitda !== 0) { // Use EBITDA as proxy for profit
            const yourMargin = (ebitda / revenue) * 100;
            // Fetch typical margin from multiplier data if available, else estimate
            const typicalMargin = multiplierData.avg_profit_margin || (multiplierData.ebitda_multiplier / ((multiplierData.min_revenue_multiplier + multiplierData.max_revenue_multiplier) / 2)) * 15; // Rough estimate
            comparables.metrics.push({
                name: 'Profit Margin (EBITDA %)',
                yourValue: yourMargin.toFixed(1) + '%',
                industryAverage: typicalMargin ? typicalMargin.toFixed(1) + '%' : '10-20%', // Fallback range
                unit: ''
            });
        }


        return comparables;
    }

    // Helper to generate recommendations
    generateRecommendations(businessData, factors) {
        const recommendations = {
             title: "Recommendations to Potentially Enhance Business Value",
             items: []
        };
        const lowConfidence = this.calculateConfidenceScore(businessData) < 60;
        const negativeGrowth = (parseFloat(businessData.growthRate) || 0) < 0;
        const lowProfit = (parseFloat(businessData.ebitda) || 0) <= 0 && (parseFloat(businessData.revenue) || 0) > 0;
        const highDebt = (parseFloat(businessData.totalDebtAmount) || 0) > (parseFloat(businessData.ebitda) || 0) * 2 && (parseFloat(businessData.ebitda) || 0) > 0;
        const youngBusiness = (parseInt(businessData.yearsInOperation) || 0) < 3;

        if (lowConfidence) {
            recommendations.items.push("Provide more detailed financial data (e.g., 3 years history) for a more accurate valuation.");
        }
        if (negativeGrowth) {
            recommendations.items.push("Develop strategies to reverse the negative growth trend, focusing on customer retention or new market segments.");
        }
        if (lowProfit) {
            recommendations.items.push("Focus on improving profitability by analyzing cost structures and pricing strategies.");
        }
         if (highDebt) {
            recommendations.items.push("Explore options for debt reduction or restructuring to improve the business's financial health and attractiveness to buyers.");
        }
         if (youngBusiness) {
            recommendations.items.push("Build a longer track record of stable operations and financial performance to increase buyer confidence.");
        }
        if (businessData.scalability === 'Low') {
             recommendations.items.push("Identify and document potential areas for scaling the business, even if limited, to show future potential.");
        }

        // Generic recommendations if few specific ones apply
        if (recommendations.items.length < 2) {
            recommendations.items.push("Ensure financial records are clean, up-to-date, and easily verifiable for due diligence.");
            recommendations.items.push("Document standard operating procedures (SOPs) to demonstrate ease of transition for a new owner.");
        }
         if (recommendations.items.length === 0) { // Absolute fallback
             recommendations.items.push("Consult with a professional business broker or M&A advisor for personalized advice.");
         }


        return recommendations;
    }


    // Fallback valuation if comprehensive fails badly
    generateFallbackValuation(businessData, multiplierData) {
        console.warn('Executing Fallback Valuation Logic');
        const baseValue = this.calculateBaseValue(businessData); // Use existing base value calc
        const confidence = this.calculateConfidenceScore(businessData); // Use existing confidence calc
        const MIN_VALUATION_FLOOR = 15000;

        let estimatedValue, minValue, maxValue, multipleUsed, multipleType;

        if (baseValue <= 0) { // Handle cases where base value is zero or negative
             estimatedValue = MIN_VALUATION_FLOOR;
             minValue = MIN_VALUATION_FLOOR * 0.7;
             maxValue = MIN_VALUATION_FLOOR * 1.5;
             multipleUsed = 0;
             multipleType = 'N/A';
        } else if (businessData.ebitda > 0) {
            multipleUsed = multiplierData.ebitda_multiplier;
            multipleType = 'EBITDA';
            estimatedValue = baseValue * multipleUsed;
            minValue = Math.max(MIN_VALUATION_FLOOR * 0.7, estimatedValue * 0.7);
            maxValue = Math.max(minValue * 1.5, estimatedValue * 1.3);
        } else { // Revenue based fallback
            const avgRevenueMultiplier = (multiplierData.min_revenue_multiplier + multiplierData.max_revenue_multiplier) / 2;
            multipleUsed = avgRevenueMultiplier;
            multipleType = 'Revenue';
            estimatedValue = baseValue * multipleUsed; // Base value here is likely revenue * 0.15
             minValue = Math.max(MIN_VALUATION_FLOOR * 0.7, estimatedValue * 0.7);
             maxValue = Math.max(minValue * 1.5, estimatedValue * 1.3);
        }

         // Ensure floor is respected
         estimatedValue = Math.max(MIN_VALUATION_FLOOR, estimatedValue);
         minValue = Math.max(MIN_VALUATION_FLOOR * 0.7, minValue);
         maxValue = Math.max(minValue, maxValue); // Ensure max > min
         estimatedValue = Math.max(minValue, Math.min(estimatedValue, maxValue)); // Clamp estimate

         // Round values
         estimatedValue = Math.round(estimatedValue / 100) * 100;
         minValue = Math.round(minValue / 100) * 100;
         maxValue = Math.round(maxValue / 100) * 100;
         if (minValue > maxValue) minValue = Math.round((maxValue * 0.9)/100)*100;
         estimatedValue = Math.max(minValue, Math.min(estimatedValue, maxValue));


        return {
            estimatedValue: estimatedValue,
            valuationRange: { min: minValue, max: maxValue },
            confidence: Math.max(30, confidence - 15), // Reduce confidence for fallback
            multiple: multipleUsed,
            multipleType: multipleType,
            summary: "Simplified fallback valuation based on core financials and industry type.",
            factors: { fallback: { impact: -10, analysis: 'Fallback valuation executed due to calculation complexity or data issues.' } },
            industryData: multiplierData,
            marketComparables: { intro: "Simplified market comparison.", metrics: [] },
            recommendations: { title: "General Recommendations", items: ["Provide more detailed data for a comprehensive valuation.", "Consult a professional advisor."] },
            businessMetrics: { revenue: businessData.revenue, ebitda: businessData.ebitda }
        };
    }

     // Absolute fallback if multiplier data also fails
     generateAbsoluteFallback(businessData, message = 'Could not perform valuation due to missing data or system error.') {
         console.error('Executing Absolute Fallback Valuation');
         const MIN_VALUATION_FLOOR = 15000;
         const estimatedValue = MIN_VALUATION_FLOOR;
         const minValue = MIN_VALUATION_FLOOR * 0.7;
         const maxValue = MIN_VALUATION_FLOOR * 1.5;

         return {
             estimatedValue: estimatedValue,
             valuationRange: { min: minValue, max: maxValue },
             confidence: 10, // Very low confidence
             multiple: 0,
             multipleType: 'N/A',
             summary: message,
             factors: { error: { impact: -20, analysis: message } },
             industryData: null,
             marketComparables: { intro: "Comparison unavailable.", metrics: [] },
             recommendations: { title: "Recommendations", items: ["Please review your entered data or try again later.", "Contact support if the issue persists."] },
             businessMetrics: { revenue: businessData.revenue, ebitda: businessData.ebitda }
         };
     }


    // --- Existing Helper Functions (Ensure they are robust) ---

    // Calculate base value (EBITDA preferred, then Revenue)
    calculateBaseValue(businessData) {
        const ebitda = parseFloat(businessData.ebitda) || 0;
        const revenue = Math.max(0, parseFloat(businessData.revenue) || 0);
        // Use EBITDA if positive, otherwise use a fraction of revenue as a proxy for profit potential
        if (ebitda > 0) {
            return ebitda;
        } else if (revenue > 0) {
            // Use a conservative profit margin estimate if EBITDA is not positive
            return revenue * 0.10; // Assume 10% margin for base value if EBITDA <= 0
        }
        return 0; // No basis for valuation
    }


    // Get Industry Multiplier Data (Ensure robust fallback)
    async getIndustryMultiplierData(industry) {
        console.log(`Fetching multipliers for industry: ${industry}`);

        if (!industry) {
            console.warn('No industry provided, using default multipliers');
            return this.getDefaultMultipliers();
        }

        try {
            // Normalize the industry name to improve matching
            const normalizedIndustry = industry.toLowerCase().trim();

            // Try to get multipliers from industry_multipliers table first (correct table structure)
            const multiplierQuery = `
                SELECT 
                    industry, 
                    min_revenue_multiplier,
                    max_revenue_multiplier,
                    ebitda_multiplier
                FROM industry_multipliers 
                WHERE LOWER(industry) = $1
            `;

            const multiplierResult = await pool.query(multiplierQuery, [normalizedIndustry]);

            if (multiplierResult.rows.length > 0) {
                console.log(`Found exact match in industry_multipliers for: ${industry}`);
                // Process data with the correct column names
                return {
                    industry: multiplierResult.rows[0].industry,
                    min_revenue_multiplier: parseFloat(multiplierResult.rows[0].min_revenue_multiplier) || 0.5,
                    max_revenue_multiplier: parseFloat(multiplierResult.rows[0].max_revenue_multiplier) || 2.5,
                    ebitda_multiplier: parseFloat(multiplierResult.rows[0].ebitda_multiplier) || 3.5,
                    avg_profit_margin: 15 // Default profit margin if not in data
                };
            }

            // Keyword search in industry_multipliers
            const keywordMultiplierQuery = `
                SELECT 
                    industry, 
                    min_revenue_multiplier,
                    max_revenue_multiplier,
                    ebitda_multiplier
                FROM industry_multipliers 
                WHERE LOWER(industry) LIKE $1
                LIMIT 1
            `;

            const keywordMultiplierResult = await pool.query(keywordMultiplierQuery, [`%${normalizedIndustry}%`]);

            if (keywordMultiplierResult.rows.length > 0) {
                console.log(`Found similar industry in industry_multipliers: "${keywordMultiplierResult.rows[0].industry}" for "${industry}"`);
                return {
                    industry: keywordMultiplierResult.rows[0].industry,
                    min_revenue_multiplier: parseFloat(keywordMultiplierResult.rows[0].min_revenue_multiplier) || 0.5,
                    max_revenue_multiplier: parseFloat(keywordMultiplierResult.rows[0].max_revenue_multiplier) || 2.5,
                    ebitda_multiplier: parseFloat(keywordMultiplierResult.rows[0].ebitda_multiplier) || 3.5,
                    avg_profit_margin: 15 // Default profit margin if not in data
                };
            }

            // Try to match by first word (category) in industry_multipliers
            const firstWord = normalizedIndustry.split(' ')[0];
            if (firstWord && firstWord.length > 3) {
                console.log(`Trying to match by first word in industry_multipliers: "${firstWord}"`);
                const categoryResult = await pool.query(keywordMultiplierQuery, [`%${firstWord}%`]);

                if (categoryResult.rows.length > 0) {
                    console.log(`Found category match in industry_multipliers: "${categoryResult.rows[0].industry}" for "${industry}"`);
                    return {
                        industry: categoryResult.rows[0].industry,
                        min_revenue_multiplier: parseFloat(categoryResult.rows[0].min_revenue_multiplier) || 0.5,
                        max_revenue_multiplier: parseFloat(categoryResult.rows[0].max_revenue_multiplier) || 2.5,
                        ebitda_multiplier: parseFloat(categoryResult.rows[0].ebitda_multiplier) || 3.5,
                        avg_profit_margin: 15 // Default profit margin if not in data
                    };
                }
            }

            // Fall back to "Other" in industry_multipliers
            console.log(`No matches found for "${industry}", trying "Other" category in industry_multipliers`);
            const fallbackResult = await pool.query(multiplierQuery, ['other']);

            if (fallbackResult.rows.length > 0) {
                console.log(`Using "Other" category from industry_multipliers for "${industry}"`);
                return {
                    industry: fallbackResult.rows[0].industry,
                    min_revenue_multiplier: parseFloat(fallbackResult.rows[0].min_revenue_multiplier) || 0.5,
                    max_revenue_multiplier: parseFloat(fallbackResult.rows[0].max_revenue_multiplier) || 2.5,
                    ebitda_multiplier: parseFloat(fallbackResult.rows[0].ebitda_multiplier) || 3.5,
                    avg_profit_margin: 15 // Default profit margin if not in data
                };
            }

            // If all fails, use default values
            console.warn(`No industry multipliers found for "${industry}". Using default multipliers.`);
            return this.getDefaultMultipliers();

        } catch (error) {
            console.error('Error getting industry multipliers:', error);
            return this.getDefaultMultipliers();
        }
    }

    /**
     * Convert database industry data to multipliers object
     */
    processIndustryData(data) {
        return {
            industry: data.industry,
            minRevenueMultiplier: parseFloat(data.avg_sales_multiple) * 0.8 || 0.5,
            maxRevenueMultiplier: parseFloat(data.avg_sales_multiple) * 1.2 || 2.5,
            avgRevenueMultiple: parseFloat(data.avg_sales_multiple) || 1.5,
            avgEbitdaMultiple: parseFloat(data.avg_ebitda_multiple) || 3.5,
            avgCashFlow: parseFloat(data.avg_cash_flow) || 0,
            avgProfitMargin: parseFloat(data.avg_profit_margin) || 15,
            businessCount: parseInt(data.business_count) || 0
        };
    }

    /**
     * Get default multipliers when industry data is not available
     */
    getDefaultMultipliers() {
        return {
            industry: 'General Business',
            minRevenueMultiplier: 0.5,
            maxRevenueMultiplier: 2.5,
            avgRevenueMultiple: 1.5,
            avgEbitdaMultiple: 3.5,
            avgCashFlow: 0,
            avgProfitMargin: 15,
            businessCount: 0
        };
    }

    // Calculate Confidence Score (Ensure fields match data structure)
    calculateConfidenceScore(businessData) {
        // Use field names consistent with businessData structure after parsing
        const requiredFields = [
            'industry', 'revenue', 'ebitda', 'yearsInOperation'
        ];
        const optionalFields = [
            'location', 'growthRate', 'ffeValue', 'totalDebtAmount',
            'revenuePrevYear', 'ebitdaPrevYear', 'scalability'
            // Add more fields that contribute to confidence if available
        ];

        const hasValue = (field) => {
            const value = businessData[field];
            return value !== undefined && value !== null && value !== '';
        };

        const filledRequired = requiredFields.filter(hasValue).length;
        const filledOptional = optionalFields.filter(hasValue).length;

        // Base confidence starts higher if essential financials are present
        const baseConfidence = (hasValue('revenue') || hasValue('ebitda')) ? 40 : 20;

        // Calculate score: 70% weight on required, 30% on optional
        const requiredScore = requiredFields.length > 0 ? (filledRequired / requiredFields.length) * 0.7 : 0;
        const optionalScore = optionalFields.length > 0 ? (filledOptional / optionalFields.length) * 0.3 : 0;

        // Combine scores and scale to 100
        let confidence = baseConfidence + (requiredScore + optionalScore) * (100 - baseConfidence);

        // Ensure confidence is within 0-100 range
        confidence = Math.max(10, Math.min(95, Math.round(confidence))); // Cap between 10 and 95

        console.log(`Confidence Score: ${confidence}% (Required: ${filledRequired}/${requiredFields.length}, Optional: ${filledOptional}/${optionalFields.length})`);
        return confidence;
    }

    // ... other existing methods like calculateAdvancedValuation, calculateLocationScore etc. ...
    // Ensure these methods also use robust parsing and checks if they rely on businessData directly.

}

// Export the ValuationService instance
export default new ValuationService();

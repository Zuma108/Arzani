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
        const defaultIndustry = 'Other'; // Define default explicitly
        const targetIndustry = industry || defaultIndustry;
        console.log(`Fetching multipliers for industry: ${targetIndustry}`);

        try {
            const query = `SELECT * FROM industry_multipliers WHERE industry = $1`;
            let result = await pool.query(query, [targetIndustry]);

            if (result.rows.length > 0) {
                console.log(`Found multipliers for ${targetIndustry}`);
                return this.validateMultiplierData(result.rows[0]);
            }

            // If specific industry not found, try 'Other'
            if (targetIndustry !== defaultIndustry) {
                console.log(`Multipliers for ${targetIndustry} not found, trying ${defaultIndustry}`);
                result = await pool.query(query, [defaultIndustry]);
                if (result.rows.length > 0) {
                    console.log(`Found multipliers for ${defaultIndustry}`);
                    return this.validateMultiplierData(result.rows[0]);
                }
            }

            // If 'Other' also not found, use hardcoded fallback
            console.warn(`No multipliers found in DB for ${targetIndustry} or ${defaultIndustry}. Using hardcoded fallback.`);
            return this.getHardcodedFallbackMultipliers(targetIndustry);

        } catch (error) {
            console.error('Error getting industry multiplier data from DB:', error);
            // Use hardcoded fallback if DB query fails
            return this.getHardcodedFallbackMultipliers(targetIndustry);
        }
    }

    // Validate multiplier data retrieved from DB or hardcoded
    validateMultiplierData(data) {
         const validated = { ...data }; // Copy data
         const defaultMinRev = 0.5;
         const defaultMaxRev = 1.5;
         const defaultEbitda = 3.0;

         validated.min_revenue_multiplier = parseFloat(validated.min_revenue_multiplier);
         validated.max_revenue_multiplier = parseFloat(validated.max_revenue_multiplier);
         validated.ebitda_multiplier = parseFloat(validated.ebitda_multiplier);

         if (isNaN(validated.min_revenue_multiplier) || validated.min_revenue_multiplier <= 0) {
             validated.min_revenue_multiplier = defaultMinRev;
         }
         if (isNaN(validated.max_revenue_multiplier) || validated.max_revenue_multiplier <= validated.min_revenue_multiplier) {
             validated.max_revenue_multiplier = Math.max(defaultMaxRev, validated.min_revenue_multiplier * 1.5);
         }
         if (isNaN(validated.ebitda_multiplier) || validated.ebitda_multiplier <= 0) {
             validated.ebitda_multiplier = defaultEbitda;
         }
         // Ensure min_revenue is less than max_revenue
         if (validated.min_revenue_multiplier >= validated.max_revenue_multiplier) {
             validated.min_revenue_multiplier = validated.max_revenue_multiplier * 0.7;
         }

         return validated;
    }

    // Hardcoded fallback multipliers
    getHardcodedFallbackMultipliers(industry) {
        return this.validateMultiplierData({ // Pass through validation
            industry: industry || 'Other',
            min_revenue_multiplier: 0.5,
            max_revenue_multiplier: 1.5,
            ebitda_multiplier: 3.0,
            avg_profit_margin: 15 // Example default margin
        });
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

// Ensure this function exists and is correctly named
async function calculateBusinessValuation(businessData) {
  // Validate required fields
  if (!businessData) {
    throw new Error('No business data provided');
  }

  // Extract key metrics
  const { 
    industry, 
    revenue, 
    ebitda, 
    yearsInOperation,
    cashOnCash,
    ffeValue,
    growthRate,
    totalDebtAmount
  } = businessData;

  // Basic validation
  if (!revenue && !ebitda) {
    throw new Error('At least one financial metric (revenue or EBITDA) is required');
  }

  // Implement valuation logic
  let estimatedValue = 0;
  let revenueMultiple = 0;
  let ebitdaMultiple = 0;
  let confidenceLevel = 'medium';
  
  // Industry-specific multipliers (simplified)
  const industryMultipliers = getIndustryMultipliers(industry);
  
  // Calculate based on revenue
  if (revenue) {
    revenueMultiple = industryMultipliers.revenue;
    let revenueComponent = parseFloat(revenue) * revenueMultiple;
    estimatedValue += revenueComponent;
  }
  
  // Calculate based on EBITDA (usually weighted more heavily)
  if (ebitda) {
    ebitdaMultiple = industryMultipliers.ebitda;
    let ebitdaComponent = parseFloat(ebitda) * ebitdaMultiple;
    
    // If we have both metrics, weight EBITDA more heavily
    if (revenue) {
      estimatedValue = (estimatedValue * 0.3) + (ebitdaComponent * 0.7);
    } else {
      estimatedValue = ebitdaComponent;
    }
  }
  
  // Adjust for other factors
  if (yearsInOperation) {
    // Businesses operating longer are generally more valuable
    const maturityFactor = Math.min(parseFloat(yearsInOperation) / 10, 1.5);
    estimatedValue *= (1 + (maturityFactor * 0.1));
  }
  
  // Adjust for growth rate if provided
  if (growthRate) {
    const growthFactor = parseFloat(growthRate) / 100;
    estimatedValue *= (1 + (growthFactor * 0.5));
  }
  
  // Calculate final range (±20%)
  const lowerBound = Math.round(estimatedValue * 0.8);
  const upperBound = Math.round(estimatedValue * 1.2);
  
  // Round estimated value
  estimatedValue = Math.round(estimatedValue);
  
  // Determine confidence level
  if (revenue && ebitda && yearsInOperation && cashOnCash) {
    confidenceLevel = 'high';
  } else if ((!revenue || !ebitda) && !yearsInOperation) {
    confidenceLevel = 'low';
  }
  
  // Return valuation result
  return {
    estimatedValue,
    revenueMultiple: revenue ? revenueMultiple : null,
    ebitdaMultiple: ebitda ? ebitdaMultiple : null,
    valueRange: {
      low: lowerBound,
      high: upperBound
    },
    confidence: confidenceLevel,
    industry,
    factors: {
      revenue: !!revenue,
      ebitda: !!ebitda,
      yearsInOperation: !!yearsInOperation,
      growthRate: !!growthRate
    }
  };
}

// Helper to get industry-specific multipliers
function getIndustryMultipliers(industry) {
  // Default multipliers
  const defaultMultipliers = {
    revenue: 0.8,
    ebitda: 3.5
  };
  
  // Industry-specific multipliers (simplified)
  const industryMap = {
    'Technology': { revenue: 1.5, ebitda: 6.0 },
    'Retail': { revenue: 0.5, ebitda: 3.0 },
    'Manufacturing': { revenue: 0.7, ebitda: 4.0 },
    'Healthcare': { revenue: 1.0, ebitda: 5.0 },
    'Food Services': { revenue: 0.6, ebitda: 3.0 },
    'Financial Services': { revenue: 1.2, ebitda: 5.5 },
    'Construction': { revenue: 0.6, ebitda: 3.5 },
    'Transportation': { revenue: 0.7, ebitda: 3.5 },
    'Hospitality': { revenue: 0.5, ebitda: 3.0 },
    'Software': { revenue: 1.8, ebitda: 7.0 },
    'Other': defaultMultipliers
  };
  
  return industryMap[industry] || defaultMultipliers;
}

// Export the ValuationService instance
export default new ValuationService();

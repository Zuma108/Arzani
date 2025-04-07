import pool from '../db.js';

class PostBusinessValuationService {
    // Main public method called by the controller
    async calculateBusinessValuation(businessData) {
        console.log('--- Starting Post Business Valuation Process ---');
        try {
            // Validate required data
            if (!businessData) {
                throw new Error('No business data provided');
            }
            
            // Extract and clean all financial and business metrics
            const cleanedData = this.validateAndExtractAllInputs(businessData);
            
            // Log the cleaned financial inputs for debugging
            console.log('Validated business inputs:', {
                revenue: cleanedData.gross_revenue,
                ebitda: cleanedData.ebitda,
                cashFlow: cleanedData.cash_flow,
                industry: cleanedData.industry || 'Other'
            });

            // Get Industry Multiplier Data with improved handling
            const industry = cleanedData.industry || 'Other';
            const multiplierData = await this.getIndustryMultiplierData(industry);
            
            // Perform Industry-based Valuation Calculation with ALL metrics
            const valuationResult = this.calculateComprehensiveValuation(cleanedData, multiplierData);

            console.log('--- Post Business Valuation Process Complete ---');
            return valuationResult;

        } catch (error) {
            console.error('Error during calculateBusinessValuation:', error);
            
            // Attempt a fallback if comprehensive calculation fails
            try {
                console.warn('Comprehensive valuation failed, attempting fallback...');
                const fallbackMultiplierData = await this.getIndustryMultiplierData('Other');
                if (fallbackMultiplierData) {
                    return this.generateFallbackValuation(businessData, fallbackMultiplierData);
                } else {
                    return this.generateAbsoluteFallback(businessData);
                }
            } catch (fallbackError) {
                console.error('Error during fallback valuation:', fallbackError);
                return this.generateAbsoluteFallback(businessData, 'Fallback valuation also failed.');
            }
        }
    }

    /**
     * Extract and validate ALL inputs from the business data submission
     */
    validateAndExtractAllInputs(data) {
        const cleanedData = { ...data };
        
        // Core financial fields
        const financialFields = [
            'gross_revenue', 'ebitda', 'cash_flow', 'price', 'revenue', 
            'revenue_prev_year', 'revenue_2_years_ago', 'ebitda_prev_year', 
            'ebitda_2_years_ago', 'sales_multiple', 'profit_margin'
        ];
        
        // Asset fields
        const assetFields = [
            'ffe', 'ffe_value', 'inventory', 'intellectual_property'
        ];
        
        // Operational metrics
        const operationalFields = [
            'years_in_operation', 'employees', 'growth_rate', 'recurring_revenue',
            'client_concentration', 'owner_hours'
        ];
        
        // Debt and financial structure fields
        const debtFields = [
            'debt_service', 'cash_on_cash', 'down_payment', 'total_debt_amount'
        ];
        
        // Business characteristics
        const characteristicFields = [
            'owner_operated', 'scalability', 'has_systems', 'has_training'
        ];
        
        // Process all numeric fields
        const allNumericFields = [
            ...financialFields, ...assetFields, ...operationalFields, ...debtFields
        ];
        
        allNumericFields.forEach(field => {
            if (field in cleanedData) {
                // Convert to string first to handle objects
                const strValue = String(cleanedData[field]);
                // Remove non-numeric characters except dots and negative signs
                const numValue = parseFloat(strValue.replace(/[^0-9.-]/g, ''));
                cleanedData[field] = isNaN(numValue) ? 0 : numValue;
            }
        });
        
        // Process boolean fields
        characteristicFields.forEach(field => {
            if (field in cleanedData) {
                // Convert various formats to boolean
                if (typeof cleanedData[field] === 'string') {
                    cleanedData[field] = ['yes', 'true', '1', 'y'].includes(cleanedData[field].toLowerCase());
                } else {
                    cleanedData[field] = Boolean(cleanedData[field]);
                }
            }
        });
        
        // Ensure location is normalized
        if (cleanedData.location && typeof cleanedData.location === 'string') {
            cleanedData.location = cleanedData.location.trim();
        } else {
            cleanedData.location = '';
        }
        
        // Validate and clean industry field
        if (!cleanedData.industry || typeof cleanedData.industry !== 'string') {
            console.warn('Missing or invalid industry, using "Other"');
            cleanedData.industry = 'Other';
        } else {
            cleanedData.industry = cleanedData.industry.trim();
        }
        
        // Calculate growth rate if not provided but historical data exists
        if (!cleanedData.growth_rate && cleanedData.revenue_prev_year && cleanedData.gross_revenue) {
            const currentRevenue = cleanedData.gross_revenue;
            const prevRevenue = cleanedData.revenue_prev_year;
            
            if (prevRevenue > 0) {
                cleanedData.growth_rate = ((currentRevenue - prevRevenue) / prevRevenue) * 100;
            }
        }
        
        // Calculate average growth if multiple years available
        if (cleanedData.revenue_prev_year && cleanedData.revenue_2_years_ago && 
            cleanedData.revenue_2_years_ago > 0 && cleanedData.revenue_prev_year > 0) {
            const year1Growth = ((cleanedData.revenue_prev_year - cleanedData.revenue_2_years_ago) / 
                               cleanedData.revenue_2_years_ago) * 100;
            const year2Growth = ((cleanedData.gross_revenue - cleanedData.revenue_prev_year) / 
                               cleanedData.revenue_prev_year) * 100;
            cleanedData.avg_growth_rate = (year1Growth + year2Growth) / 2;
        }
        
        // Calculate profit margin if not provided
        if (!cleanedData.profit_margin && cleanedData.gross_revenue > 0 && cleanedData.ebitda) {
            cleanedData.profit_margin = (cleanedData.ebitda / cleanedData.gross_revenue) * 100;
        }
        
        return cleanedData;
    }

    // Get Industry Multiplier Data with improved error handling
    async getIndustryMultiplierData(industry) {
        const defaultIndustry = 'Other';
        const targetIndustry = industry || defaultIndustry;
        
        try {
            console.log(`Looking up industry multipliers for: ${targetIndustry}`);
            
            // Try exact match query first
            const exactQuery = `
                SELECT * FROM industry_multipliers 
                WHERE LOWER(industry) = LOWER($1)
            `;
            
            const exactResult = await pool.query(exactQuery, [targetIndustry]);
            
            if (exactResult.rows.length > 0) {
                console.log(`Found exact multipliers for ${targetIndustry}`);
                return this.validateMultiplierData(exactResult.rows[0]);
            }
            
            // If no exact match, try partial match
            const partialQuery = `
                SELECT * FROM industry_multipliers 
                WHERE LOWER(industry) LIKE LOWER($1)
                LIMIT 1
            `;
            
            const partialResult = await pool.query(partialQuery, [`%${targetIndustry}%`]);
            
            if (partialResult.rows.length > 0) {
                const matchedIndustry = partialResult.rows[0].industry;
                console.log(`Using partial match multipliers: ${matchedIndustry}`);
                return this.validateMultiplierData(partialResult.rows[0]);
            }
            
            // If no match and we're not already looking for "Other", try "Other"
            if (targetIndustry !== defaultIndustry) {
                const fallbackResult = await pool.query(exactQuery, [defaultIndustry]);
                if (fallbackResult.rows.length > 0) {
                    console.log(`Using fallback "Other" industry multipliers`);
                    return this.validateMultiplierData(fallbackResult.rows[0]);
                }
            }
            
            // If all DB queries fail, use hardcoded values
            console.log(`Using hardcoded fallback multipliers for ${targetIndustry}`);
            return this.getHardcodedFallbackMultipliers(targetIndustry);
            
        } catch (error) {
            console.error('Error getting industry multiplier data:', error);
            console.log(`Using hardcoded fallback multipliers for ${targetIndustry}`);
            return this.getHardcodedFallbackMultipliers(targetIndustry);
        }
    }

    // Hardcoded fallback multipliers with improved agriculture values
    getHardcodedFallbackMultipliers(industry) {
        // Industry-specific default multipliers with improved agriculture values
        const industryMultipliers = {
            'Retail': { min: 0.3, max: 0.8, ebitda: 2.5 },
            'Restaurants & Food': { min: 0.3, max: 0.7, ebitda: 2.0 },
            'Online & Technology': { min: 1.0, max: 3.0, ebitda: 5.0 },
            'Service Businesses': { min: 0.5, max: 1.5, ebitda: 3.5 },
            'Manufacturing': { min: 0.6, max: 1.5, ebitda: 4.0 },
            'Health Care & Fitness': { min: 0.7, max: 1.5, ebitda: 3.0 },
            'Construction': { min: 0.5, max: 1.0, ebitda: 3.0 },
            'Transportation': { min: 0.4, max: 1.0, ebitda: 2.5 },
            'Agriculture': { min: 0.6, max: 1.3, ebitda: 3.5 } // Improved agriculture multipliers
        };
        
        // Get multipliers for the specific industry or use defaults
        const multipliers = industryMultipliers[industry] || { min: 0.5, max: 1.5, ebitda: 3.0 };
        
        // Log the selected multipliers
        console.log(`Applied hardcoded multipliers for ${industry}:`, multipliers);
        
        return {
            industry: industry,
            min_revenue_multiplier: multipliers.min,
            max_revenue_multiplier: multipliers.max,
            ebitda_multiplier: multipliers.ebitda,
            avg_profit_margin: 15
        };
    }

    // Enhanced method to calculate valuation with more emphasis on asking price
    calculateComprehensiveValuation(businessData, multiplierData) {
        console.log('--- Starting Comprehensive Valuation Using All Inputs ---');
        
        // Extract ALL financial metrics
        const revenue = Math.max(0, parseFloat(businessData.gross_revenue) || 0);
        const ebitda = parseFloat(businessData.ebitda) || 0;
        const cashFlow = Math.max(0, parseFloat(businessData.cash_flow) || 0);
        // Extract asking price - this will be given special consideration
        const askingPrice = Math.max(0, parseFloat(businessData.price) || 0);
        // Extract other metrics
        const yearsInOperation = Math.max(0, parseInt(businessData.years_in_operation) || 0);
        const growthRate = parseFloat(businessData.growth_rate) || 0;
        const avgGrowthRate = parseFloat(businessData.avg_growth_rate) || growthRate;
        const ffeValue = Math.max(0, parseFloat(businessData.ffe) || parseFloat(businessData.ffe_value) || 0);
        const inventoryValue = Math.max(0, parseFloat(businessData.inventory) || 0);
        const employees = Math.max(0, parseInt(businessData.employees) || 0);
        const revenuePrevYear = Math.max(0, parseFloat(businessData.revenue_prev_year) || 0);
        const revenue2YearsAgo = Math.max(0, parseFloat(businessData.revenue_2_years_ago) || 0);
        const ebitdaPrevYear = parseFloat(businessData.ebitda_prev_year) || 0;
        const ebitda2YearsAgo = parseFloat(businessData.ebitda_2_years_ago) || 0;
        const profitMargin = parseFloat(businessData.profit_margin) || (revenue > 0 ? (ebitda / revenue) * 100 : 0);
        const recurringRevenue = Math.max(0, parseFloat(businessData.recurring_revenue) || 0);
        const debtAmount = Math.max(0, parseFloat(businessData.total_debt_amount) || 0);
        const clientConcentration = Math.min(100, Math.max(0, parseFloat(businessData.client_concentration) || 0));
        const ownerHours = Math.max(0, parseFloat(businessData.owner_hours) || 0);
        const ownerOperated = Boolean(businessData.owner_operated);
        const hasTraining = Boolean(businessData.has_training);
        const hasSystems = Boolean(businessData.has_systems);
        const hasIntellectualProperty = Boolean(businessData.intellectual_property);
        
        // Log the inputs being used
        console.log('Financial inputs:', {
            revenue,
            ebitda,
            cashFlow,
            askingPrice,
            industry: businessData.industry || 'Other'
        });
        
        // Initialize valuation variables
        let estimatedValue = 0;
        let minValue = 0;
        let maxValue = 0;
        let multipleUsed = 0;
        let multipleType = '';
        const factors = {};
        
        // Minimum thresholds
        const MIN_REVENUE = 10000;
        const MIN_VALUATION = 15000;

        // STEP 1: Calculate base valuation using traditional methods
        if (ebitda > 0 && revenue >= MIN_REVENUE) {
            // EBITDA-based valuation (preferred method)
            multipleUsed = multiplierData.ebitda_multiplier;
            multipleType = 'ebitda';
            estimatedValue = ebitda * multipleUsed;
            
            // Revenue-based range
            minValue = revenue * multiplierData.min_revenue_multiplier;
            maxValue = revenue * multiplierData.max_revenue_multiplier;
            
            factors.ebitda = {
                impact: 10,
                analysis: `Based on EBITDA of £${ebitda.toLocaleString()} with industry multiple of ${multipleUsed.toFixed(1)}x`
            };
        } 
        else if (cashFlow > 0 && revenue >= MIN_REVENUE) {
            // Cash Flow based valuation
            const cashFlowMultiplier = multiplierData.ebitda_multiplier * 0.9;
            multipleUsed = cashFlowMultiplier;
            multipleType = 'cash_flow';
            estimatedValue = cashFlow * cashFlowMultiplier;
            
            // Revenue-based range
            minValue = revenue * multiplierData.min_revenue_multiplier;
            maxValue = revenue * multiplierData.max_revenue_multiplier;
            
            factors.cash_flow = {
                impact: 8,
                analysis: `Based on Cash Flow of £${cashFlow.toLocaleString()} with industry multiple of ${multipleUsed.toFixed(1)}x`
            };
        } 
        else if (revenue >= MIN_REVENUE) {
            // Revenue-based valuation
            const avgRevenueMultiplier = (multiplierData.min_revenue_multiplier + multiplierData.max_revenue_multiplier) / 2;
            multipleUsed = avgRevenueMultiplier;
            multipleType = 'revenue';
            estimatedValue = revenue * avgRevenueMultiplier;
            
            // Set range
            minValue = revenue * multiplierData.min_revenue_multiplier;
            maxValue = revenue * multiplierData.max_revenue_multiplier;
            
            factors.revenue = {
                impact: 5,
                analysis: `Based on Revenue of £${revenue.toLocaleString()} with industry multiple of ${multipleUsed.toFixed(2)}x`
            };
        } 
        else {
            // Minimal data available
            estimatedValue = MIN_VALUATION;
            minValue = MIN_VALUATION * 0.8;
            maxValue = MIN_VALUATION * 1.5;
            multipleUsed = 0;
            multipleType = 'minimum';
            
            factors.minimal_data = {
                impact: -10,
                analysis: `Insufficient financial data. Using minimum valuation baseline.`
            };
        }

        // STEP 1.5 (NEW): Calculate asking price validity and integration factor
        if (askingPrice > 0) {
            // Determine how much weight to give to the asking price
            let askingPriceWeight = 0.4; // Base weight of 40%
            
            // If we have strong financial metrics, reduce weight
            if (ebitda > 0 && revenue > MIN_REVENUE) {
                askingPriceWeight = 0.35; // 35% weight with EBITDA
            } else if (cashFlow > 0 && revenue > MIN_REVENUE) {
                askingPriceWeight = 0.35; // 35% weight with Cash Flow
            } else if (revenue > MIN_REVENUE) {
                askingPriceWeight = 0.45; // 45% weight with just Revenue
            } else {
                askingPriceWeight = 0.6; // 60% weight with minimal data
            }
            
            // Calculate a blended valuation that incorporates the asking price
            const calculatedValue = estimatedValue;
            estimatedValue = (calculatedValue * (1 - askingPriceWeight)) + (askingPrice * askingPriceWeight);
            
            console.log(`Blending calculated value (${calculatedValue}) with asking price (${askingPrice}), weight: ${askingPriceWeight}`);
            
            // Add factor to explain the asking price integration
            factors.asking_price_integration = {
                impact: 0, // Neutral impact since this is just integrating the price
                analysis: `Seller's asking price of £${askingPrice.toLocaleString()} was incorporated into the valuation assessment`
            };
            
            // Additional analysis of asking price validity
            const askingPriceRatio = askingPrice / calculatedValue;
            
            if (askingPriceRatio > 1.3) {
                factors.asking_price_analysis = {
                    impact: -5,
                    analysis: `Asking price appears ${Math.round((askingPriceRatio - 1) * 100)}% higher than typical metrics would suggest`
                };
            } else if (askingPriceRatio < 0.7) {
                factors.asking_price_analysis = {
                    impact: 5,
                    analysis: `Asking price appears ${Math.round((1 - askingPriceRatio) * 100)}% lower than typical metrics would suggest`
                };
            } else {
                factors.asking_price_analysis = {
                    impact: 8,
                    analysis: `Asking price aligns well with typical industry metrics`
                };
            }
        }

        // STEP 2: Apply historic trend adjustments
        if (revenuePrevYear > 0 && revenue2YearsAgo > 0) {
            // Three years of history shows stability/trend
            const isGrowing = revenue > revenuePrevYear && revenuePrevYear > revenue2YearsAgo;
            const isDeclining = revenue < revenuePrevYear && revenuePrevYear < revenue2YearsAgo;
            
            if (isGrowing) {
                const trendFactor = 1.1; // 10% premium for consistent growth
                estimatedValue *= trendFactor;
                maxValue *= trendFactor;
                
                factors.consistent_growth = {
                    impact: 5,
                    analysis: `Consistent revenue growth over past 3 years adds a 10% premium to valuation`
                };
            } else if (isDeclining) {
                const trendFactor = 0.9; // 10% discount for consistent decline
                estimatedValue *= trendFactor;
                minValue *= trendFactor;
                
                factors.consistent_decline = {
                    impact: -5,
                    analysis: `Consistent revenue decline over past 3 years reduces valuation by 10%`
                };
            }
        }

        // STEP 3: Apply growth rate adjustments
        if (growthRate !== 0) {
            let growthFactor = 1.0;
            
            if (growthRate > 20) {
                growthFactor = 1.3;
            } else if (growthRate > 10) {
                growthFactor = 1.2;
            } else if (growthRate > 5) {
                growthFactor = 1.1;
            } else if (growthRate < -10) {
                growthFactor = 0.8;
            } else if (growthRate < -5) {
                growthFactor = 0.9;
            } else if (growthRate < 0) {
                growthFactor = 0.95;
            }
            
            if (growthFactor !== 1.0) {
                estimatedValue *= growthFactor;
                
                // Adjust range bounds based on growth
                if (growthFactor > 1) {
                    maxValue *= growthFactor;
                } else {
                    minValue *= growthFactor;
                }
                
                factors.growth_rate = {
                    impact: Math.round((growthFactor - 1) * 50),
                    analysis: `Growth rate of ${growthRate}% adjusted valuation by ${((growthFactor - 1) * 100).toFixed(1)}%`
                };
            }
        }

        // STEP 4: Business age/stability adjustment
        if (yearsInOperation > 0) {
            let ageFactor = 1.0;
            
            if (yearsInOperation > 10) {
                ageFactor = 1.1;
            } else if (yearsInOperation > 5) {
                ageFactor = 1.05;
            } else if (yearsInOperation < 2) {
                ageFactor = 0.9;
            }
            
            if (ageFactor !== 1.0) {
                estimatedValue *= ageFactor;
                
                factors.business_age = {
                    impact: Math.round((ageFactor - 1) * 50),
                    analysis: `${yearsInOperation} years in operation. Stability factor applied: ${ageFactor.toFixed(2)}x`
                };
            }
        }

        // STEP 5: Add value for tangible assets (FF&E/inventory)
        if (ffeValue > 0 || inventoryValue > 0) {
            const assetValue = ffeValue + inventoryValue;
            // Only count a portion of asset value to avoid double-counting
            const assetContribution = Math.min(assetValue * 0.25, revenue * 0.15, 100000);
            
            if (assetContribution > 0) {
                estimatedValue += assetContribution;
                
                factors.assets = {
                    impact: 3,
                    analysis: `Added £${assetContribution.toLocaleString()} for tangible assets (FF&E: £${ffeValue.toLocaleString()}, Inventory: £${inventoryValue.toLocaleString()})`
                };
            }
        }

        // STEP 6: Workforce adjustment
        if (employees > 0) {
            let employeeFactor = 1.0;
            let employeeImpact = 0;
            let employeeAnalysis = '';
            
            if (employees > 50) {
                employeeFactor = 1.1;
                employeeImpact = 5;
                employeeAnalysis = `Large workforce (${employees} employees) indicates established operations`;
            } else if (employees > 20) {
                employeeFactor = 1.05;
                employeeImpact = 3;
                employeeAnalysis = `Medium-sized workforce (${employees} employees) shows stable operations`;
            } else if (employees > 5) {
                employeeFactor = 1.02;
                employeeImpact = 1;
                employeeAnalysis = `Small team of ${employees} employees`;
            } else {
                employeeAnalysis = `Very small team (${employees} employees)`;
            }
            
            if (employeeFactor > 1.0) {
                estimatedValue *= employeeFactor;
                factors.workforce = { impact: employeeImpact, analysis: employeeAnalysis };
            }
        }
        
        // STEP 7: Owner dependence factor (NEW)
        if (ownerHours > 0) {
            let dependenceFactor = 1.0;
            if (ownerHours >= 40) {
                dependenceFactor = 0.90; // 10% discount for high owner dependence
                factors.owner_dependence = {
                    impact: -5,
                    analysis: `Owner works ${ownerHours} hours/week, indicating high dependence (-10% adjustment)`
                };
            } else if (ownerHours >= 20) {
                dependenceFactor = 0.95; // 5% discount for moderate owner dependence
                factors.owner_dependence = {
                    impact: -2.5,
                    analysis: `Owner works ${ownerHours} hours/week, indicating moderate dependence (-5% adjustment)`
                };
            } else if (ownerHours < 10 && ownerHours > 0) {
                dependenceFactor = 1.05; // 5% premium for low owner dependence
                factors.owner_dependence = {
                    impact: 2.5,
                    analysis: `Owner only works ${ownerHours} hours/week, indicating low dependence (+5% adjustment)`
                };
            }
            
            if (dependenceFactor !== 1.0) {
                estimatedValue *= dependenceFactor;
                // Adjust range values accordingly
                if (dependenceFactor < 1.0) {
                    minValue *= dependenceFactor;
                } else {
                    maxValue *= dependenceFactor;
                }
            }
        }
        
        // STEP 8: Systems and documentation value (NEW)
        if (hasSystems || hasTraining) {
            let systemsFactor = 1.0;
            const systemsImpact = [];
            
            if (hasSystems) {
                systemsFactor += 0.05;
                systemsImpact.push("documented systems");
            }
            
            if (hasTraining) {
                systemsFactor += 0.05;
                systemsImpact.push("training materials");
            }
            
            if (systemsFactor > 1.0) {
                estimatedValue *= systemsFactor;
                maxValue *= systemsFactor;
                
                factors.systems_documentation = {
                    impact: Math.round((systemsFactor - 1) * 50),
                    analysis: `Business includes ${systemsImpact.join(" and ")}, adding ${((systemsFactor - 1) * 100).toFixed()}% premium`
                };
            }
        }
        
        // STEP 9: Recurring revenue adjustment (NEW)
        if (recurringRevenue > 0 && revenue > 0) {
            const recurringPercentage = (recurringRevenue / revenue) * 100;
            let recurringFactor = 1.0;
            
            if (recurringPercentage >= 70) {
                recurringFactor = 1.2; // 20% premium for highly recurring revenue
            } else if (recurringPercentage >= 40) {
                recurringFactor = 1.1; // 10% premium for good recurring revenue
            } else if (recurringPercentage >= 20) {
                recurringFactor = 1.05; // 5% premium for some recurring revenue
            }
            
            if (recurringFactor > 1.0) {
                estimatedValue *= recurringFactor;
                maxValue *= recurringFactor;
                
                factors.recurring_revenue = {
                    impact: Math.round((recurringFactor - 1) * 50),
                    analysis: `${recurringPercentage.toFixed()}% of revenue is recurring (£${recurringRevenue.toLocaleString()}), adding ${((recurringFactor - 1) * 100).toFixed()}% premium`
                };
            }
        }
        
        // STEP 10: Client concentration risk (NEW)
        if (clientConcentration > 20) {
            let concentrationFactor = 1.0;
            
            if (clientConcentration > 50) {
                concentrationFactor = 0.85; // 15% discount for severe concentration
            } else if (clientConcentration > 30) {
                concentrationFactor = 0.9; // 10% discount for high concentration
            } else if (clientConcentration > 20) {
                concentrationFactor = 0.95; // 5% discount for moderate concentration
            }
            
            if (concentrationFactor < 1.0) {
                estimatedValue *= concentrationFactor;
                minValue *= concentrationFactor;
                
                factors.client_concentration = {
                    impact: Math.round((concentrationFactor - 1) * 50),
                    analysis: `${clientConcentration.toFixed()}% of revenue comes from top client, reducing valuation by ${((1 - concentrationFactor) * 100).toFixed()}%`
                };
            }
        }
        
        // STEP 11: Intellectual property premium (NEW)
        if (hasIntellectualProperty) {
            const ipFactor = 1.1; // 10% premium for IP
            estimatedValue *= ipFactor;
            maxValue *= ipFactor;
            
            factors.intellectual_property = {
                impact: 5,
                analysis: `Business includes intellectual property, adding 10% premium`
            };
        }
        
        // STEP 12: Profit margin comparison to industry average (NEW)
        if (profitMargin > 0 && multiplierData.avg_profit_margin > 0) {
            const industryMargin = multiplierData.avg_profit_margin;
            let marginFactor = 1.0;
            
            if (profitMargin > industryMargin * 1.5) {
                marginFactor = 1.15; // 15% premium for exceptional margins
                factors.profit_margin = {
                    impact: 7.5,
                    analysis: `Profit margin of ${profitMargin.toFixed(1)}% is significantly above industry average of ${industryMargin.toFixed(1)}%, adding 15% premium`
                };
            } else if (profitMargin > industryMargin * 1.2) {
                marginFactor = 1.1; // 10% premium for very good margins
                factors.profit_margin = {
                    impact: 5,
                    analysis: `Profit margin of ${profitMargin.toFixed(1)}% is well above industry average of ${industryMargin.toFixed(1)}%, adding 10% premium`
                };
            } else if (profitMargin < industryMargin * 0.5) {
                marginFactor = 0.85; // 15% discount for very poor margins
                factors.profit_margin = {
                    impact: -7.5,
                    analysis: `Profit margin of ${profitMargin.toFixed(1)}% is significantly below industry average of ${industryMargin.toFixed(1)}%, reducing valuation by 15%`
                };
            } else if (profitMargin < industryMargin * 0.8) {
                marginFactor = 0.9; // 10% discount for below-average margins
                factors.profit_margin = {
                    impact: -5,
                    analysis: `Profit margin of ${profitMargin.toFixed(1)}% is below industry average of ${industryMargin.toFixed(1)}%, reducing valuation by 10%`
                };
            }
            
            if (marginFactor !== 1.0) {
                estimatedValue *= marginFactor;
                if (marginFactor > 1.0) {
                    maxValue *= marginFactor;
                } else {
                    minValue *= marginFactor;
                }
            }
        }
        
        // STEP 13: Debt adjustment (NEW)
        if (debtAmount > 0) {
            // Remove debt from valuation as it would typically be paid off or assumed by buyer
            estimatedValue -= debtAmount;
            minValue -= debtAmount;
            maxValue -= debtAmount;
            
            // Ensure values don't go below minimum threshold
            estimatedValue = Math.max(MIN_VALUATION, estimatedValue);
            minValue = Math.max(MIN_VALUATION * 0.7, minValue);
            maxValue = Math.max(minValue * 1.2, maxValue);
            
            factors.debt_adjustment = {
                impact: -5,
                analysis: `Adjusted for £${debtAmount.toLocaleString()} in business debt`
            };
        }

        // STEP 14: Final range adjustments and validation
        if (askingPrice > 0) {
            // Make the range more centered around the asking price
            // while still respecting the calculated min/max
            
            // Calculate range limits
            const standardRangeWidth = maxValue - minValue;
            const askingPriceVariance = 0.2; // Allow 20% variance either direction
            
            // Create a range centered on asking price
            const askingPriceMin = askingPrice * (1 - askingPriceVariance);
            const askingPriceMax = askingPrice * (1 + askingPriceVariance);
            
            // Blend the standard range with the asking price range
            minValue = (minValue * 0.6) + (askingPriceMin * 0.4);
            maxValue = (maxValue * 0.6) + (askingPriceMax * 0.4);
            
            console.log(`Range adjusted to incorporate asking price: £${minValue.toFixed(0)} - £${maxValue.toFixed(0)}`);
        }

        estimatedValue = Math.max(MIN_VALUATION, estimatedValue);
        minValue = Math.max(MIN_VALUATION * 0.7, minValue);
        maxValue = Math.max(minValue * 1.2, maxValue);

        // Ensure estimated value falls within the range
        estimatedValue = Math.max(minValue, Math.min(estimatedValue, maxValue));

        // Calculate confidence score based on data quality
        const confidence = this.calculateEnhancedConfidenceScore(businessData);
        
        // Round final values for cleaner display
        estimatedValue = Math.round(estimatedValue / 100) * 100;
        minValue = Math.round(minValue / 100) * 100;
        maxValue = Math.round(maxValue / 100) * 100;
        
        // Generate market comparables
        const marketComparables = this.generateMarketComparables(businessData, multiplierData, multipleUsed, multipleType);
        
        // Generate recommendations
        const recommendations = this.generateRecommendations(businessData, factors);

        return {
            estimatedValue,
            valuationRange: { min: minValue, max: maxValue },
            confidence,
            multiple: multipleUsed,
            multipleType,
            summary: `Valuation based on ${businessData.industry || 'your industry'} metrics and ${Object.keys(factors).length} business factors`,
            factors,
            industryData: multiplierData,
            marketComparables,
            recommendations,
            // Include all metrics used in calculation for reference
            businessMetrics: {
                revenue,
                ebitda,
                cashFlow,
                yearsInOperation,
                growthRate,
                avgGrowthRate,
                ffeValue,
                inventoryValue,
                employees,
                revenuePrevYear,
                revenue2YearsAgo,
                profitMargin,
                recurringRevenue,
                debtAmount,
                clientConcentration,
                ownerHours
            }
        };
    }

    // Generate market comparables based on industry data
    generateMarketComparables(businessData, multiplierData, multipleUsed, multipleType) {
        const revenue = Math.max(0, parseFloat(businessData.gross_revenue) || 0);
        const ebitda = parseFloat(businessData.ebitda) || 0;
        const cashFlow = Math.max(0, parseFloat(businessData.cash_flow) || 0);
        
        const comparables = {
            intro: `Comparing your metrics to typical benchmarks for the ${businessData.industry || 'Other'} industry:`,
            metrics: []
        };

        // Revenue Multiple Comparison
        if (revenue > 0) {
            const yourRevMultiple = multipleType === 'revenue' ? multipleUsed : 
                (ebitda > 0 ? (businessData.estimatedValue || 0) / revenue : 0);
                
            comparables.metrics.push({
                name: 'Revenue Multiple',
                yourValue: yourRevMultiple > 0 ? yourRevMultiple.toFixed(2) + 'x' : 'N/A',
                industryAverage: `${multiplierData.min_revenue_multiplier.toFixed(2)}x - ${multiplierData.max_revenue_multiplier.toFixed(2)}x`,
                unit: ''
            });
        }

        // EBITDA Multiple Comparison
        if (ebitda > 0) {
            const yourEbitdaMultiple = multipleType === 'ebitda' ? multipleUsed : 
                (businessData.estimatedValue || 0) / ebitda;
                
            comparables.metrics.push({
                name: 'EBITDA Multiple',
                yourValue: yourEbitdaMultiple.toFixed(1) + 'x',
                industryAverage: multiplierData.ebitda_multiplier.toFixed(1) + 'x',
                unit: ''
            });
        } else if (cashFlow > 0) {
            // If no EBITDA but Cash Flow is available
            const cashFlowMultiple = multipleType === 'cash_flow' ? multipleUsed : 
                (businessData.estimatedValue || 0) / cashFlow;
                
            comparables.metrics.push({
                name: 'Cash Flow Multiple',
                yourValue: cashFlowMultiple.toFixed(1) + 'x',
                industryAverage: (multiplierData.ebitda_multiplier * 0.9).toFixed(1) + 'x',
                unit: ''
            });
        }

        // Add industry-specific metrics
        if (businessData.industry === 'Retail' || businessData.industry === 'Restaurants & Food') {
            comparables.metrics.push({
                name: 'Inventory as % of Value',
                yourValue: revenue > 0 ? (((parseFloat(businessData.inventory) || 0) / revenue) * 100).toFixed(1) + '%' : 'N/A',
                industryAverage: businessData.industry === 'Retail' ? '20-30%' : '10-20%',
                unit: ''
            });
        }

        return comparables;
    }

    // Generate recommendations based on business factors
    generateRecommendations(businessData, factors) {
        const recommendations = {
            title: "Recommendations to Enhance Business Value",
            items: []
        };
        
        // Add specific recommendations based on data
        if ((parseFloat(businessData.ebitda) || 0) <= 0) {
            recommendations.items.push("Improve profitability metrics to increase valuation - EBITDA is a key driver of business value");
        }
        
        if ((parseInt(businessData.years_in_operation) || 0) < 3) {
            recommendations.items.push("Consider waiting longer to sell if possible - businesses with longer operating history typically command better valuations");
        }
        
        if ((parseFloat(businessData.growth_rate) || 0) < 0) {
            recommendations.items.push("Work on improving growth metrics before selling - negative growth significantly impacts valuation");
        }
        
        // Add recommendation about asking price if it's significantly different from valuation
        if (factors.asking_price && factors.asking_price.impact < 0) {
            recommendations.items.push("Your asking price appears high relative to financial metrics - consider adjusting or providing strong justification for the premium");
        } else if (factors.asking_price && factors.asking_price.impact > 0) {
            recommendations.items.push("Your asking price may be below market value - consider whether you're leaving money on the table");
        }
        
        // If few specific recommendations, add generic ones
        if (recommendations.items.length < 2) {
            recommendations.items.push("Ensure financial documentation is organized and up-to-date for the due diligence process");
            recommendations.items.push("Document business systems and processes to demonstrate ease of transition to a new owner");
        }
        
        return recommendations;
    }

    // Fallback valuation using simple industry multipliers
    generateFallbackValuation(businessData, multiplierData) {
        console.warn('Executing Fallback Valuation Logic for Post Business');
        
        const revenue = Math.max(0, parseFloat(businessData.gross_revenue) || 0);
        const ebitda = parseFloat(businessData.ebitda) || 0;
        const cashFlow = Math.max(0, parseFloat(businessData.cash_flow) || 0);
        const askingPrice = Math.max(0, parseFloat(businessData.price) || 0);
        const MIN_VALUATION = 15000;
        
        let estimatedValue, minValue, maxValue, multipleUsed, multipleType;

        // Calculate base value using traditional metrics
        if (ebitda > 0) {
            multipleUsed = multiplierData.ebitda_multiplier;
            multipleType = 'EBITDA';
            estimatedValue = ebitda * multipleUsed;
        } else if (cashFlow > 0) {
            multipleUsed = multiplierData.ebitda_multiplier * 0.9;
            multipleType = 'Cash Flow';
            estimatedValue = cashFlow * multipleUsed;
        } else if (revenue > 0) {
            const avgRevenueMultiplier = (multiplierData.min_revenue_multiplier + multiplierData.max_revenue_multiplier) / 2;
            multipleUsed = avgRevenueMultiplier;
            multipleType = 'Revenue';
            estimatedValue = revenue * multipleUsed;
        } else {
            estimatedValue = MIN_VALUATION;
            multipleUsed = 0;
            multipleType = 'Minimum';
        }

        // Blend with asking price if available
        if (askingPrice > 0) {
            // More weight on asking price in fallback scenario
            const askingPriceWeight = 0.5; // 50% weight
            estimatedValue = (estimatedValue * (1 - askingPriceWeight)) + (askingPrice * askingPriceWeight);
        }

        // Set range based on estimatedValue (with asking price influence)
        minValue = Math.max(MIN_VALUATION * 0.7, estimatedValue * 0.75);
        maxValue = Math.max(minValue * 1.5, estimatedValue * 1.25);
        
        // If asking price exists, adjust range to include it
        if (askingPrice > 0) {
            if (askingPrice < minValue) {
                minValue = Math.max(MIN_VALUATION * 0.7, askingPrice * 0.9);
            } else if (askingPrice > maxValue) {
                maxValue = askingPrice * 1.1;
            }
        }
        
        // Round values
        estimatedValue = Math.round(estimatedValue / 100) * 100;
        minValue = Math.round(minValue / 100) * 100;
        maxValue = Math.round(maxValue / 100) * 100;
        
        // Basic confidence calculation - higher if asking price is provided
        const confidence = ebitda > 0 ? 75 : (cashFlow > 0 ? 65 : (revenue > 0 ? 55 : 30)) + (askingPrice > 0 ? 5 : 0);

        return {
            estimatedValue: estimatedValue,
            valuationRange: { min: minValue, max: maxValue },
            confidence: confidence,
            multiple: multipleUsed,
            multipleType: multipleType,
            summary: `Based on ${businessData.industry || 'industry'} metrics and seller expectations`,
            factors: { 
                fallback: { 
                    impact: 0, 
                    analysis: 'Simple valuation based on industry multipliers and asking price' 
                }
            },
            industryData: multiplierData
        };
    }

    // Absolute fallback with minimal calculation
    generateAbsoluteFallback(businessData, message = 'Could not perform detailed valuation due to missing data.') {
        console.error('Executing Absolute Fallback Valuation');
        const MIN_VALUATION = 15000;
        
        return {
            estimatedValue: MIN_VALUATION,
            valuationRange: { min: MIN_VALUATION * 0.7, max: MIN_VALUATION * 1.5 },
            confidence: 10,
            multiple: 0,
            multipleType: 'Minimum',
            summary: message,
            factors: { error: { impact: -20, analysis: message } },
            industryData: null
        };
    }

    // Validate multiplier data to ensure all required fields are present
    validateMultiplierData(data) {
        const validated = { ...data };
        const defaultMinRev = 0.5;
        const defaultMaxRev = 1.5;
        const defaultEbitda = 3.0;

        validated.min_revenue_multiplier = parseFloat(validated.min_revenue_multiplier || defaultMinRev);
        validated.max_revenue_multiplier = parseFloat(validated.max_revenue_multiplier || defaultMaxRev);
        validated.ebitda_multiplier = parseFloat(validated.ebitda_multiplier || defaultEbitda);

        if (isNaN(validated.min_revenue_multiplier) || validated.min_revenue_multiplier <= 0) {
            validated.min_revenue_multiplier = defaultMinRev;
        }
        if (isNaN(validated.max_revenue_multiplier) || validated.max_revenue_multiplier <= validated.min_revenue_multiplier) {
            validated.max_revenue_multiplier = Math.max(defaultMaxRev, validated.min_revenue_multiplier * 1.5);
        }
        if (isNaN(validated.ebitda_multiplier) || validated.ebitda_multiplier <= 0) {
            validated.ebitda_multiplier = defaultEbitda;
        }
        
        return validated;
    }

    // Calculate an enhanced confidence score based on data completeness
    calculateEnhancedConfidenceScore(businessData) {
        // Essential financial data
        const essentialFields = [
            'gross_revenue', 'ebitda', 'cash_flow', 'price', 'industry'
        ];
        
        // Important supporting data
        const importantFields = [
            'location', 'years_in_operation', 'employees', 'growth_rate',
            'inventory', 'ffe', 'recurring_revenue', 'owner_hours'
        ];
        
        // Additional data that improves accuracy
        const additionalFields = [
            'revenue_prev_year', 'revenue_2_years_ago', 'ebitda_prev_year',
            'ebitda_2_years_ago', 'client_concentration', 'profit_margin',
            'intellectual_property', 'has_systems', 'has_training'
        ];
        
        const hasValue = (field) => {
            const value = businessData[field];
            return value !== undefined && value !== null && value !== '';
        };
        
        const filledEssential = essentialFields.filter(hasValue).length;
        const filledImportant = importantFields.filter(hasValue).length;
        const filledAdditional = additionalFields.filter(hasValue).length;
        
        // Base confidence starts higher if multiple financial metrics are present
        const financialMetricsPresent = [
            hasValue('gross_revenue'), 
            hasValue('ebitda'), 
            hasValue('cash_flow')
        ].filter(Boolean).length;
        
        const baseConfidence = financialMetricsPresent > 1 ? 50 : (financialMetricsPresent > 0 ? 40 : 30);
        
        // Calculate weighted score based on all three categories
        const essentialWeight = 0.5; // 50% weight on essential fields
        const importantWeight = 0.3; // 30% weight on important fields
        const additionalWeight = 0.2; // 20% weight on additional fields
        
        const essentialScore = essentialFields.length > 0 ? (filledEssential / essentialFields.length) * essentialWeight : 0;
        const importantScore = importantFields.length > 0 ? (filledImportant / importantFields.length) * importantWeight : 0;
        const additionalScore = additionalFields.length > 0 ? (filledAdditional / additionalFields.length) * additionalWeight : 0;
        
        // Combine scores and scale to 100
        let confidence = baseConfidence + (essentialScore + importantScore + additionalScore) * (100 - baseConfidence);
        
        // Apply additional boosts for high-quality data
        if (hasValue('revenue_prev_year') && hasValue('revenue_2_years_ago')) {
            confidence += 5; // Boost for having multiple years of revenue
        }
        
        if (hasValue('ebitda') && hasValue('ebitda_prev_year')) {
            confidence += 5; // Boost for having multiple years of EBITDA
        }
        
        // Ensure confidence is within 0-100 range
        confidence = Math.max(10, Math.min(95, Math.round(confidence)));
        
        return confidence;
    }
}

export default new PostBusinessValuationService();

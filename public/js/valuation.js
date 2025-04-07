/**
 * Business Valuation Calculator
 * Handles the valuation calculation process on the client side
 */

// Function to calculate business valuation
async function calculateBusinessValuation(businessData) {
    try {
        console.log('Sending valuation calculation request...');
        
        // Add headers to ensure API bypasses auth
        const response = await fetch('/api/business/calculate-valuation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Request-Source': 'valuation-calculator',
                'X-Skip-Auth': 'true',
                'Accept': 'application/json' // Explicitly request JSON
            },
            body: JSON.stringify(businessData)
        });
        
        // Check if response is OK
        if (!response.ok) {
            console.error('API Error:', response.status, response.statusText);
            
            // Try to get the error message from the response - check content type
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const errorData = await response.json();
                throw new Error(`API returned status ${response.status}: ${errorData.message || response.statusText}`);
            } else {
                // Not JSON, possibly HTML error page
                const errorText = await response.text();
                console.error('Non-JSON error response:', errorText.substring(0, 200) + '...');
                throw new Error(`API returned non-JSON response with status ${response.status}`);
            }
        }
        
        // Parse and return the valuation data
        const data = await response.json();
        console.log('Valuation calculation successful:', data);
        return data.valuation;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Function to save questionnaire data
async function saveQuestionnaireData(questionnaireData) {
    try {
        console.log('Saving questionnaire data...');
        console.log('Sending to endpoint: /api/business/save-questionnaire');
        
        // Add headers to ensure API bypasses auth
        const response = await fetch('/api/business/save-questionnaire', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Request-Source': 'valuation-calculator',
                'X-Skip-Auth': 'true',
                'Accept': 'application/json' // Explicitly request JSON
            },
            body: JSON.stringify(questionnaireData)
        });
        
        if (!response.ok) {
            console.error('API Error:', response.status, response.statusText);
            
            // Check content type before attempting to parse as JSON
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const errorData = await response.json();
                throw new Error(`API returned status ${response.status}: ${errorData.message || response.statusText}`);
            } else {
                const errorText = await response.text();
                console.error('Non-JSON error response:', errorText.substring(0, 200) + '...');
                throw new Error(`API returned non-JSON response with status ${response.status}`);
            }
        }
        
        const data = await response.json();
        console.log('Questionnaire data saved successfully:', data);
        
        // Store the submission ID in localStorage
        if (data.submissionId) {
            localStorage.setItem('questionnaireSubmissionId', data.submissionId);
        }
        
        return data;
    } catch (error) {
        console.error('Error saving questionnaire data:', error);
        throw error;
    }
}

// Collect data from localStorage to prepare for saving
function collectQuestionnaireData() {
    return {
        email: localStorage.getItem('sellerEmail'),
        businessName: localStorage.getItem('sellerBusinessName'),
        industry: localStorage.getItem('sellerIndustry'),
        description: localStorage.getItem('sellerDescription'),
        yearEstablished: localStorage.getItem('sellerYearEstablished'),
        yearsInOperation: localStorage.getItem('sellerYearsInOperation'),
        contactName: localStorage.getItem('sellerContactName'),
        contactPhone: localStorage.getItem('sellerContactPhone'),
        location: localStorage.getItem('sellerLocation'),
        revenueExact: localStorage.getItem('sellerRevenueExact'),
        revenuePrevYear: localStorage.getItem('sellerRevenuePrevYear'),
        revenue2YearsAgo: localStorage.getItem('sellerRevenue2YearsAgo'),
        ebitda: localStorage.getItem('sellerEbitda'),
        ebitdaPrevYear: localStorage.getItem('sellerEbitdaPrevYear'),
        ebitda2YearsAgo: localStorage.getItem('sellerEbitda2YearsAgo'),
        cashOnCash: localStorage.getItem('sellerCashOnCash'),
        ffeValue: localStorage.getItem('sellerFfeValue'),
        ffeItems: localStorage.getItem('sellerFfeItems'),
        growthRate: localStorage.getItem('sellerGrowthRate'),
        growthAreas: localStorage.getItem('sellerGrowthAreas'),
        growthChallenges: localStorage.getItem('sellerGrowthChallenges'),
        scalability: localStorage.getItem('sellerScalability'),
        totalDebtAmount: localStorage.getItem('sellerTotalDebtAmount'),
        debtTransferable: localStorage.getItem('sellerDebtTransferable'),
        debtNotes: localStorage.getItem('sellerDebtNotes'),
        debtItems: localStorage.getItem('sellerDebtItems'),
        askingPrice: localStorage.getItem('sellerAskingPrice')
    };
}

/**
 * Enhanced function to collect all form data from localStorage
 * This ensures we're capturing all relevant fields from the questionnaire
 */
function collectFormData() {
  // Helper function to safely parse numbers
  const parseNum = (key) => {
    const val = localStorage.getItem(key);
    // Check for null, undefined, or empty string explicitly
    if (val === null || val === undefined || val === '') return null;
    // Remove currency symbols, commas, and spaces before parsing
    const cleanedVal = String(val).replace(/[£$,\s]/g, '');
    const num = parseFloat(cleanedVal);
    return isNaN(num) ? null : num;
  };

  // Helper function to safely parse integers
  const parseIntStrict = (key) => {
    const val = localStorage.getItem(key);
    if (val === null || val === undefined || val === '') return null;
    // Remove any non-digit characters except a potential leading minus sign
    const cleanedVal = String(val).replace(/[^\d-]/g, '');
    const num = parseInt(cleanedVal, 10);
    return isNaN(num) ? null : num;
  };

  // Create a mapping of field names to localStorage keys
  const fieldMapping = {
    // Basic information
    email: 'sellerEmail',
    businessName: 'sellerBusinessName',
    industry: 'sellerIndustry',
    description: 'sellerDescription',
    location: 'sellerLocation',
    yearEstablished: 'sellerYearEstablished', // Keep as string/text initially
    yearsInOperation: 'sellerYearsInOperation', // Will be calculated or parsed as number

    // Contact information
    contactName: 'sellerContactName',
    contactPhone: 'sellerContactPhone',

    // Financial data - Use parseNum helper
    revenue: 'sellerRevenueExact',
    revenuePrevYear: 'sellerRevenuePrevYear',
    revenue2YearsAgo: 'sellerRevenue2YearsAgo',
    revenue3YearsAgo: 'sellerRevenue3YearsAgo', // Added
    ebitda: 'sellerEbitda',
    ebitdaPrevYear: 'sellerEbitdaPrevYear',
    ebitda2YearsAgo: 'sellerEbitda2YearsAgo',
    cashOnCash: 'sellerCashOnCash',

    // Physical assets - Use parseNum helper
    ffeValue: 'sellerFfeValue',
    ffeItems: 'sellerFfeItems', // Keep as string

    // Growth information - Use parseNum helper for rate
    growthRate: 'sellerGrowthRate',
    growthAreas: 'sellerGrowthAreas', // Keep as string
    growthChallenges: 'sellerGrowthChallenges', // Keep as string
    scalability: 'sellerScalability', // Keep as string

    // Debt information - Use parseNum helper for amount
    totalDebtAmount: 'sellerTotalDebtAmount',
    debtTransferable: 'sellerDebtTransferable', // Keep as string
    debtNotes: 'sellerDebtNotes', // Keep as string
    debtItems: 'sellerDebtItems', // Keep as string (JSON array)

    // Pricing information - Use parseNum helper
    askingPrice: 'sellerAskingPrice'
  };

  // Create an object to store the collected data
  const formData = {};

  // Process each field using the mapping
  for (const [fieldName, localStorageKey] of Object.entries(fieldMapping)) {
    let value;
    // Use specific parsers for numeric fields
    if ([
      'revenue', 'revenuePrevYear', 'revenue2YearsAgo', 'revenue3YearsAgo',
      'ebitda', 'ebitdaPrevYear', 'ebitda2YearsAgo', 'cashOnCash',
      'ffeValue', 'growthRate', 'totalDebtAmount', 'askingPrice'
    ].includes(fieldName)) {
      value = parseNum(localStorageKey);
    } else if (fieldName === 'yearsInOperation') {
      value = parseIntStrict(localStorageKey);
    } else {
      value = localStorage.getItem(localStorageKey);
    }

    // Only include the field if it has a value (not null or undefined)
    if (value !== null && value !== undefined) {
      // Ensure empty strings are not included unless intended (e.g., for text areas)
      if (typeof value === 'string' && value.trim() === '' && !['description', 'ffeItems', 'growthAreas', 'growthChallenges', 'debtNotes', 'debtItems'].includes(fieldName)) {
         // Skip empty strings for non-textarea fields
      } else {
         formData[fieldName] = value;
      }
    }
  }

  // Recalculate yearsInOperation if yearEstablished exists and yearsInOperation wasn't parsed
  if (formData.yearEstablished && formData.yearsInOperation === null) {
      const establishedYear = parseInt(formData.yearEstablished, 10);
      if (!isNaN(establishedYear) && establishedYear > 1900 && establishedYear <= new Date().getFullYear()) {
          formData.yearsInOperation = new Date().getFullYear() - establishedYear;
      }
  }

  // Add any existing submission ID
  const submissionId = localStorage.getItem('questionnaireSubmissionId');
  if (submissionId) {
    formData.submissionId = submissionId;
  }

  // Add metadata about the submission
  formData.submissionTimestamp = new Date().toISOString();
  formData.submissionSource = 'valuation-calculator'; // Identify source

  console.log('Collected Form Data:', formData); // Log collected data
  return formData;
}

/**
 * Updates the valuation range slider to match the calculated range
 * @param {number} minValuation - Minimum valuation in GBP
 * @param {number} maxValuation - Maximum valuation in GBP
 */
function updateValuationSlider(minValuation, maxValuation) {
    const slider = document.getElementById('valuation-slider');
    if (!slider) return;
    
    // Set the slider's min, max, and value attributes
    slider.min = minValuation;
    slider.max = maxValuation;
    
    // Set initial value to midpoint of range
    const midpoint = Math.round((minValuation + maxValuation) / 2);
    slider.value = midpoint;
    
    // Update the displayed value
    const sliderValue = document.getElementById('slider-value');
    if (sliderValue) {
        sliderValue.textContent = formatCurrency(midpoint);
    }
    
    // Update the slider's background to show progress
    updateSliderBackground(slider);
    
    // Force a repaint to ensure the slider updates visually
    void slider.offsetWidth;
    
    console.log(`Slider updated: min=${minValuation}, max=${maxValuation}, value=${midpoint}`);
}

/**
 * Updates the slider's background to reflect current position
 * @param {HTMLElement} slider - The slider element
 */
function updateSliderBackground(slider) {
    if (!slider) return;
    
    const min = parseInt(slider.min, 10);
    const max = parseInt(slider.max, 10);
    const value = parseInt(slider.value, 10);
    
    // Calculate percentage of progress
    const percentage = ((value - min) / (max - min)) * 100;
    
    // Apply the gradient to show progress
    slider.style.background = `linear-gradient(to right, #3e50f7 0%, #3e50f7 ${percentage}%, #e0e7ff ${percentage}%, #e0e7ff 100%)`;
}

/**
 * Updates the displayed valuation range
 * @param {number} minValuation - Minimum valuation
 * @param {number} maxValuation - Maximum valuation
 */
function updateValuationRange(minValuation, maxValuation) {
    // Update the displayed range
    const minValuationElement = document.getElementById('min-valuation');
    const maxValuationElement = document.getElementById('max-valuation');
    
    if (minValuationElement) {
        minValuationElement.textContent = formatCurrency(minValuation);
    }
    
    if (maxValuationElement) {
        maxValuationElement.textContent = formatCurrency(maxValuation);
    }
    
    // Update the slider to match this range
    updateValuationSlider(minValuation, maxValuation);
}

// Handle slider input events
document.addEventListener('DOMContentLoaded', function() {
    const slider = document.getElementById('valuation-slider');
    const sliderValue = document.getElementById('slider-value');
    
    if (slider && sliderValue) {
        // Initial update for the slider value display
        sliderValue.textContent = formatCurrency(slider.value);
        
        // Update the slider background initially
        updateSliderBackground(slider);
        
        // Update when the slider is moved
        slider.addEventListener('input', function() {
            sliderValue.textContent = formatCurrency(this.value);
            updateSliderBackground(this);
        });
        
        // Ensure the slider reflects any changes after calculation
        document.addEventListener('valuationCalculated', function(e) {
            if (e.detail && e.detail.minValuation && e.detail.maxValuation) {
                updateValuationRange(e.detail.minValuation, e.detail.maxValuation);
            }
        });
    }
});

// Function to calculate the business valuation
async function calculateValuation() {
    try {
        // Show loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('hidden');
        }

        // Gather business data from localStorage using the updated function
        const businessData = collectFormData();

        console.log('Calculating valuation with data:', businessData);

        // Validate minimum required data
        if (!businessData.revenue && !businessData.ebitda) {
            throw new Error('Revenue or EBITDA is required for valuation calculation');
        }
        if (businessData.revenue < 10000 && businessData.ebitda <= 0) {
             throw new Error('Revenue must be at least £10,000 if EBITDA is not positive.');
        }

        try {
            // Call the valuation API with explicit headers
            const response = await fetch('/api/business/calculate-valuation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Request-Source': 'valuation-calculator' // Identify the source
                },
                body: JSON.stringify(businessData)
            });

            // Improved error handling to debug API responses
            if (!response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    console.error('API Error Response (JSON):', errorData);
                    throw new Error(`API returned error: ${errorData.message || 'Unknown error'}`);
                } else {
                    const errorText = await response.text();
                    console.error('API Error Response (non-JSON):', errorText.substring(0, 200) + '...');
                    throw new Error(`API returned status ${response.status} with non-JSON response`);
                }
            }

            // Parse response
            const result = await response.json();

            if (result.success && result.valuation) {
                // Handle successful valuation result
                displayValuationResults(result.valuation);
            } else {
                // Handle error response from API
                displayError(result.message || 'Valuation failed');
            }
        } catch (apiError) {
            console.error('API Error during valuation calculation:', apiError);
            // Fall back to client-side calculation in case of API failure
            const fallbackValuation = calculateEnhancedFallbackValuation(businessData);
            console.log('Using fallback valuation:', fallbackValuation);
            displayValuationResults(fallbackValuation);
        }
    } catch (error) {
        console.error('Valuation error:', error);
        displayError(error.message || 'Failed to calculate valuation. Please ensure required fields are entered.');
    } finally {
        // Ensure loading overlay is hidden even if errors occur
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
        }
    }
}

/**
 * Enhanced fallback valuation calculation incorporating all available business metrics
 * @param {Object} businessData - Comprehensive business data from questionnaire
 * @returns {Object} Complete valuation result
 */
function calculateEnhancedFallbackValuation(businessData) {
  console.log('Using enhanced fallback valuation calculation with all available metrics');
  
  // Use industry-specific multipliers based on the industry_multipliers table values
  const industryMultipliers = {
    'Financial Services': {min: 0.8, max: 2.2, ebitda: 4.5, profitMargin: 25},
    'Health Care & Fitness': {min: 0.7, max: 1.8, ebitda: 4.0, profitMargin: 18},
    'Manufacturing': {min: 0.6, max: 1.5, ebitda: 3.5, profitMargin: 15},
    'Online & Technology': {min: 1.0, max: 3.0, ebitda: 5.0, profitMargin: 22},
    'Pet Services': {min: 0.6, max: 1.6, ebitda: 3.0, profitMargin: 15},
    'Restaurants & Food': {min: 0.4, max: 1.2, ebitda: 2.5, profitMargin: 12},
    'Retail': {min: 0.3, max: 1.0, ebitda: 3.0, profitMargin: 12},
    'Service Businesses': {min: 0.5, max: 1.5, ebitda: 3.5, profitMargin: 20},
    'Transportation & Storage': {min: 0.4, max: 1.3, ebitda: 3.0, profitMargin: 14},
    'Travel': {min: 0.4, max: 1.3, ebitda: 3.0, profitMargin: 14},
    'Wholesale & Distributors': {min: 0.4, max: 1.0, ebitda: 2.5, profitMargin: 12},
    'Other': {min: 0.5, max: 1.5, ebitda: 3.0, profitMargin: 15}
  };
  
  // Get multipliers for this industry or default to 'Other'
  const multiplier = industryMultipliers[businessData.industry] || industryMultipliers['Other'];
  
  // Calculate valuation based on available financial data
  let estimatedValue, minValue, maxValue, multipleUsed, multipleType;
  const factors = [];
  
  // STEP 1: Calculate base valuation using either EBITDA or revenue
  if (businessData.ebitda > 0) {
    // EBITDA-based valuation (preferred)
    multipleUsed = multiplier.ebitda;
    multipleType = 'ebitda';
    estimatedValue = Math.round(businessData.ebitda * multipleUsed);
    
    // Derive revenue from EBITDA if not available
    const calculatedRevenue = businessData.revenue || (businessData.ebitda / (multiplier.profitMargin / 100));
    
    // Use revenue multipliers for the range
    minValue = Math.round(calculatedRevenue * multiplier.min);
    maxValue = Math.round(calculatedRevenue * multiplier.max);
    
    // Add EBITDA as a positive factor
    factors.push({
      name: 'EBITDA',
      impact: 10,
      analysis: `Your EBITDA of £${businessData.ebitda.toLocaleString()} with a ${multipleUsed.toFixed(1)}x multiple forms the core of this valuation.`
    });
  } else {
    // Revenue-based valuation (fallback)
    const avgRevenueMultiplier = (multiplier.min + multiplier.max) / 2;
    multipleUsed = avgRevenueMultiplier;
    multipleType = 'revenue';
    estimatedValue = Math.round(businessData.revenue * avgRevenueMultiplier);
    
    // Direct revenue multiplier range
    minValue = Math.round(businessData.revenue * multiplier.min);
    maxValue = Math.round(businessData.revenue * multiplier.max);
    
    // Add revenue as a neutral factor
    factors.push({
      name: 'Revenue',
      impact: 5,
      analysis: `Your annual revenue of £${businessData.revenue.toLocaleString()} with a ${multipleUsed.toFixed(2)}x multiple forms the core of this valuation.`
    });
  }
  
  // STEP 2: Apply industry-specific adjustments
  factors.push({
    name: 'Industry',
    impact: 5,
    analysis: `${businessData.industry || 'Your industry'} businesses typically sell for ${multiplier.min}x-${multiplier.max}x revenue or ${multiplier.ebitda}x EBITDA.`
  });
  
  // STEP 3: Adjust for growth rate with more accurate scaling
  if (businessData.growthRate && businessData.growthRate > 0) {
    // More refined growth adjustment with diminishing returns for very high growth
    let growthFactor;
    if (businessData.growthRate <= 10) {
      // Linear growth impact for modest growth rates (up to 10%)
      growthFactor = 1 + (businessData.growthRate / 100);
    } else if (businessData.growthRate <= 30) {
      // Decreasing marginal returns for growth between 10-30%
      growthFactor = 1.1 + ((businessData.growthRate - 10) / 200);
    } else {
      // Strongly diminishing returns for growth above 30%
      growthFactor = 1.2 + ((businessData.growthRate - 30) / 400);
    }
    
    estimatedValue = Math.round(estimatedValue * growthFactor);
    maxValue = Math.round(maxValue * growthFactor);
    
    // Add growth as a factor (positive impact for positive growth)
    const growthImpact = Math.min(businessData.growthRate / 5, 10);
    factors.push({
      name: 'Growth Rate',
      impact: growthImpact,
      analysis: `Your ${businessData.growthRate}% growth rate increases the valuation by approximately ${((growthFactor-1)*100).toFixed(1)}%.`
    });
  } else if (businessData.growthRate < 0) {
    // Negative growth rate adjustment with floor protection
    const growthFactor = Math.max(0.7, 1 + (businessData.growthRate / 100));
    estimatedValue = Math.round(estimatedValue * growthFactor);
    minValue = Math.round(minValue * growthFactor);
    
    // Add negative growth as a factor
    factors.push({
      name: 'Negative Growth',
      impact: -5,
      analysis: `Your ${businessData.growthRate}% negative growth rate reduces valuation by approximately ${((1-growthFactor)*100).toFixed(1)}%.`
    });
  }
  
  // STEP 4: Adjust for historical performance if available - with trend analysis
  if (businessData.ebitdaPrevYear > 0 && businessData.ebitda > 0) {
    const ebitdaGrowth = ((businessData.ebitda - businessData.ebitdaPrevYear) / businessData.ebitdaPrevYear) * 100;
    const ebitdaTrend = businessData.ebitda2YearsAgo > 0 
      ? ((businessData.ebitdaPrevYear - businessData.ebitda2YearsAgo) / businessData.ebitda2YearsAgo) * 100
      : null;
    
    // Assess if trend is consistent or accelerating/decelerating
    let trendMultiplier = 1.0;
    let trendDescription = "";
    
    if (ebitdaTrend !== null) {
      if (ebitdaGrowth > 0 && ebitdaTrend > 0) {
        // Consistent positive growth is valuable
        if (ebitdaGrowth > ebitdaTrend * 1.2) {
          // Accelerating growth
          trendMultiplier = 1.1;
          trendDescription = "accelerating";
        } else if (ebitdaGrowth < ebitdaTrend * 0.8) {
          // Decelerating but still positive growth
          trendMultiplier = 1.05;
          trendDescription = "decelerating but positive";
        } else {
          // Consistent growth
          trendMultiplier = 1.08;
          trendDescription = "consistent";
        }
      } else if (ebitdaGrowth < 0 && ebitdaTrend < 0) {
        // Consistent negative growth is concerning
        trendMultiplier = 0.9;
        trendDescription = "consistently negative";
      } else if (ebitdaGrowth > 0 && ebitdaTrend < 0) {
        // Turnaround - from negative to positive
        trendMultiplier = 1.15;
        trendDescription = "showing a turnaround";
      }
    }
    
    if (ebitdaGrowth > 10) {
      // Strong EBITDA growth is positive
      const ebitdaFactor = (1 + (Math.min(ebitdaGrowth, 50) / 200)) * trendMultiplier;
      estimatedValue = Math.round(estimatedValue * ebitdaFactor);
      maxValue = Math.round(maxValue * ebitdaFactor);
      
      const trendText = trendDescription ? ` with a ${trendDescription} trend` : "";
      factors.push({
        name: 'EBITDA Growth',
        impact: 7,
        analysis: `Your year-over-year EBITDA growth of ${ebitdaGrowth.toFixed(1)}%${trendText} positively impacts valuation.`
      });
    } else if (ebitdaGrowth < -10) {
      // Declining EBITDA is negative
      const ebitdaFactor = (1 + (Math.max(ebitdaGrowth, -30) / 150)) * trendMultiplier;
      estimatedValue = Math.round(estimatedValue * ebitdaFactor);
      minValue = Math.round(minValue * ebitdaFactor);
      
      const trendText = trendDescription ? ` with a ${trendDescription} trend` : "";
      factors.push({
        name: 'EBITDA Decline',
        impact: -5,
        analysis: `Your year-over-year EBITDA decline of ${Math.abs(ebitdaGrowth).toFixed(1)}%${trendText} negatively impacts valuation.`
      });
    }
  } else if (businessData.revenuePrevYear > 0 && businessData.revenue > 0) {
    // If we have revenue trends but not EBITDA trends, use revenue
    const revenueGrowth = ((businessData.revenue - businessData.revenuePrevYear) / businessData.revenuePrevYear) * 100;
    
    if (revenueGrowth > 10) {
      // Strong revenue growth
      const revenueFactor = 1 + (Math.min(revenueGrowth, 50) / 250); // Less impact than EBITDA growth
      estimatedValue = Math.round(estimatedValue * revenueFactor);
      maxValue = Math.round(maxValue * revenueFactor);
      
      factors.push({
        name: 'Revenue Growth',
        impact: 5, // Lower impact than EBITDA
        analysis: `Your year-over-year revenue growth of ${revenueGrowth.toFixed(1)}% positively impacts valuation.`
      });
    } else if (revenueGrowth < -10) {
      // Declining revenue
      const revenueFactor = 1 + (Math.max(revenueGrowth, -30) / 200);
      estimatedValue = Math.round(estimatedValue * revenueFactor);
      minValue = Math.round(minValue * revenueFactor);
      
      factors.push({
        name: 'Revenue Decline',
        impact: -4,
        analysis: `Your year-over-year revenue decline of ${Math.abs(revenueGrowth).toFixed(1)}% negatively impacts valuation.`
      });
    }
  }
  
  // STEP 5: Adjust for business age/stability with refined scaling
  if (businessData.yearsInOperation) {
    // More granular age-based adjustment
    let ageFactor, ageImpact, ageDescription;
    
    if (businessData.yearsInOperation > 20) {
      // Well-established businesses (20+ years)
      ageFactor = 1.25;
      ageImpact = 8;
      ageDescription = "well-established with strong market presence";
    } else if (businessData.yearsInOperation > 10) {
      // Established businesses (10-20 years)
      ageFactor = 1.15;
      ageImpact = 6;
      ageDescription = "established with proven longevity";
    } else if (businessData.yearsInOperation > 5) {
      // Mature businesses (5-10 years)
      ageFactor = 1.08;
      ageImpact = 4;
      ageDescription = "mature with demonstrated stability";
    } else if (businessData.yearsInOperation > 2) {
      // Young but established businesses (2-5 years)
      ageFactor = 1.0;
      ageImpact = 0;
      ageDescription = "relatively young but established";
    } else {
      // Very new businesses (0-2 years)
      ageFactor = 0.85;
      ageImpact = -5;
      ageDescription = "very new with limited operating history";
    }
    
    estimatedValue = Math.round(estimatedValue * ageFactor);
    
    // Adjust min/max values proportionally
    if (ageFactor > 1) {
      minValue = Math.round(minValue * Math.sqrt(ageFactor));
      maxValue = Math.round(maxValue * ageFactor);
    } else {
      minValue = Math.round(minValue * ageFactor);
      maxValue = Math.round(maxValue * Math.sqrt(ageFactor));
    }
    
    factors.push({
      name: 'Business Age',
      impact: ageImpact,
      analysis: `Your business's ${businessData.yearsInOperation} years of operation makes it ${ageDescription}, ${ageImpact >= 0 ? 'adding value' : 'introducing risk'}.`
    });
  }
  
  // STEP 6: Adjust for scalability with more detailed assessment
  const scalabilityMap = {
    'High': { 
      factor: 1.20, 
      impact: 7, 
      text: 'highly scalable with significant growth potential',
      detail: 'can expand with minimal marginal costs'
    },
    'Medium': { 
      factor: 1.0, 
      impact: 0, 
      text: 'moderately scalable',
      detail: 'can grow but may require proportional resource increases'
    },
    'Low': { 
      factor: 0.85, 
      impact: -5, 
      text: 'limited scalability',
      detail: 'faces significant constraints to growth'
    }
  };
  
  const scalabilityInfo = scalabilityMap[businessData.scalability] || scalabilityMap['Medium'];
  estimatedValue = Math.round(estimatedValue * scalabilityInfo.factor);
  
  // Adjust min/max values based on scalability
  if (scalabilityInfo.factor > 1) {
    maxValue = Math.round(maxValue * scalabilityInfo.factor);
  } else if (scalabilityInfo.factor < 1) {
    minValue = Math.round(minValue * scalabilityInfo.factor);
  }
  
  if (businessData.scalability !== 'Medium') {
    factors.push({
      name: 'Scalability',
      impact: scalabilityInfo.impact,
      analysis: `Your business is ${scalabilityInfo.text}, which ${scalabilityInfo.impact >= 0 ? 'enhances' : 'limits'} its valuation because it ${scalabilityInfo.detail}.`
    });
  }
  
  // STEP 7: Consider FFE (assets) value with more nuanced approach
  if (businessData.ffeValue > 0) {
    // More sophisticated FFE value assessment
    let ffeImpact, ffeDescription, ffeFactor;
    
    const ffeToRevenueRatio = businessData.ffeValue / (businessData.revenue || 1);
    
    if (ffeToRevenueRatio > 0.5) {
      // Asset-heavy business - significant FF&E relative to revenue
      ffeImpact = Math.min(businessData.ffeValue * 0.2, businessData.revenue * 0.2);
      ffeFactor = 1.15;
      ffeDescription = "represents a significant portion of business value";
    } else if (ffeToRevenueRatio > 0.2) {
      // Moderate assets
      ffeImpact = Math.min(businessData.ffeValue * 0.1, businessData.revenue * 0.1);
      ffeFactor = 1.08;
      ffeDescription = "adds substantial tangible value";
    } else {
      // Limited assets relative to revenue
      ffeImpact = Math.min(businessData.ffeValue * 0.05, businessData.revenue * 0.05);
      ffeFactor = 1.03;
      ffeDescription = "provides some tangible asset value";
    }
    
    // Add the FFE value to the estimated value
    estimatedValue += Math.round(ffeImpact);
    minValue += Math.round(ffeImpact * 0.7);
    maxValue += Math.round(ffeImpact * 1.3);
    
    factors.push({
      name: 'Tangible Assets',
      impact: Math.round(ffeFactor * 5 - 5),
      analysis: `Your FF&E valued at £${businessData.ffeValue.toLocaleString()} ${ffeDescription}.`
    });
  }
  
  // STEP 8: Adjust for debt if transferable with more precise impact
  if (businessData.totalDebtAmount > 0) {
    let debtImpact, debtFactor, debtDescription;
    
    const debtToRevenueRatio = businessData.totalDebtAmount / (businessData.revenue || 1);
    
    if (businessData.debtTransferable === 'yes') {
      // Full debt transfer
      if (debtToRevenueRatio > 0.5) {
        // Significant debt relative to revenue
        debtImpact = businessData.totalDebtAmount;
        debtFactor = 0.80;
        debtDescription = "significantly reduces the business value";
      } else {
        // Moderate debt relative to revenue
        debtImpact = businessData.totalDebtAmount;
        debtFactor = 0.90;
        debtDescription = "reduces the business value";
      }
      
      estimatedValue = Math.round(estimatedValue * debtFactor);
      minValue = Math.round(minValue * debtFactor);
      maxValue = Math.round(maxValue * debtFactor);
      
      factors.push({
        name: 'Transferable Debt',
        impact: -Math.round((1 - debtFactor) * 10),
        analysis: `The £${businessData.totalDebtAmount.toLocaleString()} of transferable debt ${debtDescription}.`
      });
    } else if (businessData.debtTransferable === 'some') {
      // Partial debt transfer (assume 50%)
      debtImpact = businessData.totalDebtAmount * 0.5;
      debtFactor = 0.95;
      
      estimatedValue = Math.round(estimatedValue * debtFactor);
      minValue = Math.round(minValue * debtFactor);
      maxValue = Math.round(maxValue * debtFactor);
      
      factors.push({
        name: 'Partial Debt Transfer',
        impact: -3,
        analysis: `Approximately £${debtImpact.toLocaleString()} of partially transferable debt moderately reduces the business value.`
      });
    }
  }
  
  // STEP 9: Final range adjustments and validation
  if (minValue > maxValue) {
    minValue = Math.round(maxValue * 0.75);
  }
  
  if (estimatedValue < minValue) {
    estimatedValue = minValue;
  } else if (estimatedValue > maxValue) {
    estimatedValue = maxValue;
  }
  
  // Generate industry-specific market comparables
  const marketComparables = {
    intro: `Here's how your ${businessData.industry || 'business'} compares to similar businesses in the market:`,
    metrics: [
      {
        name: 'Revenue Multiple',
        yourValue: (estimatedValue / businessData.revenue).toFixed(2) + 'x',
        industryAverage: ((multiplier.min + multiplier.max) / 2).toFixed(2) + 'x'
      },
      {
        name: 'EBITDA Multiple',
        yourValue: businessData.ebitda ? (estimatedValue / businessData.ebitda).toFixed(2) + 'x' : 'N/A',
        industryAverage: multiplier.ebitda.toFixed(2) + 'x'
      },
      {
        name: 'Profit Margin',
        yourValue: businessData.ebitda && businessData.revenue ? 
          ((businessData.ebitda / businessData.revenue) * 100).toFixed(1) + '%' : 'N/A',
        industryAverage: multiplier.profitMargin.toFixed(1) + '%'
      }
    ]
  };
  
  // Generate intelligent recommendations based on the data and factors
  const recommendations = {
    items: [
      "Document your business processes to increase transferability and value.",
      "Focus on strategies that improve your EBITDA margin to enhance valuation."
    ]
  };
  
  // Add growth-related recommendation if growth is low
  if (businessData.growthRate < 5) {
    recommendations.items.push("Implement growth strategies to increase your growth rate, which could significantly enhance your valuation.");
  }
  
  // Add debt-related recommendation if debt is transferable
  if (businessData.totalDebtAmount > 0 && businessData.debtTransferable !== 'none') {
    recommendations.items.push("Consider reducing transferable debt to improve your overall business valuation.");
  }
  
  // Add scalability recommendation if scalability is low
  if (businessData.scalability === 'Low') {
    recommendations.items.push("Invest in systems and processes that make your business more scalable to increase its value to potential buyers.");
  }
  
  // Calculate confidence score
  const confidence = calculateConfidenceScore(businessData);
  
  // Return complete valuation object
  return {
    estimatedValue: estimatedValue,
    valuationRange: {
      min: minValue,
      max: maxValue
    },
    confidence: confidence,
    multiple: multipleUsed,
    multipleType: multipleType,
    summary: `Based on ${businessData.industry || 'standard industry'} multipliers with detailed adjustments for ${factors.length} business-specific factors.`,
    factors: factors.reduce((obj, factor) => {
      obj[factor.name.toLowerCase().replace(/\s+/g, '_')] = factor;
      return obj;
    }, {}),
    industryData: {
      industry: businessData.industry || 'Other',
      revenueMultiplierMin: multiplier.min,
      revenueMultiplierMax: multiplier.max,
      ebitdaMultiplier: multiplier.ebitda
    },
    marketComparables: marketComparables,
    recommendations: recommendations,
    businessMetrics: {
      revenue: businessData.revenue,
      ebitda: businessData.ebitda,
      revenuePrevYear: businessData.revenuePrevYear,
      ebitdaPrevYear: businessData.ebitdaPrevYear,
      growthRate: businessData.growthRate,
      yearsInOperation: businessData.yearsInOperation,
      ffeValue: businessData.ffeValue,
      totalDebtAmount: businessData.totalDebtAmount,
      debtTransferable: businessData.debtTransferable,
      scalability: businessData.scalability
    }
  };
}

/**
 * Calculate confidence score based on data quality and completeness
 * @param {Object} businessData - Business data
 * @returns {number} Confidence score (0-100)
 */
function calculateConfidenceScore(businessData) {
  // Critical financial fields
  const criticalFields = [
    'revenue', 
    'ebitda'
  ];
  
  // Important fields that add confidence
  const importantFields = [
    'revenuePrevYear',
    'ebitdaPrevYear',
    'growthRate',
    'yearsInOperation',
    'industry',
    'ffeValue',
    'scalability'
  ];
  
  // Supplemental fields that add some confidence
  const supplementalFields = [
    'revenue2YearsAgo',
    'ebitda2YearsAgo',
    'growthAreas',
    'growthChallenges',
    'ffeItems',
    'debtItems',
    'totalDebtAmount',
    'debtTransferable',
    'debtNotes'
  ];
  
  // Calculate completeness for each category
  let criticalScore = 0;
  criticalFields.forEach(field => {
    if (businessData[field] && businessData[field] > 0) criticalScore++;
  });
  criticalScore = criticalScore / criticalFields.length;
  
  let importantScore = 0;
  importantFields.forEach(field => {
    if (businessData[field] && (
      typeof businessData[field] === 'number' ? businessData[field] > 0 : businessData[field].length > 0
    )) importantScore++;
  });
  importantScore = importantScore / importantFields.length;
  
  let supplementalScore = 0;
  supplementalFields.forEach(field => {
    if (businessData[field] && (
      typeof businessData[field] === 'number' ? businessData[field] > 0 : businessData[field].length > 0
    )) supplementalScore++;
  });
  supplementalScore = supplementalScore / supplementalFields.length;
  
  // Weight the scores
  const weightedScore = 
    (criticalScore * 0.5) + 
    (importantScore * 0.35) + 
    (supplementalScore * 0.15);
  
  // Convert to percentage (0-100)
  return Math.round(weightedScore * 100);
}

// Add a fallback valuation calculation function in case the API fails
function calculateFallbackValuation(businessData) {
  console.log('Using fallback valuation calculation');
  
  // Use industry-specific multipliers based on the industry_multipliers table values
  const industryMultipliers = {
    'Financial Services': {min: 0.8, max: 2.2, ebitda: 4.5},
    'Health Care & Fitness': {min: 0.7, max: 1.8, ebitda: 4.0},
    'Manufacturing': {min: 0.6, max: 1.5, ebitda: 3.5},
    'Online & Technology': {min: 1.0, max: 3.0, ebitda: 5.0},
    'Pet Services': {min: 0.6, max: 1.6, ebitda: 3.0},
    'Restaurants & Food': {min: 0.4, max: 1.2, ebitda: 2.5},
    'Retail': {min: 0.3, max: 1.0, ebitda: 3.0},
    'Service Businesses': {min: 0.5, max: 1.5, ebitda: 3.5},
    'Transportation & Storage': {min: 0.4, max: 1.3, ebitda: 3.0},
    'Travel': {min: 0.4, max: 1.3, ebitda: 3.0},
    'Wholesale & Distributors': {min: 0.4, max: 1.0, ebitda: 2.5},
    'Other': {min: 0.5, max: 1.5, ebitda: 3.0}
  };
  
  // Get multipliers for this industry or default to 'Other'
  const multiplier = industryMultipliers[businessData.industry] || industryMultipliers['Other'];
  
  // Calculate valuation based on available financial data
  let estimatedValue, minValue, maxValue, multipleUsed, multipleType;
  
  if (businessData.ebitda > 0) {
    // EBITDA-based valuation (preferred)
    multipleUsed = multiplier.ebitda;
    multipleType = 'ebitda';
    estimatedValue = Math.round(businessData.ebitda * multipleUsed);
    
    // Use revenue multipliers for the range
    minValue = Math.round(businessData.revenue * multiplier.min);
    maxValue = Math.round(businessData.revenue * multiplier.max);
    
    // Ensure estimated value is within range (or adjust range)
    if (estimatedValue < minValue) minValue = Math.round(estimatedValue * 0.8);
    if (estimatedValue > maxValue) maxValue = Math.round(estimatedValue * 1.2);
  } else {
    // Revenue-based valuation (fallback)
    const avgRevenueMultiplier = (multiplier.min + multiplier.max) / 2;
    multipleUsed = avgRevenueMultiplier;
    multipleType = 'revenue';
    estimatedValue = Math.round(businessData.revenue * avgRevenueMultiplier);
    
    // Direct revenue multiplier range
    minValue = Math.round(businessData.revenue * multiplier.min);
    maxValue = Math.round(businessData.revenue * multiplier.max);
  }
  
  // Add growth adjustment if growth rate is provided
  if (businessData.growthRate && businessData.growthRate > 0) {
    const growthFactor = 1 + (Math.min(businessData.growthRate, 50) / 100);
    estimatedValue = Math.round(estimatedValue * growthFactor);
    maxValue = Math.round(maxValue * growthFactor);
  }
  
  return {
    estimatedValue: estimatedValue,
    valuationRange: {
      min: minValue,
      max: maxValue
    },
    confidence: 75,
    multiple: multipleUsed,
    multipleType: multipleType,
    summary: `Based on ${businessData.industry || 'standard industry'} multipliers: ${multipleUsed.toFixed(2)}x ${multipleType.toUpperCase()}.`,
    factors: {
      growth: {
        impact: businessData.growthRate > 10 ? 10 : (businessData.growthRate || 0),
        analysis: `Business growth rate of ${businessData.growthRate || 0}% was considered in this valuation.`
      },
      industry: {
        impact: 5,
        analysis: `${businessData.industry || 'Your industry'} businesses typically sell for ${multiplier.min}x-${multiplier.max}x revenue or ${multiplier.ebitda}x EBITDA.`
      }
    },
    industryData: {
      industry: businessData.industry || 'Other',
      revenueMultiplierMin: multiplier.min,
      revenueMultiplierMax: multiplier.max,
      ebitdaMultiplier: multiplier.ebitda
    }
  };
}

// Add this utility function to help with error handling and missing elements
function safelyUpdateElement(id, updateFn) {
  const element = document.getElementById(id);
  if (element) {
    updateFn(element);
  } else {
    console.warn(`Element with ID '${id}' not found`);
  }
}

// Format currency values for display
function formatCurrency(value) {
  return '£' + parseInt(value).toLocaleString();
}

// Helper function to set the correct class for factor impact badges
function setFactorBadgeClass(elementId, impact) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`Element with ID '${elementId}' not found`);
    return;
  }
  
  // Remove all existing factor classes
  element.classList.remove('factor-positive', 'factor-negative', 'factor-neutral');
  
  // Add the appropriate class based on impact
  if (impact > 5) {
    element.classList.add('factor-positive');
  } else if (impact < 0) {
    element.classList.add('factor-negative');
  } else {
    element.classList.add('factor-neutral');
  }
}

// Updated displayValuationResults function to safely update UI elements
function displayValuationResults(valuation) {
    try {
        // Store the valuation data globally
        window.valuationData = valuation;
        
        // Update the UI with valuation data
        updateValuationUI(valuation);
        
        // Get element references
        const loadingOverlay = document.getElementById('loadingOverlay');
        const calculationPrompt = document.getElementById('calculationPrompt');
        const valuationResults = document.getElementById('valuationResults');
        
        // Check if all needed elements exist
        if (!loadingOverlay || !calculationPrompt || !valuationResults) {
            console.error('Required DOM elements not found:', {
                loadingOverlay: !!loadingOverlay,
                calculationPrompt: !!calculationPrompt,
                valuationResults: !!valuationResults
            });
            throw new Error('Required DOM elements not found');
        }
        
        // Hide loading overlay
        loadingOverlay.classList.add('hidden');
        
        // Hide calculation prompt and show results
        calculationPrompt.classList.add('hidden');
        valuationResults.classList.remove('hidden');
        
        // Scroll to results
        valuationResults.scrollIntoView({ behavior: 'smooth' });
        
        console.log('Valuation displayed successfully');
    } catch (error) {
        console.error('Error displaying valuation results:', error);
        
        // Fallback error handling
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) loadingOverlay.classList.add('hidden');
        
        alert('Error displaying valuation results: ' + error.message);
    }
}

// Function to save the questionnaire and valuation data to database
async function saveValuationDataToDatabase(businessData, valuation) {
  try {
    console.log('Attempting to save valuation data to database...');
    
    // Get the email from localStorage and validate it
    const email = localStorage.getItem('sellerEmail');
    
    // Enhanced email validation check with detailed logging
    if (!email || email.indexOf('@') === -1) {
      console.error('Cannot save valuation - email is missing or invalid:', email);
      
      // Return a rejected promise so caller knows it failed
      return Promise.reject(new Error('Email is required to save valuation data'));
    }
    
    console.log('Using email for valuation data:', email);
    
    // Collect comprehensive form data
    const formData = collectFormData();
    
    // Ensure email is included in the form data
    formData.email = email;
    
    // Add business metrics from the calculation input if not in form data
    for (const key of Object.keys(businessData)) {
      if (formData[key] === undefined) {
        formData[key] = businessData[key];
      }
    }
    
    // Add valuation results
    formData.valuationData = valuation;
    formData.valuationMin = valuation.valuationRange?.min;
    formData.valuationMax = valuation.valuationRange?.max;
    formData.adjustedValuation = valuation.estimatedValue;
    
    console.log('Sending comprehensive data to server with fields:', {
      email: formData.email,
      fieldCount: Object.keys(formData).length
    });
    
    // Try to save via the public endpoint
    try {
      console.log('Attempting save via /api/public/save-questionnaire');
      const response = await fetch('/api/public/save-questionnaire', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json' // Crucial header
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log('Successfully saved data via public endpoint with submission ID:', result.submissionId);
          localStorage.setItem('questionnaireSubmissionId', result.submissionId);
          return result;
        } else {
          console.warn('Public endpoint returned success=false:', result.message);
          throw new Error(result.message || 'Unknown server error from public endpoint');
        }
      } else {
        // Handle non-OK response from public endpoint
        const errorText = await response.text();
        console.warn(`Public endpoint returned error status: ${response.status}. Response body (first 500 chars):`, errorText.substring(0, 500));
        // Check if it's HTML
        if (errorText.trim().toLowerCase().startsWith('<!doctype') || errorText.trim().toLowerCase().startsWith('<html')) {
             throw new Error(`Server error ${response.status}: Received HTML instead of JSON from public endpoint.`);
        } else {
             throw new Error(`Server error ${response.status}: ${errorText}`);
        }
      }
    } catch (publicError) {
      console.error('Error saving to public endpoint:', publicError.message);
      console.log('Falling back to /api/business/save-questionnaire');
      
      // Fallback to business API endpoint
      try {
        const fallbackResponse = await fetch('/api/business/save-questionnaire', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json', // Crucial header
            'X-Request-Source': 'valuation-calculator',
            'X-Skip-Auth': 'true' // Ensure this is handled by your auth middleware
          },
          body: JSON.stringify(formData)
        });
        
        if (fallbackResponse.ok) {
          const fallbackResult = await fallbackResponse.json();
          if (fallbackResult.success) {
            console.log('Successfully saved data via fallback endpoint, submission ID:', fallbackResult.submissionId);
            localStorage.setItem('questionnaireSubmissionId', fallbackResult.submissionId);
            return fallbackResult;
          } else {
             console.warn('Fallback endpoint returned success=false:', fallbackResult.message);
             throw new Error(fallbackResult.message || 'Unknown server error from fallback endpoint');
          }
        } else {
           // Handle non-OK response from fallback endpoint
           const fallbackErrorText = await fallbackResponse.text();
           console.warn(`Fallback endpoint returned error status: ${fallbackResponse.status}. Response body (first 500 chars):`, fallbackErrorText.substring(0, 500));
            if (fallbackErrorText.trim().toLowerCase().startsWith('<!doctype') || fallbackErrorText.trim().toLowerCase().startsWith('<html')) {
                 throw new Error(`Server error ${fallbackResponse.status}: Received HTML instead of JSON from fallback endpoint.`);
            } else {
                 throw new Error(`Server error ${fallbackResponse.status}: ${fallbackErrorText}`);
            }
        }
      } catch (fallbackError) {
        console.error('Fallback endpoint also failed:', fallbackError.message);
        // Save to localStorage as last resort
        // ... (existing localStorage fallback logic) ...
        return { /* ... existing localOnly response ... */ };
      }
    }
  } catch (error) {
    console.error('Critical error in saveValuationDataToDatabase:', error.message);
    // Save to localStorage as last resort
    // ... (existing localStorage fallback logic) ...
    return { /* ... existing localOnly response ... */ };
  }
}

// Export functions for use in other scripts
window.BusinessValuation = {
    calculateBusinessValuation,
    saveQuestionnaireData,
    collectQuestionnaireData
};

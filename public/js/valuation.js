/**
 * Business Valuation Calculator
 * Handles the valuation calculation process on the client side
 */

/**
 * Format a number as currency with the proper symbol and formatting
 * @param {number} value - The value to format
 * @param {string} [currencySymbol='£'] - The currency symbol to use
 * @returns {string} - The formatted currency string
 */
function formatCurrency(value, currencySymbol = '£') {
  // Handle invalid inputs
  if (value === null || value === undefined || isNaN(value)) {
    return currencySymbol + '0';
  }
  
  // Convert to number to ensure consistent formatting
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  // Use the browser's Intl.NumberFormat for locale-aware formatting
  return currencySymbol + new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(numValue);
}

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

/**
 * Slider Functionality
 * Implements the interactive valuation slider
 */
document.addEventListener('DOMContentLoaded', function() {
    // Get all the slider-related elements
    const sliderThumb = document.getElementById('sliderThumb');
    const sliderBar = document.querySelector('.slider-bar');
    const valueTooltip = document.getElementById('valueTooltip');
    const adjustedValueDisplay = document.getElementById('adjustedValue');
    const likelihoodLabel = document.getElementById('likelihoodLabel');
    const likelihoodText = document.getElementById('likelihoodText');
    
    // Make sure the slider elements exist
    if (!sliderThumb || !sliderBar) {
        console.error('Slider elements not found in DOM');
        return;
    }
    
    // Variables to store slider values
    let minValue = 0;
    let maxValue = 100000;
    let currentValue = 50000;
    let isDragging = false;
    let sliderRect = sliderBar.getBoundingClientRect();
    
    // Initialize the slider with any existing valuation data
    function initSlider() {
        console.log('Initializing valuation slider');
        if (window.valuationData && window.valuationData.valuationRange) {
            minValue = window.valuationData.valuationRange.min;
            maxValue = window.valuationData.valuationRange.max;
            currentValue = window.valuationData.estimatedValue;
        }
        updateSliderPosition();
    }
    
    // Update the slider position and related displays
    function updateSliderPosition() {
        // Calculate percentage position
        const range = maxValue - minValue;
        const percentage = ((currentValue - minValue) / range) * 100;
        
        // Update thumb position
        sliderThumb.style.left = `${percentage}%`;
        
        // Update tooltip
        if (valueTooltip) {
            valueTooltip.textContent = formatCurrency(currentValue);
            valueTooltip.style.left = `${percentage}%`;
            valueTooltip.style.opacity = '1';
        }
        
        // Update the main value display
        if (adjustedValueDisplay) {
            adjustedValueDisplay.textContent = formatCurrency(currentValue);
        }
        
        // Update the likelihood indicators based on position
        updateLikelihoodIndicators(percentage);
    }
    
    // Update the likelihood indicators based on slider position
    function updateLikelihoodIndicators(percentage) {
        if (!likelihoodLabel || !likelihoodText) return;
        
        let labelClass, labelText, descriptionText;
        
        // Define ranges and corresponding statuses
        if (percentage < 30) {
            // Low end of range
            labelClass = 'likelihood-high';
            labelText = 'High Buyer Interest';
            descriptionText = 'This price is below market average, which will likely attract more buyers but at a lower return for you.';
        } else if (percentage > 70) {
            // High end of range
            labelClass = 'likelihood-low';
            labelText = 'Low Buyer Interest';
            descriptionText = 'This price is above market average, which may significantly reduce buyer incentives. Consider if the premium is justified.';
        } else {
            // Middle of range - optimal
            labelClass = 'likelihood-moderate';
            labelText = 'Balanced Market Position';
            descriptionText = 'Your price is aligned with market expectations, offering a balance between buyer interest and seller return.';
        }
        
        // Apply the classes and text content
        likelihoodLabel.className = `likelihood-label ${labelClass}`;
        likelihoodLabel.textContent = labelText;
        likelihoodText.textContent = descriptionText;
    }
    
    // Function to handle slider movement
    function moveSlider(clientX) {
        // Ensure we have the latest dimensions
        sliderRect = sliderBar.getBoundingClientRect();
        
        // Calculate position within the slider
        let position = (clientX - sliderRect.left) / sliderRect.width;
        position = Math.max(0, Math.min(position, 1)); // Clamp between 0 and 1
        
        // Calculate the new value
        currentValue = Math.round(minValue + position * (maxValue - minValue));
        
        // Update the UI
        updateSliderPosition();
    }
    
    // Event listener for mouse down on slider thumb
    sliderThumb.addEventListener('mousedown', function(e) {
        e.preventDefault(); // Prevent text selection
        isDragging = true;
        
        // Add the active class for visual feedback
        sliderThumb.classList.add('active');
        
        // Show tooltip
        if (valueTooltip) {
            valueTooltip.style.opacity = '1';
        }
        
        // Get initial position
        moveSlider(e.clientX);
    });
    
    // Event listeners for document to handle mouse movement and release
    document.addEventListener('mousemove', function(e) {
        if (isDragging) {
            moveSlider(e.clientX);
        }
    });
    
    document.addEventListener('mouseup', function() {
        if (isDragging) {
            isDragging = false;
            sliderThumb.classList.remove('active');
            
            // Keep tooltip visible for a moment then fade
            if (valueTooltip) {
                setTimeout(() => {
                    valueTooltip.style.opacity = '0.7';
                }, 1500);
            }
        }
    });
    
    // Touch event listeners for mobile devices
    sliderThumb.addEventListener('touchstart', function(e) {
        e.preventDefault();
        isDragging = true;
        sliderThumb.classList.add('active');
        
        // Show tooltip
        if (valueTooltip) {
            valueTooltip.style.opacity = '1';
        }
        
        // Get initial position
        moveSlider(e.touches[0].clientX);
    });
    
    document.addEventListener('touchmove', function(e) {
        if (isDragging) {
            moveSlider(e.touches[0].clientX);
        }
    });
    
    document.addEventListener('touchend', function() {
        if (isDragging) {
            isDragging = false;
            sliderThumb.classList.remove('active');
            
            // Keep tooltip visible for a moment then fade
            if (valueTooltip) {
                setTimeout(() => {
                    valueTooltip.style.opacity = '0.7';
                }, 1500);
            }
        }
    });
    
    // Allow clicking directly on the slider bar to move the thumb
    sliderBar.addEventListener('click', function(e) {
        moveSlider(e.clientX);
    });
    
    // Update slider when window is resized
    window.addEventListener('resize', function() {
        sliderRect = sliderBar.getBoundingClientRect();
        updateSliderPosition();
    });
    
    // Listen for valuation calculation events to update slider range
    document.addEventListener('valuationCalculated', function(e) {
        if (e.detail) {
            if (e.detail.minValuation) minValue = e.detail.minValuation;
            if (e.detail.maxValuation) maxValue = e.detail.maxValuation;
            if (e.detail.estimatedValue) currentValue = e.detail.estimatedValue;
            updateSliderPosition();
        }
    });
    
    // Initialize the slider
    initSlider();
    
    // If valuation data already exists when loading page, initialize with it
    if (window.valuationData) {
        console.log('Found existing valuation data, initializing slider');
        document.dispatchEvent(new CustomEvent('valuationCalculated', { 
            detail: {
                minValuation: window.valuationData.valuationRange?.min,
                maxValuation: window.valuationData.valuationRange?.max,
                estimatedValue: window.valuationData.estimatedValue
            }
        }));
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
 * Function to save the valuation data to the database
 */
async function saveValuationToDatabase(valuation) {
  try {
    console.log('Saving valuation to database...');
    
    // Get current business data from localStorage
    const businessData = collectFormData();
    
    // Add the anonymousId if we have it
    const anonymousId = localStorage.getItem('anonymousId') || 
                        'anon_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
    
    // Store it for future use
    if (!localStorage.getItem('anonymousId')) {
      localStorage.setItem('anonymousId', anonymousId);
    }
    
    // Create the payload for the API
    const payload = {
      ...businessData,
      valuationData: valuation,
      valuationMin: valuation.valuationRange?.min,
      valuationMax: valuation.valuationRange?.max,
      estimatedValue: valuation.estimatedValue, 
      adjustedValuation: valuation.estimatedValue,
      anonymousId: anonymousId
    };
    
    console.log('Sending valuation data to API with payload keys:', Object.keys(payload));
    
    // Use the new public endpoint that doesn't redirect to login
    const response = await fetch('/api/public/valuation/save-questionnaire', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    // Check if the response is OK and handle it appropriately
    if (!response.ok) {
      // Check content type before trying to parse as JSON (handle HTML error pages)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(`API returned error: ${errorData.message || 'Unknown error'}`);
      } else {
        const errorText = await response.text();
        if (errorText.includes('<!DOCTYPE html>')) {
          throw new Error('Received HTML error page instead of JSON. Authentication may be required.');
        } else {
          throw new Error(`API returned status ${response.status}: ${errorText.substring(0, 100)}`);
        }
      }
    }
    
    // Parse JSON response
    const result = await response.json();
    
    console.log('Valuation saved successfully:', result);
    return result;
  } catch (error) {
    console.error('Error saving valuation to database:', error);
    
    // Try a fallback to local storage if all else fails
    try {
      const storageKey = 'savedValuation_' + Date.now();
      const storageData = {
        timestamp: new Date().toISOString(),
        valuation: valuation,
        businessData: collectFormData()
      };
      
      localStorage.setItem(storageKey, JSON.stringify(storageData));
      console.log('Valuation saved to localStorage as fallback:', storageKey);
      
      return {
        success: true,
        localOnly: true,
        message: 'Saved to browser storage only. Login to save permanently.'
      };
    } catch (localError) {
      console.error('Failed to save to localStorage:', localError);
      throw error; // Re-throw the original error
    }
  }
}

// Function to display an error when saving valuation
function displaySaveError(error) {
  const errorMessage = error?.message || 'An error occurred while saving the valuation.';
  console.error('Save error:', errorMessage);
  
  // Display error in UI if possible
  const errorElement = document.getElementById('save-error-message');
  if (errorElement) {
    errorElement.textContent = errorMessage;
    errorElement.classList.remove('hidden');
  } else {
    // Fallback to alert if no error element exists
    alert('Error saving valuation: ' + errorMessage);
  }
}

// Updated displayValuationResults function to automatically save
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
        
        // Automatically save the valuation to database
        saveValuationToDatabase(valuation)
            .then(result => {
                console.log('Valuation saved successfully', result);
                // Update UI to show saved status if needed
                const savedIndicator = document.getElementById('valuation-saved-indicator');
                if (savedIndicator) {
                    savedIndicator.textContent = result.localOnly ? 
                        'Valuation saved locally' : 
                        'Valuation saved to database';
                    savedIndicator.classList.remove('hidden');
                }
            })
            .catch(error => {
                displaySaveError(error);
            });
        
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

/**
 * Updates the UI with valuation results
 * @param {Object} valuation - The valuation data object
 */
function updateValuationUI(valuation) {
  console.log('Updating valuation UI with data:', valuation);
  
  // Helper function to safely update DOM elements that might not exist
  const safelyUpdateElement = (id, updateFn) => {
    const element = document.getElementById(id);
    if (element) {
      updateFn(element);
    } else {
      console.warn(`Element with ID '${id}' not found`);
    }
  };
  
  // Update estimated/adjusted value display (using ID in HTML: adjustedValue)
  safelyUpdateElement('adjustedValue', (el) => {
    el.textContent = formatCurrency(valuation.estimatedValue);
  });
  
  // Update valuation range (using ID in HTML: valuationRange)
  safelyUpdateElement('valuationRange', (el) => {
    if (valuation.valuationRange) {
      el.textContent = `Range: ${formatCurrency(valuation.valuationRange.min)} - ${formatCurrency(valuation.valuationRange.max)}`;
    }
  });
  
  // Update confidence score (using ID in HTML: actualConfidenceScore)
  safelyUpdateElement('actualConfidenceScore', (el) => {
    el.textContent = valuation.confidence + '%';
  });
  
  // Update valuation summary (using ID in HTML: valuationSummary)
  safelyUpdateElement('valuationSummary', (el) => {
    el.textContent = valuation.summary || 'Valuation completed successfully.';
  });
  
  // Update multiple used (using ID in HTML: multipleUsed)
  safelyUpdateElement('multipleUsed', (el) => {
    if (valuation.multiple) {
      el.textContent = valuation.multiple.toFixed(2) + 'x ' + 
        (valuation.multipleType === 'revenue' ? 'Revenue' : 'EBITDA');
    }
  });
  
  // Update slider position if available
  const sliderThumb = document.getElementById('sliderThumb');
  const sliderBar = document.querySelector('.slider-bar');
  const tooltip = document.getElementById('valueTooltip');
  
  if (sliderThumb && sliderBar && valuation.valuationRange) {
    const min = valuation.valuationRange.min;
    const max = valuation.valuationRange.max;
    const value = valuation.estimatedValue;
    const percentage = ((value - min) / (max - min)) * 100;
    
    // Position the slider thumb
    sliderThumb.style.left = `${percentage}%`;
    
    // Show value in tooltip
    if (tooltip) {
      tooltip.textContent = formatCurrency(value);
      tooltip.style.opacity = 1;
    }
  }
  
  // Update growth factor
  safelyUpdateElement('growthFactorBadge', (el) => {
    const growth = valuation.factors?.growth || valuation.factors?.growth_rate;
    if (growth) {
      const impact = growth.impact || 0;
      el.textContent = `${impact > 0 ? '+' : ''}${impact}%`;
      el.className = `factor-badge ${impact > 0 ? 'factor-positive' : impact < 0 ? 'factor-negative' : 'factor-neutral'}`;
    }
  });
  
  safelyUpdateElement('growthFactorAnalysis', (el) => {
    const growth = valuation.factors?.growth || valuation.factors?.growth_rate;
    if (growth) {
      el.textContent = growth.analysis || 'Growth rate considered in valuation.';
    }
  });
  
  // Update industry factor
  safelyUpdateElement('industryFactorBadge', (el) => {
    const industry = valuation.factors?.industry || valuation.factors?.industry_context;
    if (industry) {
      const impact = industry.impact || 0;
      el.textContent = `${impact > 0 ? '+' : ''}${impact}%`;
      el.className = `factor-badge ${impact > 0 ? 'factor-positive' : impact < 0 ? 'factor-negative' : 'factor-neutral'}`;
    }
  });
  
  safelyUpdateElement('industryFactorAnalysis', (el) => {
    const industry = valuation.factors?.industry || valuation.factors?.industry_context;
    if (industry) {
      el.textContent = industry.analysis || 'Industry standards considered in valuation.';
    }
  });
  
  // Update market comparables
  safelyUpdateElement('marketComparablesIntro', (el) => {
    if (valuation.marketComparables) {
      el.textContent = valuation.marketComparables.intro || 'Market comparison with similar businesses:';
    }
  });
  
  // Update market comparables table
  const comparablesTable = document.getElementById('comparableMetricsTable');
  if (comparablesTable && valuation.marketComparables && valuation.marketComparables.metrics) {
    const tbody = comparablesTable.querySelector('tbody');
    if (tbody) {
      tbody.innerHTML = ''; // Clear existing rows
      
      valuation.marketComparables.metrics.forEach(metric => {
        const row = document.createElement('tr');
        row.className = 'border-t border-gray-200';
        row.innerHTML = `
          <td class="py-2 px-3 text-[#5f5770]">${metric.name}</td>
          <td class="py-2 px-3 text-right text-[#25224a] font-medium">${metric.yourValue || 'N/A'}</td>
          <td class="py-2 px-3 text-right text-[#5f5770]">${metric.industryAverage || 'N/A'}</td>
        `;
        tbody.appendChild(row);
      });
    }
  }
  
  // Update recommendations list
  safelyUpdateElement('recommendationsList', (el) => {
    if (valuation.recommendations && valuation.recommendations.items) {
      el.innerHTML = ''; // Clear existing items
      
      valuation.recommendations.items.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        el.appendChild(li);
      });
    } else {
      el.innerHTML = '<li>No specific recommendations available at this time.</li>';
    }
  });
  
  // Update likelihood indicator based on valuation
  safelyUpdateElement('likelihoodLabel', (el) => {
    const confidence = valuation.confidence || 0;
    let likelihoodClass = 'likelihood-moderate';
    let likelihoodText = 'Moderately Likely to Sell';
    
    if (confidence >= 75) {
      likelihoodClass = 'likelihood-high';
      likelihoodText = 'Highly Likely to Sell';
    } else if (confidence < 50) {
      likelihoodClass = 'likelihood-low';
      likelihoodText = 'Less Likely to Sell';
    }
    
    el.className = `likelihood-label ${likelihoodClass}`;
    el.textContent = likelihoodText;
  });
  
  safelyUpdateElement('likelihoodText', (el) => {
    const confidence = valuation.confidence || 0;
    let text = 'Your business valuation is within market expectations.';
    
    if (confidence >= 75) {
      text = 'Your business valuation is strong and well-positioned in the market.';
    } else if (confidence < 50) {
      text = 'Improving key metrics could increase your likelihood of selling successfully.';
    }
    
    el.textContent = text;
  });
  
  // Trigger an event to notify other components that valuation is done
  document.dispatchEvent(new CustomEvent('valuationCalculated', { 
    detail: {
      minValuation: valuation.valuationRange?.min,
      maxValuation: valuation.valuationRange?.max,
      estimatedValue: valuation.estimatedValue
    }
  }));
}

// Export functions for use in other scripts
window.BusinessValuation = {
    calculateBusinessValuation,
    saveQuestionnaireData,
    collectQuestionnaireData
};

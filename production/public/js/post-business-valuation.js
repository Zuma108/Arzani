/**
 * Post Business Valuation JavaScript
 * Handles calculating business valuations based on industry metrics
 */

// Add a validation function to ensure numeric inputs
function validateNumericInputs() {
    const numericFields = [
        'gross_revenue', 'ebitda', 'cash_flow', 'price', 
        'ffe', 'inventory', 'years_in_operation', 'employees',
        'growth_rate'
    ];
    
    let valid = true;
    let missingFields = [];
    
    // Ensure at least one financial metric is provided
    const hasRevenue = !!document.querySelector('[name="gross_revenue"]')?.value;
    const hasEbitda = !!document.querySelector('[name="ebitda"]')?.value;
    const hasCashFlow = !!document.querySelector('[name="cash_flow"]')?.value;
    
    if (!hasRevenue && !hasEbitda && !hasCashFlow) {
        valid = false;
        missingFields.push('Financial data (Revenue, EBITDA, or Cash Flow)');
    }
    
    // Check required non-financial fields
    const requiredFields = ['industry'];
    requiredFields.forEach(field => {
        const input = document.querySelector(`[name="${field}"]`);
        if (!input || !input.value.trim()) {
            valid = false;
            missingFields.push(field.charAt(0).toUpperCase() + field.slice(1).replace('_', ' '));
        }
    });
    
    if (!valid) {
        alert(`Please provide the following information to calculate a valuation:\n• ${missingFields.join('\n• ')}`);
    }
    
    return valid;
}

// Function to calculate valuation using the API
async function calculateValuation() {
    if (!validateNumericInputs()) {
        return;
    }
    
    try {
        // Show loading state
        const valuationBtn = document.getElementById('calculateValuation');
        if (valuationBtn) {
            valuationBtn.disabled = true;
            valuationBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Calculating...';
        }
        
        // Get the form data
        const form = document.getElementById('postBusinessForm');
        const formData = new FormData(form);
        const businessData = {};
        
        // Process form fields and convert numeric values
        for (const [key, value] of formData.entries()) {
            // Skip image fields
            if (key === 'images' || key.includes('stockImageUrls')) continue;
            
            // Convert numeric fields to numbers
            if (['price', 'cash_flow', 'gross_revenue', 'ebitda', 'inventory', 
                 'ffe', 'employees', 'years_in_operation', 'growth_rate'].includes(key) && value) {
                businessData[key] = parseFloat(value) || 0;
            } else {
                businessData[key] = value;
            }
        }
        
        console.log('Sending business data for valuation:', businessData);
        
        // Call the valuation API
        const response = await fetch('/api/post-business/calculate-valuation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await getAuthToken()}`
            },
            body: JSON.stringify(businessData)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            throw new Error(errorData.message || `Valuation request failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Update the UI with the valuation results
            updateValuationUI(data.valuation, data.priceComparison);
            
            // Show the valuation results section
            const resultsElement = document.getElementById('valuation-results');
            const loadingElement = document.getElementById('valuation-loading');
            
            if (resultsElement) {
                resultsElement.classList.remove('d-none');
            }
            
            if (loadingElement) {
                loadingElement.classList.add('d-none');
            }
        } else {
            throw new Error(data.message || 'Failed to calculate valuation');
        }
    } catch (error) {
        console.error('Error calculating valuation:', error);
        
        // Show error message
        const loadingElement = document.getElementById('valuation-loading');
        if (loadingElement) {
            loadingElement.innerHTML = `
                <div class="alert alert-danger">
                    <p><strong>Error:</strong> ${error.message || 'Failed to calculate valuation'}</p>
                    <p>Please check your inputs and try again.</p>
                </div>
            `;
            loadingElement.classList.remove('d-none');
        }
        
        // Hide results if they were previously shown
        const resultsElement = document.getElementById('valuation-results');
        if (resultsElement) {
            resultsElement.classList.add('d-none');
        }
    } finally {
        // Reset button state
        const valuationBtn = document.getElementById('calculateValuation');
        if (valuationBtn) {
            valuationBtn.disabled = false;
            valuationBtn.innerHTML = 'Calculate Valuation';
        }
    }
}

// Function to get authentication token
async function getAuthToken() {
    return localStorage.getItem('token') || '';
}

// Enhanced function to update the UI with valuation results
function updateValuationUI(valuation, priceComparison) {
    // Make sure valuation data exists
    if (!valuation || !valuation.valuationRange) {
        console.error('Invalid valuation data:', valuation);
        
        // Show error message
        const loadingElement = document.getElementById('valuation-loading');
        if (loadingElement) {
            loadingElement.innerHTML = `
                <div class="alert alert-warning">
                    <p>We couldn't generate a complete valuation with the provided information.</p>
                    <p>Please make sure you've entered key financial data like revenue or EBITDA.</p>
                </div>
            `;
            loadingElement.classList.remove('d-none');
        }
        
        // Hide results
        const resultsElement = document.getElementById('valuation-results');
        if (resultsElement) {
            resultsElement.classList.add('d-none');
        }
        
        return;
    }
    
    // Update valuation range
    const rangeEl = document.getElementById('valuation-range');
    if (rangeEl) {
        rangeEl.textContent = `£${valuation.valuationRange.min.toLocaleString()} - £${valuation.valuationRange.max.toLocaleString()}`;
    }
    
    // Update estimated value
    const estimatedEl = document.getElementById('estimated-value');
    if (estimatedEl) {
        estimatedEl.textContent = `£${valuation.estimatedValue.toLocaleString()}`;
    }
    
    // Update confidence meter
    const confidenceBar = document.getElementById('confidence-bar');
    const confidenceValue = document.getElementById('confidence-value');
    
    if (confidenceBar && confidenceValue) {
        const confidenceScore = valuation.confidence || 0;
        confidenceBar.style.width = `${confidenceScore}%`;
        confidenceValue.textContent = `${confidenceScore}%`;
        
        // Update confidence bar color based on level
        if (confidenceScore < 40) {
            confidenceBar.className = 'progress-bar bg-danger';
        } else if (confidenceScore < 70) {
            confidenceBar.className = 'progress-bar bg-warning';
        } else {
            confidenceBar.className = 'progress-bar bg-success';
        }
    }
    
    // Enhanced price analysis section with more detailed insights
    const priceAnalysisEl = document.getElementById('price-analysis');
    if (priceAnalysisEl && priceComparison) {
        // Set status class with more granular options
        const statusClass = priceComparison.status.replace('significantly_', '');
        priceAnalysisEl.className = 'price-status ' + statusClass;
        
        // Use the enhanced insight text from the API
        if (priceComparison.insightText) {
            priceAnalysisEl.textContent = priceComparison.insightText;
        } else {
            // Fallback to basic text if insightText not available
            let priceText = '';
            if (priceComparison.status.includes('above')) {
                priceText = `Your asking price is ${priceComparison.difference > 0 ? 
                    `£${priceComparison.difference.toLocaleString()} (${priceComparison.percentDifference}%) above` : 'above'} typical market value`;
            } else if (priceComparison.status.includes('below')) {
                priceText = `Your asking price is ${priceComparison.difference > 0 ? 
                    `£${priceComparison.difference.toLocaleString()} (${priceComparison.percentDifference}%) below` : 'below'} typical market value`;
            } else if (priceComparison.status.includes('within')) {
                priceText = 'Your asking price is within our estimated value range';
            } else if (priceComparison.status === 'optimal') {
                priceText = 'Your asking price aligns perfectly with our estimated value';
            } else {
                priceText = 'Your asking price could not be compared to market value';
            }
            priceAnalysisEl.textContent = priceText;
        }
    }
    
    // Add a visual price indicator showing where the asking price falls
    const priceIndicatorEl = document.getElementById('price-indicator-container');
    if (priceIndicatorEl && priceComparison.status !== 'unknown') {
        const askingPrice = parseFloat(document.querySelector('[name="price"]')?.value || 0);
        const minValue = valuation.valuationRange.min;
        const maxValue = valuation.valuationRange.max;
        const range = maxValue - minValue;
        
        let position = 50; // Default to middle
        
        if (askingPrice <= minValue) {
            position = 0;
        } else if (askingPrice >= maxValue) {
            position = 100;
        } else {
            position = ((askingPrice - minValue) / range) * 100;
        }
        
        priceIndicatorEl.innerHTML = `
            <div class="valuation-range-bar">
                <div class="range-min">£${minValue.toLocaleString()}</div>
                <div class="range-bar">
                    <div class="price-marker" style="left: ${position}%;" title="Your asking price: £${askingPrice.toLocaleString()}"></div>
                </div>
                <div class="range-max">£${maxValue.toLocaleString()}</div>
            </div>
            <div class="price-indicator-label">
                <span>Your asking price: £${askingPrice.toLocaleString()}</span>
            </div>
        `;
        priceIndicatorEl.classList.remove('d-none');
    }
    
    // Update explanation
    const explanationEl = document.getElementById('valuation-explanation');
    if (explanationEl && valuation.explanation) {
        explanationEl.textContent = valuation.explanation;
    }
    
    // Update factors list
    const factorsListEl = document.getElementById('valuation-factors');
    if (factorsListEl && valuation.factors) {
        // Clear existing content
        factorsListEl.innerHTML = '';
        
        // Filter and sort factors by impact
        const sortedFactors = Object.values(valuation.factors)
            .filter(factor => factor.analysis)
            .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
            
        // Add each factor
        sortedFactors.forEach(factor => {
            const li = document.createElement('li');
            li.className = factor.impact > 0 ? 'positive' : factor.impact < 0 ? 'negative' : 'neutral';
            li.textContent = factor.analysis;
            factorsListEl.appendChild(li);
        });
        
        // If no factors, add a note
        if (sortedFactors.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'No specific valuation factors identified';
            factorsListEl.appendChild(li);
        }
    }
    
    // Update insights
    const insightsEl = document.getElementById('valuation-insights');
    if (insightsEl && valuation.insights) {
        // Clear existing content
        insightsEl.innerHTML = '';
        
        // Add each insight
        if (Array.isArray(valuation.insights)) {
            valuation.insights.forEach(insight => {
                const li = document.createElement('li');
                li.textContent = insight;
                insightsEl.appendChild(li);
            });
        }
    }
    
    // Update recommendations
    const recommendationsEl = document.getElementById('valuation-recommendations');
    if (recommendationsEl && valuation.recommendations) {
        // Clear existing content
        recommendationsEl.innerHTML = '';
        
        // Add recommendations
        if (valuation.recommendations.items && Array.isArray(valuation.recommendations.items)) {
            valuation.recommendations.items.forEach(recommendation => {
                const li = document.createElement('li');
                li.textContent = recommendation;
                recommendationsEl.appendChild(li);
            });
        }
    }
    
    // Update industry data
    const industryDataEl = document.getElementById('industry-data');
    if (industryDataEl && valuation.industryData) {
        // Format industry data
        const data = valuation.industryData;
        industryDataEl.innerHTML = `
            <div><strong>Industry:</strong> ${data.industry || 'Other'}</div>
            <div><strong>Revenue Multiple Range:</strong> ${data.min_revenue_multiplier.toFixed(2)}x - ${data.max_revenue_multiplier.toFixed(2)}x</div>
            <div><strong>EBITDA Multiple:</strong> ${data.ebitda_multiplier.toFixed(2)}x</div>
        `;
    }
    
    // Update business metrics summary
    const metricsEl = document.getElementById('business-metrics-summary');
    if (metricsEl && valuation.businessMetrics) {
        const metrics = valuation.businessMetrics;
        
        // Create a summary of the key metrics used
        let metricsHtml = '<div class="metrics-grid">';
        
        if (metrics.revenue) {
            metricsHtml += `<div class="metric"><span>Revenue:</span> £${metrics.revenue.toLocaleString()}</div>`;
        }
        
        if (metrics.ebitda) {
            metricsHtml += `<div class="metric"><span>EBITDA:</span> £${metrics.ebitda.toLocaleString()}</div>`;
        }
        
        if (metrics.cashFlow) {
            metricsHtml += `<div class="metric"><span>Cash Flow:</span> £${metrics.cashFlow.toLocaleString()}</div>`;
        }
        
        if (metrics.yearsInOperation) {
            metricsHtml += `<div class="metric"><span>Years in Business:</span> ${metrics.yearsInOperation}</div>`;
        }
        
        if (metrics.growthRate) {
            metricsHtml += `<div class="metric"><span>Growth Rate:</span> ${metrics.growthRate.toFixed(1)}%</div>`;
        }
        
        if (metrics.employees) {
            metricsHtml += `<div class="metric"><span>Employees:</span> ${metrics.employees}</div>`;
        }
        
        if (metrics.ffeValue || metrics.inventoryValue) {
            const assetValue = (metrics.ffeValue || 0) + (metrics.inventoryValue || 0);
            metricsHtml += `<div class="metric"><span>Asset Value:</span> £${assetValue.toLocaleString()}</div>`;
        }
        
        metricsHtml += '</div>';
        metricsEl.innerHTML = metricsHtml;
    }
}

// Add validation for additional inputs when calculating valuations
function validateInputs() {
    const baseValid = validateNumericInputs(); // Call existing validation
    
    // Emphasize asking price for more accurate valuation
    const askingPrice = document.querySelector('[name="price"]')?.value;
    
    if (!askingPrice && baseValid) {
        // If basic validation passes but no asking price, suggest adding one
        const addPriceMessage = 'Adding your asking price will provide a more personalized valuation. Would you like to continue without it?';
        return confirm(addPriceMessage);
    }
    
    return baseValid;
}

// Override the existing calculateValuation function
const originalCalculateValuation = calculateValuation;
calculateValuation = async function() {
    // Use enhanced validation that highlights asking price
    if (!validateInputs()) {
        return;
    }
    
    // Call the original function with all our validated inputs
    await originalCalculateValuation();
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Add event listener to the calculate button
    const calculateBtn = document.getElementById('calculateValuation');
    if (calculateBtn) {
        calculateBtn.addEventListener('click', calculateValuation);
        console.log('Added click handler to calculate valuation button');
    } else {
        console.warn('Calculate valuation button not found');
    }
    
    // Ensure valuation containers exist
    if (!document.getElementById('valuation-results')) {
        console.warn('Valuation results container not found');
    }
    
    if (!document.getElementById('valuation-loading')) {
        console.warn('Valuation loading container not found');
    }
    
    // Add value change listeners to key financial inputs
    const financialInputs = document.querySelectorAll('input[name="gross_revenue"], input[name="ebitda"], input[name="cash_flow"], input[name="price"]');
    financialInputs.forEach(input => {
        input.addEventListener('change', function() {
            const resultsElement = document.getElementById('valuation-results');
            if (resultsElement) {
                resultsElement.classList.add('d-none');
            }
            
            console.log('Financial input changed, hiding valuation results');
        });
    });
});

// Make the function globally available
window.calculateValuation = calculateValuation;

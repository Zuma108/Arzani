/**
 * questionnaire-data-saver.js
 * 
 * This script handles automatic saving of questionnaire data
 * as users progress through the seller questionnaire pages.
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Questionnaire data saver loaded');
    
    // Generate anonymous ID if not exists
    if (!localStorage.getItem('questionnaireAnonymousId')) {
        const anonymousId = 'anon_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('questionnaireAnonymousId', anonymousId);
        console.log('Generated anonymous ID:', anonymousId);
    }
    
    // Function to collect all questionnaire data from localStorage
    function prepareQuestionnaireData() {
        return {
            email: localStorage.getItem('sellerEmail') || null,
            anonymousId: localStorage.getItem('questionnaireAnonymousId'),
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
            revenue3YearsAgo: localStorage.getItem('sellerRevenue3YearsAgo'),
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
            timestamp: new Date().toISOString(),
            source: 'seller-questionnaire',
            // Add valuation data if available
            valuationData: localStorage.getItem('sellerValuationData') 
                ? JSON.parse(localStorage.getItem('sellerValuationData')) 
                : null
        };
    }
    
    // Function to save data to server
    async function saveQuestionnaireDataToServer() {
        try {
            const questionnaireData = prepareQuestionnaireData();
            
            // Skip if we don't have any data yet
            if (!questionnaireData.businessName && !questionnaireData.industry && !questionnaireData.email) {
                console.log('Not enough data to save yet');
                return false;
            }
            
            // Use existing submissionId if available
            const submissionId = localStorage.getItem('questionnaireSubmissionId');
            if (submissionId) {
                questionnaireData.submissionId = submissionId;
            }
            
            console.log('Saving questionnaire data to server:', questionnaireData);
            
            // Send data to server with timeout to prevent blocking too long
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
            
            try {
                const response = await fetch('/seller-questionnaire/save-data', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(questionnaireData),
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const result = await response.json();
                
                if (result.success) {
                    console.log('Successfully saved questionnaire data with ID:', result.submissionId);
                    // Store the submission ID for future reference
                    localStorage.setItem('questionnaireSubmissionId', result.submissionId);
                    document.cookie = `questionnaireSubmissionId=${result.submissionId}; path=/; max-age=${60*60*24*30}`; // 30 days
                    return true;
                } else {
                    console.error('Server indicated failure saving questionnaire data:', result.message);
                    return false;
                }
            } catch (fetchError) {
                clearTimeout(timeoutId);
                if (fetchError.name === 'AbortError') {
                    console.warn('Save operation timed out but continuing navigation');
                    return false;
                }
                throw fetchError;
            }
        } catch (error) {
            console.error('Failed to save questionnaire data:', error);
            // Don't block navigation if this fails
            return false;
        }
    }
    
    // Create a non-blocking version that never awaits or throws
    function saveQuestionnaireDataToServerNonBlocking() {
        saveQuestionnaireDataToServer()
            .catch(err => {
                console.error('Non-blocking save error (can be ignored):', err);
            });
        return true; // Always return true to allow navigation
    }
    
    // Detect when the user is about to leave a page and save data
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
        const originalClickHandler = nextBtn.onclick;
        
        // For valuation page that has the perma-loading issue, use special handling
        const isValuationPage = window.location.href.includes('/valuation');
        
        if (isValuationPage) {
            nextBtn.addEventListener('click', function(e) {
                // Check validation but don't wait for save
                if (window.validateBeforeNext && !window.validateBeforeNext()) {
                    return false;
                }
                
                // Fire and forget - don't block navigation
                saveQuestionnaireDataToServerNonBlocking();
                
                // Continue with navigation immediately
                console.log('Proceeding with navigation without waiting for save (valuation page)');
                
                // Original handler can proceed
                if (originalClickHandler) {
                    return originalClickHandler.call(this, e);
                }
                
                return true;
            });
        } else {
            // For other pages, use normal async approach
            nextBtn.addEventListener('click', async function(e) {
                // Don't interfere with the original validation logic
                if (window.validateBeforeNext && !window.validateBeforeNext()) {
                    return false;
                }
                
                // Automatically save data before proceeding
                try {
                    await saveQuestionnaireDataToServer();
                } catch (error) {
                    console.error('Error saving data before navigation:', error);
                    // Continue anyway - don't block navigation for saving errors
                }
                
                // If there was an original click handler, let it proceed
                if (originalClickHandler) {
                    return originalClickHandler.call(this, e);
                }
            });
        }
    }
    
    // Also save periodically (every 30 seconds) to minimize data loss
    setInterval(saveQuestionnaireDataToServerNonBlocking, 30000);
    
    // Make save function available globally
    window.saveQuestionnaireDataToServer = saveQuestionnaireDataToServer;
    window.saveQuestionnaireDataToServerNonBlocking = saveQuestionnaireDataToServerNonBlocking;
    
    // Initial save attempt when script loads (non-blocking)
    setTimeout(saveQuestionnaireDataToServerNonBlocking, 2000);
});
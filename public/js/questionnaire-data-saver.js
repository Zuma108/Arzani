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
    
    // Function to collect all questionnaire data from localStorage for saving
    function prepareQuestionnaireDataForSave() {
        const data = {
            // Basic info
            email: localStorage.getItem('sellerEmail'),
            businessName: localStorage.getItem('sellerBusinessName'),
            industry: localStorage.getItem('sellerIndustry'),
            description: localStorage.getItem('sellerDescription'),
            yearEstablished: localStorage.getItem('sellerYearEstablished'),
            yearsInOperation: localStorage.getItem('sellerYearsInOperation'),
            contactName: localStorage.getItem('sellerContactName'),
            contactPhone: localStorage.getItem('sellerContactPhone'),
            location: localStorage.getItem('sellerLocation'),
            
            // Financials
            revenueExact: localStorage.getItem('sellerRevenueExact'),
            revenuePrevYear: localStorage.getItem('sellerRevenuePrevYear'),
            revenue2YearsAgo: localStorage.getItem('sellerRevenue2YearsAgo'),
            revenue3YearsAgo: localStorage.getItem('sellerRevenue3YearsAgo'),
            ebitda: localStorage.getItem('sellerEbitda'),
            ebitdaPrevYear: localStorage.getItem('sellerEbitdaPrevYear'),
            ebitda2YearsAgo: localStorage.getItem('sellerEbitda2YearsAgo'),
            cashOnCash: localStorage.getItem('sellerCashOnCash'),
            
            // Assets & Growth
            ffeValue: localStorage.getItem('sellerFfeValue'),
            ffeItems: localStorage.getItem('sellerFfeItems'),
            growthRate: localStorage.getItem('sellerGrowthRate'),
            growthAreas: localStorage.getItem('sellerGrowthAreas'),
            growthChallenges: localStorage.getItem('sellerGrowthChallenges'),
            scalability: localStorage.getItem('sellerScalability'),
            
            // Debt
            totalDebtAmount: localStorage.getItem('sellerTotalDebtAmount'),
            debtTransferable: localStorage.getItem('sellerDebtTransferable'),
            debtNotes: localStorage.getItem('sellerDebtNotes'),
            debtItems: localStorage.getItem('sellerDebtItems'),
            
            // Asking Price (from slider)
            askingPrice: localStorage.getItem('sellerAskingPrice'), // Added asking price
            
            // Metadata
            timestamp: new Date().toISOString(),
            source: 'seller-questionnaire',
            currentPage: window.location.pathname, // Track current page
            
            // IDs
            anonymousId: localStorage.getItem('questionnaireAnonymousId'),
            submissionId: localStorage.getItem('questionnaireSubmissionId')
        };
        
        // Add valuation data if available (check both window and localStorage)
        let valuationData = null;
        if (window.valuationData) {
            valuationData = window.valuationData;
        } else {
            const savedValuation = localStorage.getItem('sellerValuationData');
            if (savedValuation) {
                try {
                    valuationData = JSON.parse(savedValuation);
                } catch (e) {
                    console.error('Error parsing saved valuation data from localStorage:', e);
                }
            }
        }
        
        if (valuationData) {
            data.valuationData = valuationData; // Use 'valuationData' consistently
            console.log('Included valuation data in payload:', valuationData);
        } else {
            console.log('No valuation data found to include in payload.');
        }
        
        // Remove null/undefined values before sending
        Object.keys(data).forEach(key => {
            if (data[key] === null || data[key] === undefined) {
                delete data[key];
            }
        });
        
        return data;
    }

    // Function to save questionnaire data to server (non-blocking)
    async function saveQuestionnaireDataToServerNonBlocking() {
        // Check if a save is already in progress
        if (window.isSavingQuestionnaireData) {
            console.log('Save already in progress, skipping duplicate request.');
            return;
        }
        
        // Set flag to indicate save is starting
        window.isSavingQuestionnaireData = true;
        console.log('Attempting non-blocking save...');
        
        try {
            const questionnaireData = prepareQuestionnaireDataForSave();
            
            // Ensure we have an anonymous ID
            if (!questionnaireData.anonymousId) {
                questionnaireData.anonymousId = 'anon_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('questionnaireAnonymousId', questionnaireData.anonymousId);
            }
            
            // Only proceed if we have an email or anonymous ID
            if (!questionnaireData.email && !questionnaireData.anonymousId) {
                console.warn('Cannot save data: Missing email and anonymous ID.');
                window.isSavingQuestionnaireData = false; // Reset flag
                return;
            }
            
            console.log('Prepared data for non-blocking save:', questionnaireData);
            
            // Use navigator.sendBeacon if available for true non-blocking behavior,
            // especially useful for 'beforeunload' or page transitions.
            // Fallback to fetch for other cases or if sendBeacon fails.
            
            const blob = new Blob([JSON.stringify(questionnaireData)], { type: 'application/json' });
            
            // Try sendBeacon first
            if (navigator.sendBeacon) {
                const success = navigator.sendBeacon('/api/business/save-questionnaire', blob);
                if (success) {
                    console.log('Questionnaire data sent via sendBeacon.');
                    // Clear the unsaved valuation flag if it exists
                    localStorage.removeItem('hasUnsavedValuation');
                    // Assume success, but no direct response handling possible with sendBeacon
                    window.isSavingQuestionnaireData = false; // Reset flag
                    return; // Exit early
                } else {
                    console.warn('sendBeacon failed, falling back to fetch.');
                }
            }
            
            // Fallback to fetch if sendBeacon is not available or failed
            const response = await fetch('/api/business/save-questionnaire', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(questionnaireData),
                keepalive: true // Important for fetch during page unload/navigation
            });
            
            if (!response.ok) {
                // Log detailed error if possible
                let errorBody = 'Could not read error body';
                try {
                    errorBody = await response.text();
                } catch (e) { /* ignore */ }
                throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                console.log('Successfully saved questionnaire data (non-blocking fetch) with ID:', result.submissionId);
                // Store the submission ID if it's new or updated
                if (result.submissionId && result.submissionId !== localStorage.getItem('questionnaireSubmissionId')) {
                    localStorage.setItem('questionnaireSubmissionId', result.submissionId);
                    document.cookie = `questionnaireSubmissionId=${result.submissionId}; path=/; max-age=${60*60*24*30}`; // 30 days
                }
                // Clear the unsaved valuation flag
                localStorage.removeItem('hasUnsavedValuation');
            } else {
                console.error('Server indicated failure saving questionnaire data (non-blocking fetch):', result.message);
            }
            
        } catch (error) {
            console.error('Failed to save questionnaire data (non-blocking):', error);
            // Don't block user, but log the error
        } finally {
            // Reset the saving flag after attempt (success or fail)
            window.isSavingQuestionnaireData = false;
            console.log('Non-blocking save attempt finished.');
        }
    }
    
    // Detect when the user is about to leave a page and save data
    window.addEventListener('beforeunload', (event) => {
        console.log('beforeunload triggered, attempting non-blocking save.');
        // Use the non-blocking version here as well to avoid delaying closure
        saveQuestionnaireDataToServerNonBlocking();
        // Don't prevent default or show confirmation dialog
    });

    // Remove or comment out the specific 'Next' button listener for the valuation page
    /*
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
        const originalClickHandler = nextBtn.onclick;
        
        // For valuation page that has the perma-loading issue, use special handling
        const isValuationPage = window.location.href.includes('/valuation');
        
        if (isValuationPage) {
            // Remove this listener entirely - let questionnaire-navigation.js handle it via validateBeforeNext
            // nextBtn.addEventListener('click', function(e) { ... });
            console.log('Removed redundant nextBtn listener from questionnaire-data-saver.js for valuation page.');
        } else {
            // Keep the listener for other pages if needed, or consolidate logic
            // nextBtn.addEventListener('click', async function(e) { ... });
        }
    }
    */
    
    // Make the non-blocking save function globally available for validateBeforeNext
    window.saveQuestionnaireDataToServerNonBlocking = saveQuestionnaireDataToServerNonBlocking;
    
    // Initial save attempt when script loads (non-blocking)
    setTimeout(saveQuestionnaireDataToServerNonBlocking, 2000);
});
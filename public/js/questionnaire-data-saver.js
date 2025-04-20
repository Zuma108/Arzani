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
    
    // Create a non-blocking version that never awaits or throws
    function saveQuestionnaireDataToServerNonBlocking() {
        console.log('Starting non-blocking save operation');
        
        // Get data first so we have it even if the async operation takes time
        const questionnaireData = prepareQuestionnaireData();
        
        // Add valuation data if available
        if (window.valuationData) {
            questionnaireData.valuation = window.valuationData;
        }
        
        // Add the anonymous ID
        const anonymousId = localStorage.getItem('questionnaireAnonymousId') || 
            'anon_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        questionnaireData.anonymousId = anonymousId;
        
        // Always store in localStorage as backup
        try {
            localStorage.setItem('pendingQuestionnaireData', JSON.stringify(questionnaireData));
            localStorage.setItem('pendingQuestionnaireSaveTime', new Date().toISOString());
            localStorage.setItem('questionnaireCompletedAnonymously', 'true');
        } catch (storageErr) {
            console.warn('Failed to store data in localStorage:', storageErr);
        }
        
        // Use fetch with proper redirect handling
        fetch('/api/business/save-questionnaire', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(questionnaireData),
            // Don't follow redirects - we want to handle them ourselves
            redirect: 'manual',
            // Set a reasonable timeout
            signal: AbortSignal.timeout(10000)
        })
        .then(response => {
            // If redirected to login (302/303), consider this "success" for anonymous users
            if (response.type === 'opaqueredirect' || response.status === 302 || response.status === 303) {
                console.log('Redirect detected (likely to login) - continuing navigation');
                return { success: false, pendingData: true, message: 'Authentication required' };
            }
            
            if (!response.ok) {
                return response.text().then(text => {
                    // Check if HTML response (login page)
                    if (text.includes('<!DOCTYPE') || text.includes('<html')) {
                        console.log('HTML response detected - continuing navigation');
                        return { success: false, pendingData: true, message: 'Authentication required' };
                    }
                    
                    try {
                        return JSON.parse(text); // Try to parse as JSON
                    } catch (e) {
                        throw new Error(`Server error ${response.status}: ${text.substring(0, 100)}`);
                    }
                });
            }
            
            return response.json();
        })
        .then(result => {
            if (result.success) {
                console.log('Non-blocking save succeeded:', result.submissionId);
                localStorage.setItem('questionnaireSubmissionId', result.submissionId);
            } else if (result.pendingData) {
                console.log('Data saved locally for future submission');
            } else {
                console.warn('Non-blocking save returned error:', result.message);
            }
        })
        .catch(error => {
            console.warn('Error in non-blocking save (safely caught):', error.message);
            // Data is already in localStorage, navigation can continue
        });
        
        // Return immediately to unblock navigation
        console.log('Non-blocking save initiated, continuing navigation');
        return true;
    }
    
    // Detect when the user is about to leave a page and save data
    window.addEventListener('beforeunload', (event) => {
        console.log('beforeunload triggered, attempting non-blocking save.');
        saveQuestionnaireDataToServerNonBlocking();
    });
    
    // Make the non-blocking save function globally available for validateBeforeNext
    window.saveQuestionnaireDataToServerNonBlocking = saveQuestionnaireDataToServerNonBlocking;
    
    // Also save periodically (every 30 seconds) to minimize data loss
    setInterval(saveQuestionnaireDataToServerNonBlocking, 30000);
    
    // Make save function available globally
    window.saveQuestionnaireDataToServer = saveQuestionnaireDataToServerNonBlocking;
    
    // Initial save attempt when script loads (non-blocking)
    setTimeout(saveQuestionnaireDataToServerNonBlocking, 2000);
});
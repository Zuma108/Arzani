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
        
        // Store this data now in localStorage for redirect recovery
        try {
            localStorage.setItem('pendingQuestionnaireData', JSON.stringify(questionnaireData));
            localStorage.setItem('pendingQuestionnaireSaveTime', new Date().toISOString());
            localStorage.setItem('questionnaireRedirectCount', 
                (parseInt(localStorage.getItem('questionnaireRedirectCount') || '0') + 1).toString());
        } catch (storageErr) {
            console.warn('Failed to store pending data in localStorage:', storageErr);
        }
        
        // Use XMLHttpRequest instead of fetch to better handle redirects
        const xhr = new XMLHttpRequest();
        
        // Create timeout handler
        const xhrTimeout = setTimeout(() => {
            if (xhr.readyState < 4) {
                xhr.abort();
                console.warn('Non-blocking save request timed out');
            }
        }, 10000); // 10 second timeout
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                clearTimeout(xhrTimeout);
                
                // Check if we got redirected to login page
                if (xhr.responseURL && xhr.responseURL.includes('/login')) {
                    console.log('Detected redirect to login page. Data is saved for later submission.');
                    // Data is already stored in localStorage above
                    return;
                }
                
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const result = JSON.parse(xhr.responseText);
                        console.log('Non-blocking save succeeded:', result.submissionId);
                        
                        if (result.success) {
                            localStorage.setItem('questionnaireSubmissionId', result.submissionId);
                            
                            // Clear pending data since save was successful
                            localStorage.removeItem('pendingQuestionnaireData');
                            localStorage.removeItem('pendingQuestionnaireSaveTime');
                        }
                    } catch (e) {
                        console.warn('Error parsing response:', e);
                    }
                } else {
                    console.warn('Non-blocking save failed with status:', xhr.status);
                }
            }
        };
        
        xhr.open('POST', '/api/business/save-questionnaire', true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.withCredentials = true; // Include cookies
        
        try {
            xhr.send(JSON.stringify(questionnaireData));
        } catch (e) {
            console.warn('Error sending XHR request:', e);
        }
        
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
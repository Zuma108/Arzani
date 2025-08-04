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
    
    // Add a submission tracker object to prevent submission loops
    const submissionTracker = {
        lastSubmitTime: 0,
        lastSubmissionHash: '',
        minSubmitInterval: 5000, // 5 seconds between submissions
        isSubmitting: false,
        pendingSubmissions: 0,
        
        canSubmit: function(dataHash) {
            const now = Date.now();
            // Don't allow submissions if one is in progress
            if (this.isSubmitting) {
                console.log('Submission already in progress, skipping');
                return false;
            }
            
            // Don't allow submissions too close together
            if (now - this.lastSubmitTime < this.minSubmitInterval) {
                console.log('Too soon since last submission, skipping');
                return false;
            }
            
            // Don't submit the same data twice in a row
            if (dataHash && dataHash === this.lastSubmissionHash) {
                console.log('Same data as last submission, skipping');
                return false;
            }
            
            return true;
        },
        
        startSubmission: function(dataHash) {
            this.isSubmitting = true;
            this.pendingSubmissions++;
            this.lastSubmitTime = Date.now();
            if (dataHash) {
                this.lastSubmissionHash = dataHash;
            }
        },
        
        finishSubmission: function() {
            this.isSubmitting = false;
            this.pendingSubmissions = Math.max(0, this.pendingSubmissions - 1);
        }
    };
    
    // Function to generate a simple hash of submission data for comparison
    function generateSubmissionHash(data) {
        try {
            // Only include key fields that would make a submission different
            const keyFields = {
                email: data.email,
                businessName: data.businessName,
                industry: data.industry,
                anonymousId: data.anonymousId,
                revenue: data.revenueExact,
                ebitda: data.ebitda
            };
            return JSON.stringify(keyFields);
        } catch (e) {
            return Date.now().toString(); // Fallback
        }
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
        
        // Add request ID and timestamp to ensure uniqueness
        const requestId = 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
        questionnaireData._requestId = requestId;
        questionnaireData._clientTimestamp = Date.now();
        
        // Generate a hash of the submission for comparison
        const submissionHash = generateSubmissionHash(questionnaireData);
        
        // Check if we can submit this data
        if (!submissionTracker.canSubmit(submissionHash)) {
            console.log('Submission prevented by tracker - returning cached result');
            
            // Return a promise that resolves immediately with cached data
            return Promise.resolve({
                success: true,
                message: 'Using cached submission result',
                submissionId: localStorage.getItem('questionnaireSubmissionId'),
                cached: true
            });
        }
        
        // Mark that we're starting a submission
        submissionTracker.startSubmission(submissionHash);
        
        // Always store in localStorage as backup
        try {
            localStorage.setItem('pendingQuestionnaireData', JSON.stringify(questionnaireData));
            localStorage.setItem('pendingQuestionnaireSaveTime', new Date().toISOString());
            localStorage.setItem('questionnaireCompletedAnonymously', 'true');
        } catch (storageErr) {
            console.warn('Failed to store data in localStorage:', storageErr);
        }
        
        // Convert to a proper Promise for better handling
        return new Promise((resolve) => {
            // Use fetch with proper redirect handling
            fetch(`/api/business/save-questionnaire?nocache=${Date.now()}&clientId=${anonymousId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
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
                
                // Always resolve with the result, never reject
                resolve(result);
            })
            .catch(error => {
                console.warn('Error in non-blocking save (safely caught):', error.message);
                // Data is already in localStorage, navigation can continue
                resolve({
                    success: false,
                    error: error.message,
                    pendingData: true
                });
            })
            .finally(() => {
                // Mark that we're done with this submission
                submissionTracker.finishSubmission();
            });
            
            // Return immediately to unblock navigation
            console.log('Non-blocking save initiated, continuing navigation');
        });
    }
    
    // Use a managed beforeunload handler to prevent duplicate submissions
    let beforeUnloadSaveTriggered = false;
    window.addEventListener('beforeunload', (event) => {
        if (!beforeUnloadSaveTriggered && !submissionTracker.isSubmitting) {
            console.log('beforeunload triggered, attempting non-blocking save.');
            beforeUnloadSaveTriggered = true;
            saveQuestionnaireDataToServerNonBlocking();
            
            // Reset after a delay to allow future saves
            setTimeout(() => {
                beforeUnloadSaveTriggered = false;
            }, 10000);
        } else {
            console.log('Skipping duplicate beforeunload save');
        }
    });
    
    // Make the non-blocking save function globally available for validateBeforeNext
    window.saveQuestionnaireDataToServerNonBlocking = saveQuestionnaireDataToServerNonBlocking;
    
    // Use a more resilient interval save with proper tracking
    let intervalSaveId = null;
    function startIntervalSave() {
        if (intervalSaveId !== null) return;
        
        intervalSaveId = setInterval(() => {
            // Only save if we're not already submitting and it's been at least 30 seconds
            if (!submissionTracker.isSubmitting && 
                Date.now() - submissionTracker.lastSubmitTime >= 30000) {
                console.log('Interval save triggered');
                saveQuestionnaireDataToServerNonBlocking();
            } else {
                console.log('Skipped interval save - recent submission or in progress');
            }
        }, 30000);
    }
    
    // Start interval saving after a delay to avoid collision with initial save
    setTimeout(startIntervalSave, 5000);
    
    // Make save function available globally
    window.saveQuestionnaireDataToServer = saveQuestionnaireDataToServerNonBlocking;
});
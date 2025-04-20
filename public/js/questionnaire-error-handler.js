/**
 * Centralized error handling for questionnaire
 */
(function() {
    // Log levels
    const LOG_LEVELS = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3
    };
    
    // Current log level
    let currentLogLevel = LOG_LEVELS.INFO;
    
    // Maximum errors to track
    const MAX_ERRORS = 10;
    
    // Error history
    let errorHistory = [];
    
    // Log an error with context
    function logError(error, context = {}) {
        const errorObj = {
            timestamp: new Date().toISOString(),
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : null,
            context,
            url: window.location.href
        };
        
        // Add to history
        errorHistory.unshift(errorObj);
        if (errorHistory.length > MAX_ERRORS) {
            errorHistory.pop();
        }
        
        // Save to session storage
        try {
            sessionStorage.setItem('questionnaire_errors', JSON.stringify(errorHistory));
        } catch (e) {
            console.warn('Failed to save error to sessionStorage');
        }
        
        // Log to console
        console.error('[Questionnaire Error]', errorObj);
        
        return errorObj;
    }
    
    // Handle an error with fallback UI action
    function handleError(error, fallbackAction) {
        const errorObj = logError(error);
        
        // Execute fallback action if provided
        if (typeof fallbackAction === 'function') {
            try {
                fallbackAction(errorObj);
            } catch (fallbackError) {
                console.error('Error in fallback action:', fallbackError);
            }
        }
        
        // Return error object
        return errorObj;
    }
    
    // Ensure loading overlays are never stuck
    function ensureLoadingOverlaysRemoved() {
        // Find all possible loading overlays and hide them
        document.querySelectorAll('.loading-overlay, [id*="loading"]').forEach(el => {
            if (el.style) {
                el.style.display = 'none';
            }
            el.classList.add('hidden');
        });
    }
    
    // Set a global error boundary
    window.addEventListener('error', function(event) {
        logError(event.error || event.message, { 
            source: event.filename,
            line: event.lineno,
            column: event.colno
        });
        
        // Ensure loading overlays don't get stuck
        ensureLoadingOverlaysRemoved();
    });
    
    // Expose to global scope
    window.questionnaireErrorHandler = {
        logError,
        handleError,
        ensureLoadingOverlaysRemoved,
        getErrorHistory: () => [...errorHistory],
        setLogLevel: (level) => { currentLogLevel = level; }
    };
})();

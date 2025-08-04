/**
 * Questionnaire Logger
 * Utility for consistent logging across questionnaire pages
 */

class QuestionnaireLogger {
    constructor() {
        this.debugMode = localStorage.getItem('qDebugMode') === 'true';
        this.logHistory = JSON.parse(localStorage.getItem('qLogHistory') || '[]');
        this.maxLogHistory = 100; // Maximum number of log entries to keep
    }

    /**
     * Log a message with optional data and save to history
     */
    log(message, data = null, type = 'info') {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            page: this.getCurrentPage(),
            type,
            message,
            data
        };
        
        // Add to history
        this.logHistory.unshift(logEntry);
        
        // Trim history if needed
        if (this.logHistory.length > this.maxLogHistory) {
            this.logHistory = this.logHistory.slice(0, this.maxLogHistory);
        }
        
        // Save history to localStorage
        localStorage.setItem('qLogHistory', JSON.stringify(this.logHistory));
        
        // Log to console
        const logMethod = type === 'error' ? console.error : 
                        type === 'warning' ? console.warn : console.log;
        
        logMethod(`[${timestamp}] [${this.getCurrentPage()}] ${message}`, data || '');
        
        // Show visual indicator if debug mode is on
        if (this.debugMode) {
            this.showVisualLog(message, type);
        }
        
        return logEntry;
    }
    
    /**
     * Log an error
     */
    error(message, data = null) {
        return this.log(message, data, 'error');
    }
    
    /**
     * Log a warning
     */
    warn(message, data = null) {
        return this.log(message, data, 'warning');
    }
    
    /**
     * Log successful data saving
     */
    dataSaved(page, data = null) {
        return this.log(`Data saved for ${page} page`, data, 'success');
    }
    
    /**
     * Get current page name from URL
     */
    getCurrentPage() {
        const path = window.location.pathname;
        const match = path.match(/\/seller-questionnaire\/([^\/]+)/);
        return match ? match[1] : 'unknown';
    }
    
    /**
     * Show a visual log message (for debug mode)
     */
    showVisualLog(message, type = 'info') {
        // Create or get floating log container
        let logContainer = document.getElementById('questionnaire-log-display');
        
        if (!logContainer) {
            logContainer = document.createElement('div');
            logContainer.id = 'questionnaire-log-display';
            logContainer.style.cssText = `
                position: fixed;
                bottom: 10px;
                right: 10px;
                width: 300px;
                max-height: 200px;
                overflow-y: auto;
                background-color: rgba(0, 0, 0, 0.8);
                color: white;
                border-radius: 5px;
                font-family: monospace;
                font-size: 12px;
                z-index: 9999;
                padding: 10px;
            `;
            document.body.appendChild(logContainer);
        }
        
        // Create log entry element
        const logEntry = document.createElement('div');
        logEntry.style.cssText = `
            margin-bottom: 5px;
            padding: 5px;
            border-radius: 3px;
            border-left: 3px solid ${type === 'error' ? '#f44336' : 
                               type === 'warning' ? '#ff9800' : 
                               type === 'success' ? '#4caf50' : '#2196f3'};
        `;
        
        logEntry.textContent = message;
        
        // Add to log container
        logContainer.insertBefore(logEntry, logContainer.firstChild);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (logEntry.parentNode === logContainer) {
                logContainer.removeChild(logEntry);
            }
            
            // Hide container if empty
            if (logContainer.children.length === 0) {
                logContainer.style.display = 'none';
            }
        }, 5000);
        
        // Show container
        logContainer.style.display = 'block';
    }
    
    /**
     * Toggle debug mode
     */
    toggleDebugMode() {
        this.debugMode = !this.debugMode;
        localStorage.setItem('qDebugMode', this.debugMode);
        console.log(`Questionnaire debug mode ${this.debugMode ? 'enabled' : 'disabled'}`);
        return this.debugMode;
    }
    
    /**
     * Clear log history
     */
    clearHistory() {
        this.logHistory = [];
        localStorage.setItem('qLogHistory', JSON.stringify(this.logHistory));
        console.log('Questionnaire log history cleared');
    }
    
    /**
     * Get log history
     */
    getHistory() {
        return this.logHistory;
    }
}

// Create singleton instance
window.questionnaireLogger = new QuestionnaireLogger();

// Debug mode keyboard shortcut (Ctrl+Alt+Q)
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.altKey && e.key === 'q') {
        const debugMode = window.questionnaireLogger.toggleDebugMode();
        window.questionnaireLogger.log(`Debug mode ${debugMode ? 'enabled' : 'disabled'}`);
    }
});

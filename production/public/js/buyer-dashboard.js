/**
 * Buyer Dashboard JavaScript
 * Handles real-time updates, API calls, and interactive features
 */

class BuyerDashboard {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.refreshInterval = null;
        this.lastUpdateTime = Date.now();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.startAutoRefresh();
        this.setupNotifications();
        console.log('Buyer Dashboard initialized');
    }

    generateSessionId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.querySelector('[data-action="refresh"]');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshDashboard());
        }

        // Alert management
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="view-alert"]')) {
                const alertId = e.target.getAttribute('data-alert-id');
                this.viewAlert(alertId);
            }
            
            if (e.target.matches('[data-action="pause-alert"]')) {
                const alertId = e.target.getAttribute('data-alert-id');
                this.updateAlertStatus(alertId, 'paused');
            }
            
            if (e.target.matches('[data-action="delete-alert"]')) {
                const alertId = e.target.getAttribute('data-alert-id');
                this.updateAlertStatus(alertId, 'deleted');
            }
        });

        // Search management
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="view-search"]')) {
                const searchId = e.target.getAttribute('data-search-id');
                this.viewSavedSearch(searchId);
            }
        });

        // Meeting management
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="join-meeting"]')) {
                const meetingId = e.target.getAttribute('data-meeting-id');
                this.joinMeeting(meetingId);
            }
        });

        // Track business views
        this.setupViewTracking();
    }

    setupViewTracking() {
        // Track when user views business listings
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-business-id]')) {
                const businessId = e.target.getAttribute('data-business-id');
                this.trackBusinessView(businessId);
            }
        });
    }

    async trackBusinessView(businessId) {
        try {
            await this.apiCall('/api/buyer-dashboard/track-view', 'POST', {
                businessId: businessId,
                sessionId: this.sessionId
            });
        } catch (error) {
            console.error('Error tracking business view:', error);
        }
    }

    async refreshDashboard() {
        try {
            this.showLoadingState();
            
            const [stats, alerts, meetings, searches] = await Promise.all([
                this.apiCall('/api/buyer-dashboard/stats'),
                this.apiCall('/api/buyer-dashboard/alerts?limit=10'),
                this.apiCall('/api/buyer-dashboard/meetings?limit=5'),
                this.apiCall('/api/buyer-dashboard/searches?limit=5')
            ]);

            this.updateStats(stats.stats);
            this.updateAlerts(alerts.alerts);
            this.updateMeetings(meetings.meetings);
            this.updateSavedSearches(searches.searches);
            
            this.hideLoadingState();
            this.showSuccessMessage('Dashboard updated');
            this.lastUpdateTime = Date.now();
            
        } catch (error) {
            console.error('Error refreshing dashboard:', error);
            this.hideLoadingState();
            this.showErrorMessage('Failed to refresh dashboard');
        }
    }

    updateStats(stats) {
        const statElements = {
            'saved-searches': stats.savedSearches,
            'active-alerts': stats.activeAlerts,
            'meetings-booked': stats.meetingsBooked,
            'businesses-viewed': stats.businessesViewed
        };

        Object.entries(statElements).forEach(([key, value]) => {
            const element = document.querySelector(`[data-stat="${key}"]`);
            if (element) {
                this.animateNumber(element, parseInt(element.textContent) || 0, value);
            }
        });
    }

    animateNumber(element, from, to) {
        const duration = 1000;
        const start = Date.now();
        
        const tick = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            const current = Math.round(from + (to - from) * progress);
            
            element.textContent = current;
            
            if (progress < 1) {
                requestAnimationFrame(tick);
            }
        };
        
        requestAnimationFrame(tick);
    }

    updateAlerts(alerts) {
        const container = document.querySelector('[data-section="alerts"]');
        if (!container) return;

        if (alerts.length === 0) {
            container.innerHTML = this.getEmptyAlertsHTML();
            return;
        }

        const html = alerts.map(alert => this.getAlertHTML(alert)).join('');
        container.innerHTML = html;
    }

    updateMeetings(meetings) {
        const container = document.querySelector('[data-section="meetings"]');
        if (!container) return;

        if (meetings.length === 0) {
            container.innerHTML = this.getEmptyMeetingsHTML();
            return;
        }

        const html = meetings.map(meeting => this.getMeetingHTML(meeting)).join('');
        container.innerHTML = html;
    }

    updateSavedSearches(searches) {
        const container = document.querySelector('[data-section="saved-searches"]');
        if (!container) return;

        if (searches.length === 0) {
            container.innerHTML = this.getEmptySearchesHTML();
            return;
        }

        const html = searches.map(search => this.getSearchHTML(search)).join('');
        container.innerHTML = html;
    }

    getAlertHTML(alert) {
        const gradientClass = this.getAlertGradientClass(alert.type);
        return `
            <div class="alert-item flex items-start justify-between p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors" data-alert-id="${alert.id}">
                <div class="flex-1">
                    <div class="flex items-center mb-2">
                        <div class="p-2 rounded-full ${gradientClass} mr-3">
                            <i class="${alert.icon} text-white text-sm"></i>
                        </div>
                        <h4 class="font-medium text-gray-900 dark:text-white">${alert.title}</h4>
                    </div>
                    <p class="text-gray-600 dark:text-gray-400 text-sm mb-1">${alert.description}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-500">${alert.timeAgo}</p>
                </div>
                <div class="flex space-x-2">
                    <button data-action="view-alert" data-alert-id="${alert.id}" class="px-4 py-2 bg-primary hover:bg-secondary text-white text-sm font-medium rounded-lg transition-colors">
                        View
                    </button>
                    <button data-action="pause-alert" data-alert-id="${alert.id}" class="px-3 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                        <i class="fas fa-pause"></i>
                    </button>
                </div>
            </div>
        `;
    }

    getMeetingHTML(meeting) {
        const isVideo = meeting.meetingType === 'video';
        const scheduledDate = new Date(meeting.scheduledAt);
        const formattedDate = scheduledDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        return `
            <div class="meeting-item flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200" data-meeting-id="${meeting.id}">
                <div class="flex-1">
                    <h4 class="font-medium text-gray-900 dark:text-white mb-1">${meeting.businessName}</h4>
                    <p class="text-gray-600 dark:text-gray-400 text-sm mb-2">Meeting with ${meeting.sellerName || 'seller'}</p>
                    <div class="flex items-center text-sm text-gray-500 dark:text-gray-500">
                        <i class="fas fa-calendar mr-2"></i>
                        <span>${formattedDate}</span>
                    </div>
                </div>
                <div class="flex flex-col items-end space-y-2">
                    ${isVideo ? `
                        <button data-action="join-meeting" data-meeting-id="${meeting.id}" class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center">
                            <i class="fas fa-video mr-2"></i>
                            Join Call
                        </button>
                        <span class="text-xs text-gray-500 dark:text-gray-500">Video Call</span>
                    ` : `
                        <button data-action="view-location" data-meeting-id="${meeting.id}" class="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium rounded-lg transition-colors flex items-center">
                            <i class="fas fa-map-marker-alt mr-2"></i>
                            View Location
                        </button>
                        <span class="text-xs text-gray-500 dark:text-gray-500">In-person</span>
                    `}
                </div>
            </div>
        `;
    }

    getSearchHTML(search) {
        return `
            <div class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors" data-search-id="${search.id}">
                <div class="flex-1 min-w-0">
                    <h4 class="text-sm font-medium text-gray-900 dark:text-white truncate">${search.name}</h4>
                    <div class="flex items-center text-xs text-gray-500 dark:text-gray-500 mt-1">
                        <i class="fas fa-building mr-1"></i>
                        <span>${search.matchingBusinesses} matches</span>
                    </div>
                </div>
                <button data-action="view-search" data-search-id="${search.id}" class="ml-2 px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors">
                    View
                </button>
            </div>
        `;
    }

    getAlertGradientClass(type) {
        switch (type) {
            case 'price_drop': return 'warning-gradient';
            case 'new_listing': return 'info-gradient';
            case 'status_change': return 'success-gradient';
            default: return 'premium-gradient';
        }
    }

    getEmptyAlertsHTML() {
        return `
            <div class="text-center py-8">
                <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-700">
                    <i class="fas fa-bell text-gray-400 text-xl"></i>
                </div>
                <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">No recent alerts</h3>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Set up alerts to get notified about new opportunities.</p>
                <div class="mt-6">
                    <button class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        <i class="fas fa-plus -ml-1 mr-2 h-4 w-4"></i>
                        Create Alert
                    </button>
                </div>
            </div>
        `;
    }

    getEmptyMeetingsHTML() {
        return `
            <div class="text-center py-8">
                <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-700">
                    <i class="fas fa-calendar-alt text-gray-400 text-xl"></i>
                </div>
                <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">No upcoming meetings</h3>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Schedule meetings with sellers to discuss opportunities.</p>
                <div class="mt-6">
                    <button class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        <i class="fas fa-search -ml-1 mr-2 h-4 w-4"></i>
                        Browse Businesses
                    </button>
                </div>
            </div>
        `;
    }

    getEmptySearchesHTML() {
        return `
            <div class="text-center py-4">
                <div class="mx-auto flex items-center justify-center h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-700">
                    <i class="fas fa-bookmark text-gray-400"></i>
                </div>
                <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">No saved searches yet</p>
                <button class="mt-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                    Create your first search
                </button>
            </div>
        `;
    }

    async updateAlertStatus(alertId, status) {
        try {
            await this.apiCall(`/api/buyer-dashboard/alerts/${alertId}`, 'PATCH', { status });
            this.showSuccessMessage(`Alert ${status}`);
            this.refreshDashboard();
        } catch (error) {
            console.error('Error updating alert:', error);
            this.showErrorMessage('Failed to update alert');
        }
    }

    viewAlert(alertId) {
        // Open alert details modal or navigate to alert page
        console.log('Viewing alert:', alertId);
        // Implementation depends on your alert detail view
    }

    viewSavedSearch(searchId) {
        // Navigate to search results or open search modal
        console.log('Viewing saved search:', searchId);
        window.location.href = `/marketplace2?search=${searchId}`;
    }

    joinMeeting(meetingId) {
        // Open meeting link or show meeting details
        console.log('Joining meeting:', meetingId);
        // Implementation depends on your meeting system
    }

    startAutoRefresh() {
        // Refresh dashboard data every 5 minutes
        this.refreshInterval = setInterval(() => {
            this.refreshDashboard();
        }, 5 * 60 * 1000);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    setupNotifications() {
        // Request notification permission if not granted
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    showNotification(title, body, icon = '/figma design exports/images.webp/arzani-icon-nobackground.png') {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: body,
                icon: icon,
                badge: icon
            });
        }
    }

    async apiCall(endpoint, method = 'GET', data = null) {
        const config = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (data) {
            config.body = JSON.stringify(data);
        }

        const response = await fetch(endpoint, config);
        
        if (!response.ok) {
            throw new Error(`API call failed: ${response.status}`);
        }

        return await response.json();
    }

    showLoadingState() {
        // Show loading spinners or disable buttons
        document.querySelectorAll('[data-action="refresh"]').forEach(btn => {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner animate-spin mr-2"></i>Updating...';
        });
    }

    hideLoadingState() {
        // Hide loading spinners and re-enable buttons
        document.querySelectorAll('[data-action="refresh"]').forEach(btn => {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-sync mr-2"></i>Refresh';
        });
    }

    showSuccessMessage(message) {
        this.showToast(message, 'success');
    }

    showErrorMessage(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 transition-all duration-300 transform translate-x-full`;
        
        if (type === 'success') {
            toast.classList.add('bg-green-600');
        } else if (type === 'error') {
            toast.classList.add('bg-red-600');
        } else {
            toast.classList.add('bg-blue-600');
        }
        
        toast.innerHTML = `
            <div class="flex items-center">
                <i class="fas ${type === 'success' ? 'fa-check' : type === 'error' ? 'fa-times' : 'fa-info'} mr-2"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 100);
        
        // Animate out and remove
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }

    destroy() {
        this.stopAutoRefresh();
        // Clean up event listeners if needed
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.buyerDashboard = new BuyerDashboard();
});

// Clean up when leaving page
window.addEventListener('beforeunload', () => {
    if (window.buyerDashboard) {
        window.buyerDashboard.destroy();
    }
});

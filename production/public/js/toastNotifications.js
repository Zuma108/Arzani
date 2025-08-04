
/**
 * Toast Notification System
 * Provides a simple, consistent way to show non-intrusive notifications
 */
export class ToastNotifications {
    constructor() {
        this.container = this.createContainer();
        this.defaultDuration = 3000;
    }

    /**
     * Create the toast container if it doesn't exist
     */
    createContainer() {
        let container = document.querySelector('.toast-container');
        
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        
        return container;
    }

    /**
     * Show a toast notification
     * @param {string} message - The message to display
     * @param {string} type - Type of toast: 'info', 'success', 'warning', 'error'
     * @param {number} duration - How long to show the toast in ms
     */
    show(message, type = 'info', duration = this.defaultDuration) {
        const toast = document.createElement('div');
        toast.className = `toast ${type} toast-enter`;
        toast.setAttribute('role', 'alert');
        
        // Create the message and close button
        toast.innerHTML = `
            <button class="toast-close" aria-label="Close">&times;</button>
            <div class="toast-message">${message}</div>
        `;
        
        // Add to container
        this.container.appendChild(toast);
        
        // Set up close button
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.dismiss(toast));
        
        // Auto-dismiss after duration
        if (duration > 0) {
            setTimeout(() => this.dismiss(toast), duration);
        }
        
        return toast;
    }
    
    /**
     * Dismiss a toast with animation
     * @param {HTMLElement} toast - The toast element to dismiss
     */
    dismiss(toast) {
        toast.classList.remove('toast-enter');
        toast.classList.add('toast-exit');
        
        // Remove from DOM after animation
        toast.addEventListener('animationend', () => {
            if (toast.parentNode === this.container) {
                this.container.removeChild(toast);
            }
        });
    }
    
    /**
     * Show an info toast
     */
    info(message, duration = this.defaultDuration) {
        return this.show(message, 'info', duration);
    }
    
    /**
     * Show a success toast
     */
    success(message, duration = this.defaultDuration) {
        return this.show(message, 'success', duration);
    }
    
    /**
     * Show a warning toast
     */
    warning(message, duration = this.defaultDuration) {
        return this.show(message, 'warning', duration);
    }
    
    /**
     * Show an error toast
     */
    error(message, duration = this.defaultDuration) {
        return this.show(message, 'error', duration);
    }
    
    /**
     * Clear all toasts
     */
    clearAll() {
        while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }
    }
}

// Create global instance for easy access
const toasts = new ToastNotifications();
export default toasts;

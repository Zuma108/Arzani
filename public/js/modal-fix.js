/**
 * This file fixes modal conflicts between Bootstrap modals and the AI Assistant
 */

document.addEventListener('DOMContentLoaded', function() {
  // Fix Bootstrap modal issues if bootstrap.Modal is not available
  if (typeof bootstrap === 'undefined' || typeof bootstrap.Modal === 'undefined') {
    console.warn('Bootstrap modal object not found. Adding polyfill.');
    
    // Simple polyfill for show/hide
    window.bootstrap = window.bootstrap || {};
    bootstrap.Modal = class {
      constructor(element) {
        this.element = element;
      }
      
      show() {
        if (this.element) {
          this.element.style.display = 'block';
          this.element.classList.add('show');
          document.body.classList.add('modal-open');
          
          // Create backdrop if it doesn't exist
          if (!document.querySelector('.modal-backdrop')) {
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop fade show';
            document.body.appendChild(backdrop);
          }
        }
      }
      
      hide() {
        if (this.element) {
          this.element.style.display = 'none';
          this.element.classList.remove('show');
          document.body.classList.remove('modal-open');
          
          // Remove backdrop
          const backdrop = document.querySelector('.modal-backdrop');
          if (backdrop) {
            backdrop.remove();
          }
        }
      }
      
      static getInstance(element) {
        return new bootstrap.Modal(element);
      }
    };
  }
  
  // Fix modal backdrop issues
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('shown.bs.modal', function() {
      if (!document.querySelector('.modal-backdrop')) {
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop fade show';
        document.body.appendChild(backdrop);
      }
    });
    
    modal.addEventListener('hidden.bs.modal', function() {
      const backdrop = document.querySelector('.modal-backdrop');
      if (backdrop) backdrop.remove();
    });
  });

  // Find all Bootstrap modals
  const bootstrapModals = document.querySelectorAll('.modal');
  const aiAssistantContainer = document.getElementById('ai-assistant-container');
  
  if (!aiAssistantContainer) return;
  
  // Add event listeners for all Bootstrap modals
  bootstrapModals.forEach(modal => {
    modal.addEventListener('show.bs.modal', function() {
      // If AI assistant is open, hide it temporarily
      if (window.aiAssistant && window.aiAssistant.isOpen) {
        // Store the state to restore later
        modal.dataset.aiAssistantWasOpen = 'true';
        window.aiAssistant.toggleAssistant(false);
      }
    });
    
    modal.addEventListener('hidden.bs.modal', function() {
      // Restore AI assistant if it was open before
      if (modal.dataset.aiAssistantWasOpen === 'true') {
        if (window.aiAssistant) {
          setTimeout(() => {
            window.aiAssistant.toggleAssistant(true);
          }, 300);
        }
        delete modal.dataset.aiAssistantWasOpen;
      }
    });
  });
  
  // Ensure AI button stays above other content
  const aiButton = document.getElementById('ai-assistant-button');
  if (aiButton) {
    aiButton.style.zIndex = '1050'; // Above most content but below modals
  }
  
  // Fix for modal backdrop not being removed
  const fixModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    // Close button handling
    const closeButtons = modal.querySelectorAll('[data-bs-dismiss="modal"], .btn-close');
    closeButtons.forEach(button => {
      button.addEventListener('click', function() {
        // Force removal of backdrop and reset body
        setTimeout(() => {
          const backdrops = document.querySelectorAll('.modal-backdrop');
          backdrops.forEach(backdrop => backdrop.remove());
          document.body.classList.remove('modal-open');
          document.body.style.overflow = '';
          document.body.style.paddingRight = '';
        }, 100);
      });
    });
  };

  // Apply fix to contact modal
  fixModal('contactModal');
  
  // Fix for popup modal
  const popupModal = document.getElementById('popupModal');
  const closePopup = document.getElementById('closePopup');
  
  if (popupModal && closePopup) {
    closePopup.addEventListener('click', function() {
      popupModal.style.display = 'none';
      
      // Ensure popup backdrop is removed
      const backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach(backdrop => backdrop.remove());
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    });
    
    // Also clean up when clicking outside the popup
    popupModal.addEventListener('click', function(e) {
      if (e.target === popupModal) {
        popupModal.style.display = 'none';
        
        // Ensure popup backdrop is removed
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => backdrop.remove());
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      }
    });
  }
});

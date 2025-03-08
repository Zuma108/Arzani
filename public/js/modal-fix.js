document.addEventListener('DOMContentLoaded', function() {
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

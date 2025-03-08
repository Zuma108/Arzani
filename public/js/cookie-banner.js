document.addEventListener('DOMContentLoaded', function() {
  const banner = document.getElementById('cookie-banner');
  if(banner) {
    // Add click listeners to both reject and accept buttons
    const buttons = banner.querySelectorAll('.reject-btn, .accept-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', function() {
        banner.style.display = 'none';
      });
    });
  }
});

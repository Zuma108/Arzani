// ...existing code...

function preloadImportantImages() {
  // Preload first image of visible cards
  document.querySelectorAll('.carousel-item.active img').forEach(img => {
    if (!img.src && img.dataset.src) {
      const preloadLink = document.createElement('link');
      preloadLink.rel = 'preload';
      preloadLink.as = 'image';
      preloadLink.href = img.dataset.src;
      document.head.appendChild(preloadLink);
    }
  });
}

// Call this after rendering businesses
preloadImportantImages();

// ...existing code...

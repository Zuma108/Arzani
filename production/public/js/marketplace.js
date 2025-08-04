// ...existing code...

function preloadImportantImages() {
  // Preload first image of visible cards
  document.querySelectorAll('.carousel-item.active img').forEach(img => {
    if (!img.src && img.dataset.src) {
      const preloadLink = document.createElement('link');
      preloadLink.rel = 'preload';
      preloadLink.as = 'image';
      
      // Handle S3 URLs correctly
      let imageUrl = img.dataset.src;
      if (imageUrl.includes('s3.eu-north-1.amazonaws.com')) {
        // Replace north-1 with west-2 if needed
        imageUrl = imageUrl.replace('s3.eu-north-1.amazonaws.com', 's3.eu-west-2.amazonaws.com');
      }
      
      preloadLink.href = imageUrl;
      document.head.appendChild(preloadLink);
    }
  });
}

// Call this after rendering businesses
preloadImportantImages();

// ...existing code...

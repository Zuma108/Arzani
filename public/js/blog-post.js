/**
 * Blog Post JavaScript Functionality
 * Handles enhanced navbar scroll effects, mobile menu, reading progress, 
 * table of contents, and interactive elements
 */

class BlogPostController {
    constructor() {
        this.navbar = document.getElementById('navbar');
        this.readingProgress = document.getElementById('readingProgress');
        this.mobileMenuToggle = document.getElementById('mobileMenuToggle');
        this.mobileMenu = document.getElementById('mobileMenu');
        this.mainArticle = document.querySelector('article');
        
        this.init();
    }
    
    init() {
        this.setupNavbarScrollEffects();
        this.setupMobileMenu();
        this.setupReadingProgress();
        this.setupTableOfContents();
        this.setupInteractiveButtons();
        this.setupSmoothScrolling();
        this.setupLazyLoading();
        this.setupKeyboardNavigation();
        this.setupDropdownMenus();
    }
    
    // Enhanced navbar scroll effects
    setupNavbarScrollEffects() {
        let ticking = false;
        
        const updateNavbar = () => {
            const scrollTop = window.pageYOffset;
            const isScrolled = scrollTop > 50;
            
            if (this.navbar) {
                this.navbar.classList.toggle('scrolled', isScrolled);
                
                // Add enhanced blur and shadow effects
                if (isScrolled) {
                    this.navbar.style.background = 'rgba(255, 255, 255, 0.98)';
                    this.navbar.style.boxShadow = '0 4px 32px rgba(0, 0, 0, 0.08)';
                    this.navbar.style.backdropFilter = 'blur(24px)';
                } else {
                    this.navbar.style.background = 'rgba(255, 255, 255, 0.95)';
                    this.navbar.style.boxShadow = 'none';
                    this.navbar.style.backdropFilter = 'blur(20px)';
                }
            }
            
            ticking = false;
        };
        
        const requestTick = () => {
            if (!ticking) {
                requestAnimationFrame(updateNavbar);
                ticking = true;
            }
        };
        
        window.addEventListener('scroll', requestTick, { passive: true });
        
        // Initial call
        updateNavbar();
    }
    
    // Mobile menu functionality with smooth animations
    setupMobileMenu() {
        if (!this.mobileMenuToggle || !this.mobileMenu) return;
        
        this.mobileMenuToggle.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleMobileMenu();
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.mobileMenu.contains(e.target) && 
                !this.mobileMenuToggle.contains(e.target) && 
                this.mobileMenu.classList.contains('active')) {
                this.closeMobileMenu();
            }
        });
        
        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.mobileMenu.classList.contains('active')) {
                this.closeMobileMenu();
            }
        });
        
        // Handle window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth >= 1024 && this.mobileMenu.classList.contains('active')) {
                this.closeMobileMenu();
            }
        });
    }
    
    toggleMobileMenu() {
        const isActive = this.mobileMenu.classList.contains('active');
        
        if (isActive) {
            this.closeMobileMenu();
        } else {
            this.openMobileMenu();
        }
    }
    
    openMobileMenu() {
        this.mobileMenu.classList.add('active');
        this.mobileMenuToggle.setAttribute('aria-expanded', 'true');
        
        // Animate hamburger to X
        const svg = this.mobileMenuToggle.querySelector('svg');
        if (svg) {
            svg.innerHTML = `
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            `;
        }
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        
        // Add stagger animation to menu items
        const menuItems = this.mobileMenu.querySelectorAll('.mobile-menu-item');
        menuItems.forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'translateY(20px)';
            item.style.transition = 'all 0.3s ease';
            
            setTimeout(() => {
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            }, index * 100 + 200);
        });
    }
    
    closeMobileMenu() {
        this.mobileMenu.classList.remove('active');
        this.mobileMenuToggle.setAttribute('aria-expanded', 'false');
        
        // Animate X back to hamburger
        const svg = this.mobileMenuToggle.querySelector('svg');
        if (svg) {
            svg.innerHTML = `
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            `;
        }
        
        // Restore body scroll
        document.body.style.overflow = '';
        
        // Reset menu items
        const menuItems = this.mobileMenu.querySelectorAll('.mobile-menu-item');
        menuItems.forEach(item => {
            item.style.opacity = '';
            item.style.transform = '';
            item.style.transition = '';
        });
    }
    
    // Reading progress indicator
    setupReadingProgress() {
        if (!this.readingProgress || !this.mainArticle) return;
        
        let ticking = false;
        
        const updateProgress = () => {
            const scrollTop = window.pageYOffset;
            const docHeight = document.body.offsetHeight;
            const winHeight = window.innerHeight;
            const scrollPercent = Math.min(scrollTop / (docHeight - winHeight), 1);
            const scrollPercentRounded = Math.round(scrollPercent * 100);
            
            this.readingProgress.style.width = `${scrollPercentRounded}%`;
            
            // Add color transition based on progress
            const hue = Math.round(scrollPercent * 60); // From blue (240) to green (300)
            this.readingProgress.style.background = `linear-gradient(90deg, hsl(${240 - hue}, 70%, 60%), hsl(${220 - hue}, 70%, 70%))`;
            
            ticking = false;
        };
        
        const requestTick = () => {
            if (!ticking) {
                requestAnimationFrame(updateProgress);
                ticking = true;
            }
        };
        
        window.addEventListener('scroll', requestTick, { passive: true });
    }
    
    // Table of contents functionality
    setupTableOfContents() {
        const tocContainer = document.querySelector('.table-of-contents');
        const tableOfContents = document.getElementById('tableOfContents');
        const emptyToc = document.getElementById('emptyToc');
        
        if (!tocContainer || !tableOfContents) return;
        
        const articleContent = this.mainArticle?.querySelector('.prose') || document.querySelector('.blog-content');
        
        if (articleContent) {
            const headings = articleContent.querySelectorAll('h2, h3, h4');
            
            if (headings.length > 0) {
                // Clear existing TOC
                tableOfContents.innerHTML = '';
                
                headings.forEach((heading, index) => {
                    // Generate unique ID if not present
                    if (!heading.id) {
                        heading.id = `heading-${index}-${heading.textContent.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
                    }
                    
                    const listItem = document.createElement('li');
                    const link = document.createElement('a');
                    
                    link.href = `#${heading.id}`;
                    link.textContent = heading.textContent;
                    link.className = `toc-link toc-${heading.tagName.toLowerCase()} block py-2 px-3 text-sm text-gray-600 hover:text-primary hover:bg-primary/5 rounded-lg transition-all duration-200`;
                    
                    // Add indentation for different heading levels
                    if (heading.tagName === 'H3') {
                        link.style.paddingLeft = '1.5rem';
                    } else if (heading.tagName === 'H4') {
                        link.style.paddingLeft = '2rem';
                    }
                    
                    listItem.appendChild(link);
                    tableOfContents.appendChild(listItem);
                    
                    // Enhanced smooth scrolling with offset
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.smoothScrollToElement(heading);
                        
                        // Update active TOC item
                        this.updateActiveTocItem(link);
                        
                        // Focus management for accessibility
                        heading.setAttribute('tabindex', '-1');
                        heading.focus();
                        
                        // Remove tabindex after focus to restore natural tab order
                        setTimeout(() => {
                            heading.removeAttribute('tabindex');
                        }, 100);
                    });
                    
                    // Make headings focusable for keyboard navigation
                    heading.setAttribute('tabindex', '0');
                });
                
                // Setup intersection observer for active TOC highlighting
                this.setupTocIntersectionObserver();
                
                if (emptyToc) {
                    emptyToc.classList.add('hidden');
                }
            } else if (emptyToc) {
                tableOfContents.classList.add('hidden');
                emptyToc.classList.remove('hidden');
            }
        } else if (tocContainer) {
            tocContainer.classList.add('hidden');
        }
    }
    
    // TOC intersection observer for active highlighting
    setupTocIntersectionObserver() {
        const headings = document.querySelectorAll('h2, h3, h4');
        const tocLinks = document.querySelectorAll('.toc-link');
        
        if (headings.length === 0 || tocLinks.length === 0) return;
        
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const headingId = entry.target.id;
                        const activeLink = document.querySelector(`.toc-link[href="#${headingId}"]`);
                        
                        if (activeLink) {
                            this.updateActiveTocItem(activeLink);
                        }
                    }
                });
            },
            {
                rootMargin: '-100px 0px -80% 0px',
                threshold: 0
            }
        );
        
        headings.forEach(heading => observer.observe(heading));
    }
    
    updateActiveTocItem(activeLink) {
        // Remove active class from all TOC links
        document.querySelectorAll('.toc-link').forEach(link => {
            link.classList.remove('text-primary', 'bg-primary/10', 'font-medium');
            link.classList.add('text-gray-600');
        });
        
        // Add active class to current link
        if (activeLink) {
            activeLink.classList.remove('text-gray-600');
            activeLink.classList.add('text-primary', 'bg-primary/10', 'font-medium');
        }
    }
    
    // Interactive buttons (like, bookmark, share)
    setupInteractiveButtons() {
        this.setupLikeButton();
        this.setupBookmarkButton();
        this.setupShareButton();
        this.setupCommentForm();
    }
    
    setupLikeButton() {
        const likeButton = document.getElementById('likeButton');
        const likeCount = document.getElementById('likeCount');
        
        if (!likeButton || !likeCount) return;
        
        likeButton.addEventListener('click', (e) => {
            e.preventDefault();
            
            const currentCount = parseInt(likeCount.textContent) || 0;
            const isLiked = likeButton.classList.contains('liked');
            
            // Optimistic UI update
            if (isLiked) {
                likeCount.textContent = Math.max(0, currentCount - 1);
                likeButton.classList.remove('liked');
                likeButton.style.background = 'white';
                likeButton.style.color = '#374151';
            } else {
                likeCount.textContent = currentCount + 1;
                likeButton.classList.add('liked');
                likeButton.style.background = 'linear-gradient(135deg, #EF4444, #DC2626)';
                likeButton.style.color = 'white';
            }
            
            // Pulse animation
            this.addPulseAnimation(likeButton);
            
            // Here you would typically make an API call to persist the like
            // this.updateLikeOnServer(!isLiked);
        });
    }
    
    setupBookmarkButton() {
        const bookmarkButton = document.getElementById('bookmarkButton');
        const bookmarkCount = document.getElementById('bookmarkCount');
        
        if (!bookmarkButton || !bookmarkCount) return;
        
        bookmarkButton.addEventListener('click', (e) => {
            e.preventDefault();
            
            const currentCount = parseInt(bookmarkCount.textContent) || 0;
            const isBookmarked = bookmarkButton.classList.contains('bookmarked');
            
            // Optimistic UI update
            if (isBookmarked) {
                bookmarkCount.textContent = Math.max(0, currentCount - 1);
                bookmarkButton.classList.remove('bookmarked');
                bookmarkButton.style.background = 'white';
                bookmarkButton.style.color = '#374151';
            } else {
                bookmarkCount.textContent = currentCount + 1;
                bookmarkButton.classList.add('bookmarked');
                bookmarkButton.style.background = 'linear-gradient(135deg, #F59E0B, #D97706)';
                bookmarkButton.style.color = 'white';
            }
            
            // Bounce animation
            this.addBounceAnimation(bookmarkButton);
            
            // Here you would typically make an API call to persist the bookmark
            // this.updateBookmarkOnServer(!isBookmarked);
        });
    }
    
    setupShareButton() {
        const shareButton = document.getElementById('shareButton');
        
        if (!shareButton) return;
        
        shareButton.addEventListener('click', async (e) => {
            e.preventDefault();
            
            const shareData = {
                title: document.title,
                text: document.querySelector('meta[name="description"]')?.content || '',
                url: window.location.href
            };
            
            try {
                if (navigator.share) {
                    await navigator.share(shareData);
                } else {
                    // Fallback: Copy to clipboard
                    await navigator.clipboard.writeText(window.location.href);
                    this.showShareFeedback('Link copied to clipboard!');
                }
            } catch (error) {
                console.log('Sharing failed:', error);
                // Fallback: Copy to clipboard
                try {
                    await navigator.clipboard.writeText(window.location.href);
                    this.showShareFeedback('Link copied to clipboard!');
                } catch (clipboardError) {
                    this.showShareFeedback('Unable to share. Please copy the URL manually.');
                }
            }
        });
    }
    
    setupCommentForm() {
        const commentForm = document.getElementById('commentForm');
        
        if (!commentForm) return;
        
        commentForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const formData = new FormData(commentForm);
            const commentData = Object.fromEntries(formData);
            
            // Add loading state
            const submitButton = commentForm.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.textContent = 'Posting...';
            submitButton.disabled = true;
            
            // Here you would typically make an API call to submit the comment
            // For now, we'll simulate a successful submission
            setTimeout(() => {
                this.showCommentSuccess();
                commentForm.reset();
                submitButton.textContent = originalText;
                submitButton.disabled = false;
            }, 1000);
        });
    }
    
    // Smooth scrolling functionality
    setupSmoothScrolling() {
        // Enhanced smooth scrolling for all anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                
                const targetId = anchor.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);
                
                if (targetElement) {
                    this.smoothScrollToElement(targetElement);
                }
            });
        });
    }
    
    smoothScrollToElement(element, offset = 100) {
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - offset;
        
        // Check for reduced motion preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        window.scrollTo({
            top: offsetPosition,
            behavior: prefersReducedMotion ? 'auto' : 'smooth'
        });
    }
    
    // Enhanced lazy loading for images
    setupLazyLoading() {
        const images = document.querySelectorAll('.prose img, .blog-content img');
        
        if (!images.length) return;
        
        const imageObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        
                        // Add loading class
                        img.classList.add('loading');
                        
                        // Handle image load/error
                        img.addEventListener('load', () => {
                            img.classList.remove('loading');
                            img.classList.add('loaded');
                        });
                        
                        img.addEventListener('error', () => {
                            img.src = 'https://arzani-images1.s3.eu-west-2.amazonaws.com/blogs/default-blog-hero.jpg';
                            img.alt = 'Image could not be loaded';
                            img.classList.add('error');
                        });
                        
                        // Set up image attributes
                        img.setAttribute('loading', 'lazy');
                        if (!img.alt) {
                            img.alt = 'Blog image';
                        }
                        
                        // Stop observing this image
                        imageObserver.unobserve(img);
                    }
                });
            },
            {
                rootMargin: '100px'
            }
        );
        
        images.forEach(img => {
            // Set up CSS for smooth transitions
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.style.display = 'block';
            img.style.margin = '1.5rem auto';
            img.style.borderRadius = '0.5rem';
            img.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            
            imageObserver.observe(img);
        });
    }
    
    // Keyboard navigation support
    setupKeyboardNavigation() {
        // Enhanced keyboard navigation for interactive elements
        document.addEventListener('keydown', (e) => {
            // ESC key closes mobile menu
            if (e.key === 'Escape' && this.mobileMenu?.classList.contains('active')) {
                this.closeMobileMenu();
                this.mobileMenuToggle.focus();
            }
            
            // Arrow keys for TOC navigation
            if (e.target.classList.contains('toc-link')) {
                const tocLinks = Array.from(document.querySelectorAll('.toc-link'));
                const currentIndex = tocLinks.indexOf(e.target);
                
                if (e.key === 'ArrowDown' && currentIndex < tocLinks.length - 1) {
                    e.preventDefault();
                    tocLinks[currentIndex + 1].focus();
                } else if (e.key === 'ArrowUp' && currentIndex > 0) {
                    e.preventDefault();
                    tocLinks[currentIndex - 1].focus();
                } else if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.target.click();
                }
            }
        });
    }
    
    // Dropdown menu functionality
    setupDropdownMenus() {
        const dropdowns = document.querySelectorAll('.dropdown');
        
        dropdowns.forEach(dropdown => {
            const button = dropdown.querySelector('button');
            const menu = dropdown.querySelector('.dropdown-menu');
            const arrow = button?.querySelector('svg');
            
            if (!button || !menu) return;
            
            // Click to toggle
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleDropdown(dropdown, menu, arrow);
            });
            
            // Close on outside click
            document.addEventListener('click', (e) => {
                if (!dropdown.contains(e.target)) {
                    this.closeDropdown(menu, arrow);
                }
            });
            
            // Keyboard navigation
            button.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.toggleDropdown(dropdown, menu, arrow);
                } else if (e.key === 'Escape') {
                    this.closeDropdown(menu, arrow);
                    button.focus();
                }
            });
        });
    }
    
    toggleDropdown(dropdown, menu, arrow) {
        const isOpen = menu.style.opacity === '1';
        
        if (isOpen) {
            this.closeDropdown(menu, arrow);
        } else {
            this.openDropdown(menu, arrow);
        }
    }
    
    openDropdown(menu, arrow) {
        menu.style.opacity = '1';
        menu.style.visibility = 'visible';
        menu.style.transform = 'translateY(0)';
        
        if (arrow) {
            arrow.style.transform = 'rotate(180deg)';
        }
    }
    
    closeDropdown(menu, arrow) {
        menu.style.opacity = '0';
        menu.style.visibility = 'hidden';
        menu.style.transform = 'translateY(-10px)';
        
        if (arrow) {
            arrow.style.transform = 'rotate(0deg)';
        }
    }
    
    // Utility animation methods
    addPulseAnimation(element) {
        element.style.transform = 'scale(0.95)';
        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 150);
    }
    
    addBounceAnimation(element) {
        element.style.transform = 'scale(1.1)';
        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 200);
    }
    
    showShareFeedback(message) {
        // Create temporary feedback element
        const feedback = document.createElement('div');
        feedback.textContent = message;
        feedback.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-all duration-300';
        feedback.style.opacity = '0';
        feedback.style.transform = 'translateY(-20px)';
        
        document.body.appendChild(feedback);
        
        // Animate in
        requestAnimationFrame(() => {
            feedback.style.opacity = '1';
            feedback.style.transform = 'translateY(0)';
        });
        
        // Remove after 3 seconds
        setTimeout(() => {
            feedback.style.opacity = '0';
            feedback.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                document.body.removeChild(feedback);
            }, 300);
        }, 3000);
    }
    
    showCommentSuccess() {
        this.showShareFeedback('Comment posted successfully!');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.blogPostController = new BlogPostController();
});

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BlogPostController;
}

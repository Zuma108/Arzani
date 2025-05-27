// Github-style animation effects for the marketplace - Enhanced Version
document.addEventListener('DOMContentLoaded', function() {
    // Mark animation system as initialized to prevent duplicate animations
    window.githubAnimationsInitialized = true;
    
    // Initialize the particle system
    initParticleSystem();
    
    // Add floating animation to journey steps
    enhanceJourneyAnimations();
    
    // Set up interaction observers for performant animations
    setupIntersectionObservers();
});

// Create and initialize the particle system
function initParticleSystem() {
    const journeySteps = document.querySelectorAll('.journey-step-visual.glow-effect');
    
    journeySteps.forEach((step, index) => {
        // Create a particle container for each step
        const particleContainer = document.createElement('div');
        particleContainer.className = 'github-particle-container';
        step.appendChild(particleContainer);
        
        // Determine which step this is for specialized particles
        const stepNumber = index + 1;
        const isCreateStep = step.closest('.journey-step')?.querySelector('.step-title')?.textContent === 'Create';
        const isEvaluateStep = step.closest('.journey-step')?.querySelector('.step-title')?.textContent === 'Evaluate';
        
        // Add particles with different shapes based on the step
        const particleCount = isCreateStep || isEvaluateStep ? 30 : 20;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            
            // Set appropriate class based on step type
            if (isCreateStep) {
                particle.className = 'github-particle star-particle';
            } else if (isEvaluateStep) {
                particle.className = i % 3 === 0 ? 'github-particle code-particle' : 'github-particle';
                
                // Add code symbol for code particles
                if (i % 3 === 0) {
                    const codeSymbol = document.createElement('span');
                    codeSymbol.textContent = ['<>', '{ }', '[ ]', '( )', '// '][Math.floor(Math.random() * 5)];
                    particle.appendChild(codeSymbol);
                }
            } else {
                particle.className = 'github-particle';
            }
            
            // Randomize particle properties with more variety
            const size = Math.random() * 6 + 2;
            const posX = Math.random() * 100;
            const posY = Math.random() * 100;
            const duration = Math.random() * 25 + 15; // Longer durations
            const delay = Math.random() * 12;
            
            // Set particle style with more dynamic properties
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${posX}%`;
            particle.style.top = `${posY}%`;
            particle.style.animationDuration = `${duration}s`;
            particle.style.animationDelay = `${delay}s`;
            particle.style.opacity = Math.random() * 0.6 + 0.2;
            
            // Add rotation for more dynamic motion
            particle.style.setProperty('--rotation', `${Math.random() * 360}deg`);
            particle.style.setProperty('--rotation-end', `${Math.random() * 720 - 360}deg`);
            
            // Add to container
            particleContainer.appendChild(particle);
        }
        
        // Create the main glow effect container
        const glowContainer = document.createElement('div');
        glowContainer.className = 'github-glow-container';
        step.appendChild(glowContainer);
        
        // Add primary glow blob with custom colors based on step
        const primaryGlow = document.createElement('div');
        primaryGlow.className = 'github-primary-glow';
        
        // Set custom colors based on the step
        if (isCreateStep) {
            primaryGlow.classList.add('create-glow');
        } else if (isEvaluateStep) {
            primaryGlow.classList.add('evaluate-glow');
        }
        
        glowContainer.appendChild(primaryGlow);
        
        // Add secondary glow blobs with more variety
        for (let i = 0; i < 4; i++) {
            const secondaryGlow = document.createElement('div');
            secondaryGlow.className = 'github-secondary-glow';
            
            // More varied positioning
            secondaryGlow.style.left = `${Math.random() * 70 + 15}%`;
            secondaryGlow.style.top = `${Math.random() * 70 + 15}%`;
            secondaryGlow.style.animationDelay = `${Math.random() * 5}s`;
            
            // Different sizes for secondary glows
            const scale = 0.6 + Math.random() * 0.8;
            secondaryGlow.style.transform = `scale(${scale})`;
            
            // Add specific classes for different steps
            if (isCreateStep) {
                secondaryGlow.classList.add('create-secondary');
            } else if (isEvaluateStep) {
                secondaryGlow.classList.add('evaluate-secondary');
            }
            
            glowContainer.appendChild(secondaryGlow);
        }
    });
}

// Enhance the journey animations with GitHub-like effects
function enhanceJourneyAnimations() {
    const journeyVisuals = document.querySelectorAll('.journey-step-visual.glow-effect');
    
    journeyVisuals.forEach((visual, index) => {
        // Determine which step this is for specialized animations
        const isCreateStep = visual.closest('.journey-step')?.querySelector('.step-title')?.textContent === 'Create';
        const isEvaluateStep = visual.closest('.journey-step')?.querySelector('.step-title')?.textContent === 'Evaluate';
        
        // Add special float animation that mimics GitHub's landing page
        visual.classList.add('github-float-animation');
        
        // Add custom classes for specific steps
        if (isCreateStep) {
            visual.classList.add('create-step-animation');
        } else if (isEvaluateStep) {
            visual.classList.add('evaluate-step-animation');
        }
        
        // Set unique animation delays for staggered effect
        visual.style.setProperty('--float-delay', `${index * 0.3}s`);
        
        // Add more advanced interactive hover effects
        visual.addEventListener('mouseenter', () => {
            visual.classList.add('github-hover-active');
            
            // Add particle burst effect on hover
            createParticleBurst(visual, isCreateStep, isEvaluateStep);
            
            // Add subtle tilt effect on hover using mouse position
            let timeout;
            const handleMouseMove = (e) => {
                // Clear existing timeout to prevent excessive updates
                clearTimeout(timeout);
                
                // Set timeout for performance
                timeout = setTimeout(() => {
                    const rect = visual.getBoundingClientRect();
                    const x = e.clientX - rect.left; // x position within the element
                    const y = e.clientY - rect.top;  // y position within the element
                    
                    // Calculate tilt based on mouse position relative to center
                    const tiltX = ((y / rect.height) - 0.5) * 4; // Max 2 degree tilt
                    const tiltY = ((x / rect.width) - 0.5) * -4;
                    
                    // Apply the tilt effect
                    visual.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateZ(0) scale(1.03)`;
                }, 10);
            };
            
            // Add mousemove listener
            visual.addEventListener('mousemove', handleMouseMove);
            
            // Store the handler to remove it later
            visual._tiltHandler = handleMouseMove;
        });
        
        visual.addEventListener('mouseleave', () => {
            visual.classList.remove('github-hover-active');
            
            // Remove the tilt effect and return to normal state
            visual.style.transform = '';
            
            // Remove the mousemove listener
            if (visual._tiltHandler) {
                visual.removeEventListener('mousemove', visual._tiltHandler);
                delete visual._tiltHandler;
            }
        });
    });
}

// Create a burst of particles when hovering over elements
function createParticleBurst(element, isCreateStep, isEvaluateStep) {
    // Get element dimensions and position
    const rect = element.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Create burst container if it doesn't exist
    let burstContainer = element.querySelector('.particle-burst-container');
    if (!burstContainer) {
        burstContainer = document.createElement('div');
        burstContainer.className = 'particle-burst-container';
        element.appendChild(burstContainer);
    }
    
    // Clear previous particles
    burstContainer.innerHTML = '';
    
    // Determine particle type based on step
    const particleCount = isCreateStep || isEvaluateStep ? 20 : 12;
    
    // Create new particles
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        
        // Set appropriate class based on step type
        if (isCreateStep) {
            particle.className = 'burst-particle star-burst';
            
            // Create star shape for create step
            if (Math.random() > 0.5) {
                const starSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                starSVG.setAttribute("viewBox", "0 0 24 24");
                starSVG.setAttribute("width", "100%");
                starSVG.setAttribute("height", "100%");
                
                const starPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
                starPath.setAttribute("d", "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z");
                starPath.setAttribute("fill", "#34D399");
                
                starSVG.appendChild(starPath);
                particle.appendChild(starSVG);
            }
        } else if (isEvaluateStep) {
            particle.className = 'burst-particle code-burst';
            
            // Add code symbols for evaluate step
            if (Math.random() > 0.5) {
                const codeSymbol = document.createElement('span');
                codeSymbol.textContent = ['<>', '{ }', '[]', '()', '//'][Math.floor(Math.random() * 5)];
                codeSymbol.style.color = '#F472B6';
                particle.appendChild(codeSymbol);
            }
        } else {
            particle.className = 'burst-particle';
        }
        
        // Calculate random direction with more variety
        const angle = Math.random() * Math.PI * 2;
        const distance = 30 + Math.random() * 80; // Increased distance range
        const size = Math.random() * 6 + 3; // Slightly larger particles
        
        // Set styles for the particle
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${centerX}px`;
        particle.style.top = `${centerY}px`;
        
        // Set animation properties with more variety
        particle.style.setProperty('--angle', angle);
        particle.style.setProperty('--distance', `${distance}px`);
        particle.style.animationDuration = `${0.7 + Math.random() * 1.3}s`;
        
        // Set custom colors based on step
        if (isCreateStep) {
            particle.style.backgroundColor = `rgba(${52 + Math.random() * 30}, ${211 + Math.random() * 30}, ${153 + Math.random() * 30}, ${0.7 + Math.random() * 0.3})`;
        } else if (isEvaluateStep) {
            particle.style.backgroundColor = `rgba(${192 + Math.random() * 30}, ${38 + Math.random() * 30}, ${211 + Math.random() * 30}, ${0.7 + Math.random() * 0.3})`;        }
        
        burstContainer.appendChild(particle);
    }
}

// Set up intersection observers for performance
function setupIntersectionObservers() {
    // Create an observer for journey steps
    const journeyObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            // Get the visual element within the journey step
            const visual = entry.target.querySelector('.journey-step-visual.glow-effect');
            
            if (!visual) return;
            
            // If element is in view, add active class; otherwise, remove it
            if (entry.isIntersecting) {
                visual.classList.add('github-animation-active');
                
                // Add a staggered delay to particles for a more dynamic effect
                const particles = visual.querySelectorAll('.github-particle');
                particles.forEach((particle, index) => {
                    particle.style.animationPlayState = 'running';
                    particle.style.animationDelay = `${(index * 0.1) % 5}s`;
                });
                
                // Animate glow elements
                const glowElements = visual.querySelectorAll('.github-primary-glow, .github-secondary-glow');
                glowElements.forEach((glow, index) => {
                    glow.style.animationPlayState = 'running';
                });
            } else {
                // Optionally pause animations when out of view for performance
                if (window.githubAnimationPerformanceMode) {
                    visual.classList.remove('github-animation-active');
                    
                    // Pause particles
                    const particles = visual.querySelectorAll('.github-particle');
                    particles.forEach(particle => {
                        particle.style.animationPlayState = 'paused';
                    });
                    
                    // Pause glow elements
                    const glowElements = visual.querySelectorAll('.github-primary-glow, .github-secondary-glow');
                    glowElements.forEach(glow => {
                        glow.style.animationPlayState = 'paused';
                    });
                }
            }
        });
    }, {
        threshold: 0.2, // Start animations when 20% of the element is visible
        rootMargin: '0px 0px -10% 0px' // Slightly before element enters viewport
    });
    
    // Observe all journey steps
    document.querySelectorAll('.journey-step').forEach(step => {
        journeyObserver.observe(step);
    });
}

// Enable reduced motion if user prefers it
function checkReducedMotion() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.documentElement.classList.add('reduced-motion');
        
        // Apply reduced motion settings
        const particles = document.querySelectorAll('.github-particle');
        particles.forEach(particle => {
            particle.style.animationDuration = '30s'; // Slow down animations
        });
        
        // Reduce the number of particles for performance
        document.querySelectorAll('.github-particle-container').forEach(container => {
            const particles = container.querySelectorAll('.github-particle');
            for (let i = 0; i < particles.length; i++) {
                if (i % 3 !== 0) { // Keep only 1/3 of particles
                    particles[i].style.display = 'none';
                }
            }
        });
    }
}

// Check for reduced motion preference
document.addEventListener('DOMContentLoaded', checkReducedMotion);

// Configure performance mode based on device capability
window.githubAnimationPerformanceMode = false;
if ('deviceMemory' in navigator && navigator.deviceMemory < 4) {
    window.githubAnimationPerformanceMode = true;
}

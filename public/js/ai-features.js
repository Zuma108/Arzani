document.addEventListener('DOMContentLoaded', () => {
    // Initialize animations for elements with data-animation attribute
    const animatedElements = document.querySelectorAll('[data-animation]');
    
    if (animatedElements.length > 0) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    
                    // Skip if already animated
                    if (element.hasAttribute('data-animated')) return;
                    
                    const delay = element.getAttribute('data-delay') || 0;
                    const animation = element.getAttribute('data-animation');
                    
                    setTimeout(() => {
                        // For fade-in-right, ensure we don't re-apply animation if already animated
                        if (animation === 'fade-in-right') {
                            // Add special handling for fade-in-right
                            element.style.opacity = '1';
                            element.style.transform = 'translateX(0)';
                            
                            // Apply the animation class with iteration count 1
                            element.classList.add('animated');
                            
                            // Mark as animated to prevent future animations
                            element.setAttribute('data-animated', 'true');
                        } else {
                            // Standard animation for other types
                            element.classList.add('animated');
                        }
                    }, delay);
                    
                    // Stop observing after animation triggers
                    observer.unobserve(element);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px'
        });
        
        animatedElements.forEach(element => {
            // Skip if already animated
            if (!element.hasAttribute('data-animated')) {
                observer.observe(element);
            }
        });
    }
    
    // Initialize typing animation
    initTypingAnimation();
    
    // Initialize chat message animations
    animateChatMessages();
    
    // Initialize search cursor animation
    initSearchCursorAnimation();
    
    // Initialize chat input functionality
    initChatInput();
    
    // Initialize AI processing indicator
    initProcessingIndicator();

    // Initialize AI insight typing effect
    initAiInsightTyping();
    
    // Animate chart elements
    animateChartElements();
    
    // Initialize suggested questions
    initSuggestedQuestions();
});

function initTypingAnimation() {
    const typingElements = document.querySelectorAll('.typing-text');
    
    typingElements.forEach(element => {
        const textToType = "Buyers typically look for businesses with consistent revenue growth of at least 15% year-over-year, strong profit margins exceeding 20%, and a high percentage of recurring revenue, ideally making up 60% or more of total earnings. They also prioritize companies with low customer concentration, ensuring no single client contributes more than 15% of revenue, and scalable operations with well-documented processes. Additionally, maintaining a minimum of 12% revenue retention growth while keeping customer churn below 3% is essential for long-term sustainability and attractiveness to investors.";
        let displayedText = "";
        let charIndex = 0;
        
        function typeNextChar() {
            if (charIndex < textToType.length) {
                displayedText += textToType.charAt(charIndex);
                element.textContent = displayedText;
                charIndex++;
                
                // Random typing speed for realistic effect
                const typingSpeed = Math.floor(Math.random() * 30) + 20; // 20-50ms
                setTimeout(typeNextChar, typingSpeed);
            }
        }
        
        // Start typing animation with delay
        setTimeout(typeNextChar, 3000);
    });
}

function animateChatMessages() {
    const chatMessages = document.querySelectorAll('.chat-message');
    
    chatMessages.forEach((message, index) => {
        const delay = message.style.animationDelay || `${index * 0.5}s`;
        setTimeout(() => {
            message.style.opacity = 1;
            message.style.transform = 'translateY(0)';
        }, parseFloat(delay) * 1000);
    });
}

function initSearchCursorAnimation() {
    const searchCursor = document.querySelector('.search-cursor');
    if (!searchCursor) return;
    
    // Path points along the chart
    const points = [
        { x: 0, y: 150 },
        { x: 100, y: 120 },
        { x: 200, y: 180 },
        { x: 300, y: 80 },
        { x: 400, y: 20 },
        { x: 500, y: 100 },
        { x: 600, y: 60 },
        { x: 700, y: 90 },
        { x: 800, y: 40 }
    ];
    
    let currentPointIndex = 0;
    let progress = 0;
    
    function animateCursor() {
        if (currentPointIndex >= points.length - 1) {
            // Reset animation
            currentPointIndex = 0;
            progress = 0;
            setTimeout(animateCursor, 2000); // Pause before restarting
            return;
        }
        
        const currentPoint = points[currentPointIndex];
        const nextPoint = points[currentPointIndex + 1];
        
        // Interpolate between points
        const x = currentPoint.x + (nextPoint.x - currentPoint.x) * progress;
        const y = currentPoint.y + (nextPoint.y - currentPoint.y) * progress;
        
        // Apply position
        searchCursor.style.cx = x;
        searchCursor.style.cy = y;
        
        // Update progress
        progress += 0.01;
        
        // Move to next point pair when progress reaches 1
        if (progress >= 1) {
            currentPointIndex++;
            progress = 0;
        }
        
        requestAnimationFrame(animateCursor);
    }
    
    // Start animation after a delay
    setTimeout(() => {
        searchCursor.style.opacity = 1;
        animateCursor();
    }, 2000);
}

function showInsightBox(text) {
    const insightBox = document.querySelector('.ai-insight-box');
    if (!insightBox) return;
    
    const typingTextSpan = insightBox.querySelector('.typing-text');
    const cursorSpan = insightBox.querySelector('.typing-cursor');
    
    if (!typingTextSpan || !cursorSpan) return;
    
    // Clear previous text
    typingTextSpan.textContent = '';
    
    // Make the insight box visible
    insightBox.parentElement.style.opacity = '1';
    
    // Type the text character by character
    let charIndex = 0;
    function typeChar() {
        if (charIndex < text.length) {
            typingTextSpan.textContent += text.charAt(charIndex);
            charIndex++;
            setTimeout(typeChar, Math.random() * 30 + 20); // Random typing speed
        }
    }
    
    // Start typing
    typeChar();
}

function initChatInput() {
    const inputField = document.querySelector('input[placeholder="Ask Arzani AI a question..."]');
    const sendButton = inputField ? inputField.nextElementSibling : null;
    const chatContainer = document.querySelector('.chat-container');
    
    if (!inputField || !sendButton || !chatContainer) return;
    
    // Function to send a message
    function sendMessage() {
        const messageText = inputField.value.trim();
        if (!messageText) return;
        
        // Clear input
        inputField.value = '';
        
        // Add user message to chat
        const userMessage = document.createElement('div');
        userMessage.className = 'chat-message flex gap-4 mb-4';
        userMessage.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0"></div>
            <div class="bg-gray-800 rounded-lg rounded-tl-none p-3 max-w-[80%]">
                <p class="text-gray-200">${messageText}</p>
            </div>
        `;
        chatContainer.appendChild(userMessage);
        
        // Show processing indicator
        document.querySelector('.ai-processing-indicator').style.opacity = '1';
        
        // Scroll to bottom
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
        // Simulate AI response after delay
        setTimeout(() => {
            // Hide processing indicator
            document.querySelector('.ai-processing-indicator').style.opacity = '0';
            
            // Simple AI responses based on keywords
            let responseText = '';
            const lowercaseMessage = messageText.toLowerCase();
            
            if (lowercaseMessage.includes('valuation')) {
                responseText = 'Our AI valuation system analyzes over 100 market factors including industry trends, growth rates, profitability metrics, and comparable sales to provide an accurate estimate of business value.';
            } else if (lowercaseMessage.includes('market')) {
                responseText = 'Current market analysis shows a 15% increase in business acquisition activity in the technology sector, while service businesses are seeing more stable valuations with 2.5-3.5x EBITDA multiples.';
            } else if (lowercaseMessage.includes('sell') || lowercaseMessage.includes('selling')) {
                responseText = 'To maximize your selling price, focus on documenting processes, demonstrating consistent growth, reducing customer concentration, and cleaning up financial records at least 2 years before listing.';
            } else {
                responseText = 'I can help with business valuations, market analysis, acquisition strategies, and seller preparation. What specific information are you looking for?';
            }
            
            // Add AI response to chat
            const aiMessage = document.createElement('div');
            aiMessage.className = 'chat-message flex gap-4 justify-end mb-4';
            aiMessage.innerHTML = `
                <div class="bg-primary/20 rounded-lg rounded-tr-none p-3 max-w-[80%]">
                    <p class="text-gray-200">${responseText}</p>
                </div>
                <div class="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex-shrink-0 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                </div>
            `;
            chatContainer.appendChild(aiMessage);
            
            // Scroll to bottom
            chatContainer.scrollTop = chatContainer.scrollHeight;
            
            // Animate the new elements
            userMessage.style.opacity = '0';
            aiMessage.style.opacity = '0';
            userMessage.style.transform = 'translateY(10px)';
            aiMessage.style.transform = 'translateY(10px)';
            
            setTimeout(() => {
                userMessage.style.opacity = '1';
                userMessage.style.transform = 'translateY(0)';
                
                setTimeout(() => {
                    aiMessage.style.opacity = '1';
                    aiMessage.style.transform = 'translateY(0)';
                }, 300);
            }, 100);
        }, 1500);
    }
    
    // Send button click handler
    sendButton.addEventListener('click', sendMessage);
    
    // Enter key handler
    inputField.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
}

function initProcessingIndicator() {
    const indicator = document.querySelector('.ai-processing-indicator');
    if (!indicator) return;
    
    // Initially hide the indicator
    indicator.style.opacity = '0';
}

// Initialize AI insight typing effects
function initAiInsightTyping() {
    const aiInsightBoxes = document.querySelectorAll('.ai-insight-box');
    if (!aiInsightBoxes.length) return;
    
    const insightTexts = [
        "Revenue growth has increased by 24.5% over the last quarter, with strongest gains in the enterprise segment (37.2%).",
        "Market expansion opportunity detected in APAC region with projected 31% growth. Consider allocating resources to this market.",
        "Customer retention improved 4.2% after implementing new onboarding process. Recommend extending to all product lines."
    ];
    
    aiInsightBoxes.forEach((box, index) => {
        const typingText = box.querySelector('.typing-text');
        if (!typingText) return;
        
        const text = insightTexts[index % insightTexts.length];
        let charIndex = 0;
        
        function typeInsight() {
            if (charIndex < text.length) {
                typingText.textContent += text.charAt(charIndex);
                charIndex++;
                setTimeout(typeInsight, Math.random() * 30 + 20);
            }
        }
        
        // Use Intersection Observer to start typing when element is visible
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setTimeout(typeInsight, 1000);
                    observer.disconnect();
                }
            });
        }, { threshold: 0.5 });
        
        observer.observe(box);
    });
}

// Animate chart elements
function animateChartElements() {
    // Animate metric bars with delay
    const metricBars = document.querySelectorAll('.mt-2 .h-full');
    if (metricBars.length) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const bar = entry.target;
                    setTimeout(() => {
                        bar.style.width = bar.style.width || '0%';
                    }, 500);
                }
            });
        }, { threshold: 0.2 });
        
        metricBars.forEach(bar => observer.observe(bar));
    }
}

// Initialize suggested questions functionality
function initSuggestedQuestions() {
    const suggestedButtons = document.querySelectorAll('.mt-3 button');
    const chatInput = document.querySelector('input[placeholder="Ask Arzani AI a question..."]');
    
    if (!suggestedButtons.length || !chatInput) return;
    
    suggestedButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (chatInput) {
                chatInput.value = button.textContent;
                chatInput.focus();
                
                // Optional: simulate sending the message automatically
                /* 
                setTimeout(() => {
                    const sendButton = chatInput.nextElementSibling;
                    if (sendButton) sendButton.click();
                }, 500);
                */
            }
        });
    });
}

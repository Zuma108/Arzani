// Feature Animations with KnowledgeGraphMemory MCP Integration

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the feature animations with MCP integration
    initFeatureAnimations();
});

/**
 * Initializes the feature section animations with knowledge graph memory
 */
function initFeatureAnimations() {
    // Create a knowledge graph for feature relationships and states
    const featureKnowledgeGraph = createKnowledgeGraph();
    
    // Set up the scroll observers for each feature
    setupFeatureScrollObservers(featureKnowledgeGraph);
    
    // Initialize animation sequences
    initializeAnimationSequences(featureKnowledgeGraph);
}

/**
 * Creates a knowledge graph to manage feature states and relationships
 */
function createKnowledgeGraph() {
    // Simple knowledge graph implementation for feature animations
    const graph = {
        nodes: {
            'feature-valuation': {
                id: 'feature-valuation',
                state: 'inactive',
                dependencies: [],
                element: document.querySelector('[data-knowledgegraphmemory="feature-valuation"]'),
                imageElement: document.querySelector('[data-knowledgegraphmemory="feature-valuation"] .feature-image-animate'),
                contentElement: document.querySelector('[data-knowledgegraphmemory="feature-valuation"] .feature-content')
            },
            'feature-growth': {
                id: 'feature-growth',
                state: 'inactive',
                dependencies: ['feature-valuation'],
                element: document.querySelector('[data-knowledgegraphmemory="feature-growth"]'),
                imageElement: document.querySelector('[data-knowledgegraphmemory="feature-growth"] .feature-image-animate'),
                contentElement: document.querySelector('[data-knowledgegraphmemory="feature-growth"] .feature-content')
            },
            'feature-sentiment': {
                id: 'feature-sentiment',
                state: 'inactive',
                dependencies: ['feature-growth'],
                element: document.querySelector('[data-knowledgegraphmemory="feature-sentiment"]'),
                imageElement: document.querySelector('[data-knowledgegraphmemory="feature-sentiment"] .feature-image-animate'),
                contentElement: document.querySelector('[data-knowledgegraphmemory="feature-sentiment"] .feature-content')
            }
        },
        
        // Set a node's state and check dependencies
        setNodeState: function(nodeId, state) {
            if (this.nodes[nodeId]) {
                this.nodes[nodeId].state = state;
                
                // Trigger any dependent animations if activated
                if (state === 'active') {
                    this.activateDependentNodes(nodeId);
                }
                
                return true;
            }
            return false;
        },
        
        // Activate nodes that depend on the given node
        activateDependentNodes: function(nodeId) {
            for (const id in this.nodes) {
                if (this.nodes[id].dependencies.includes(nodeId)) {
                    // Prepare the dependent node for animation
                    this.prepareNodeForAnimation(id);
                }
            }
        },
        
        // Prepare a node for animation when its dependencies are met
        prepareNodeForAnimation: function(nodeId) {
            const node = this.nodes[nodeId];
            if (node) {
                // Check if all dependencies are active
                const dependenciesMet = node.dependencies.every(depId => 
                    this.nodes[depId] && this.nodes[depId].state === 'active'
                );
                
                if (dependenciesMet) {
                    // Apply the 'ready' class to prepare for animation
                    if (node.element) {
                        node.element.classList.add('ready-for-animation');
                    }
                }
            }
        }
    };
    
    return graph;
}

/**
 * Sets up intersection observers for feature elements
 */
function setupFeatureScrollObservers(knowledgeGraph) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const element = entry.target;
                const featureId = element.getAttribute('data-knowledgegraphmemory');
                
                if (featureId && knowledgeGraph.nodes[featureId]) {
                    // Animate the feature
                    animateFeature(featureId, knowledgeGraph);
                    
                    // Mark as active in the knowledge graph
                    knowledgeGraph.setNodeState(featureId, 'active');
                    
                    // Stop observing this element
                    observer.unobserve(element);
                }
            }
        });
    }, {
        threshold: 0.2,
        rootMargin: '-10% 0px'
    });
    
    // Observe each feature element
    for (const id in knowledgeGraph.nodes) {
        const element = knowledgeGraph.nodes[id].element;
        if (element) {
            observer.observe(element);
        }
    }
}

/**
 * Animates a feature element when it comes into view
 */
function animateFeature(featureId, knowledgeGraph) {
    const node = knowledgeGraph.nodes[featureId];
    if (!node) return;
    
    // Add animated class to main container
    node.element.classList.add('animated');
    
    // Animate the image with a pop-up effect
    if (node.imageElement) {
        node.imageElement.classList.add('animate-pop-up');
        
        // Add a small random movement to make it more lively
        const randomX = (Math.random() * 10) - 5; // Random value between -5 and 5
        const randomY = (Math.random() * 10) - 5;
        
        node.imageElement.style.transform = `translate(${randomX}px, ${randomY}px) scale(1.05)`;
        
        // Reset after animation
        setTimeout(() => {
            node.imageElement.style.transform = 'scale(1)';
        }, 1000);
    }
    
    // Animate the content with a fade-in effect
    if (node.contentElement) {
        node.contentElement.classList.add('animate-fade-in');
    }
}

/**
 * Initialize animation sequences for the features
 */
function initializeAnimationSequences(knowledgeGraph) {
    // Add event listeners for hover effects
    for (const id in knowledgeGraph.nodes) {
        const node = knowledgeGraph.nodes[id];
        if (node.element) {
            node.element.addEventListener('mouseenter', () => {
                // Apply hover animations
                if (node.imageElement) {
                    node.imageElement.classList.add('hover-active');
                }
            });
            
            node.element.addEventListener('mouseleave', () => {
                // Remove hover animations
                if (node.imageElement) {
                    node.imageElement.classList.remove('hover-active');
                }
            });
        }
    }
}

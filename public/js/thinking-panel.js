/**
 * Enhanced Thinking Panel JavaScript for Arzani-X
 * Handles progressive disclosure, real-time updates, and MCP integration visualization
 */

// Global thinking panel management
window.ArzaniThinkingPanel = {
  activePanels: new Map(),
  animationTimers: new Map(),
  
  /**
   * Toggle thinking panel collapse/expand state
   * @param {string} panelId - ID of the thinking panel
   */
  toggle: function(panelId) {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    
    const content = panel.querySelector('.thinking-panel-content');
    const toggle = panel.querySelector('.thinking-panel-toggle');
    
    if (panel.classList.contains('collapsed')) {
      // Expand
      panel.classList.remove('collapsed');
      content.style.maxHeight = content.scrollHeight + 'px';
      
      // Auto-adjust after transition
      setTimeout(() => {
        if (!panel.classList.contains('collapsed')) {
          content.style.maxHeight = '500px';
        }
      }, 300);
    } else {
      // Collapse
      content.style.maxHeight = content.scrollHeight + 'px';
      // Force a reflow
      content.offsetHeight;
      content.style.maxHeight = '0px';
      panel.classList.add('collapsed');
    }
  },
  
  /**
   * Create and display a new thinking panel with real-time updates
   * @param {Object} config - Panel configuration
   */
  create: function(config = {}) {
    const {
      agentType = 'orchestrator',
      title = 'AI Thinking',
      containerId = 'messages-container',
      position = 'append' // 'append' or 'prepend'
    } = config;
    
    const panelId = `thinking-panel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const container = document.getElementById(containerId);
    
    if (!container) {
      console.error('Container not found:', containerId);
      return null;
    }
    
    const agentIcons = {
      orchestrator: '🎯',
      legal: '⚖️',
      finance: '💰',
      revenue: '📈'
    };
    
    const panelHtml = `
      <div class="thinking-panel agent-${agentType}" id="${panelId}">
        <div class="thinking-panel-header" onclick="toggleThinkingPanel('${panelId}')">
          <div class="thinking-panel-title">
            <span style="font-size: 16px;">${agentIcons[agentType] || '🤖'}</span>
            <span>${title}</span>
            <div class="thinking-status-indicator searching">processing</div>
          </div>
          <div class="thinking-panel-controls">
            <svg class="thinking-panel-toggle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </div>
        </div>
        <div class="thinking-panel-content">
          <div class="thinking-steps" id="${panelId}-steps"></div>
          <div class="thinking-sources" id="${panelId}-sources" style="display: none;"></div>
          <div class="thinking-memory-section" id="${panelId}-memory" style="display: none;"></div>
        </div>
      </div>`;
    
    if (position === 'prepend') {
      container.insertAdjacentHTML('afterbegin', panelHtml);
    } else {
      container.insertAdjacentHTML('beforeend', panelHtml);
    }
    
    const panel = document.getElementById(panelId);
    if (panel) {
      this.activePanels.set(panelId, {
        element: panel,
        agentType,
        steps: [],
        sources: [],
        memory: {},
        startTime: Date.now()
      });
      
      // Animate panel appearance
      panel.style.opacity = '0';
      panel.style.transform = 'translateY(-12px) scale(0.98)';
      
      setTimeout(() => {
        panel.style.transition = 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
        panel.style.opacity = '1';
        panel.style.transform = 'translateY(0) scale(1)';
      }, 10);
    }
    
    return panelId;
  },
  
  /**
   * Add a thinking step to an active panel with animation
   * @param {string} panelId - Panel ID
   * @param {Object} step - Step data
   */
  addStep: function(panelId, step) {
    const panelData = this.activePanels.get(panelId);
    if (!panelData) return;
    
    const stepsContainer = document.getElementById(`${panelId}-steps`);
    if (!stepsContainer) return;
    
    const stepIndex = panelData.steps.length;
    const stepId = `${panelId}-step-${stepIndex}`;
    
    const stepHtml = `
      <div class="thinking-step" id="${stepId}" style="opacity: 0; transform: translateY(12px);">
        <div class="thinking-step-indicator ${step.status || 'active'}"></div>
        <div class="thinking-step-content">
          <div class="thinking-step-title">${step.title || `Step ${stepIndex + 1}`}</div>
          <div class="thinking-step-detail">${step.detail || step.description || ''}</div>
          ${step.duration ? `<div style="font-size: 11px; color: #64748b; margin-top: 4px;">⏱️ ${step.duration}ms</div>` : ''}
        </div>
      </div>`;
    
    stepsContainer.insertAdjacentHTML('beforeend', stepHtml);
    panelData.steps.push(step);
    
    // Animate step appearance
    const stepElement = document.getElementById(stepId);
    if (stepElement) {
      setTimeout(() => {
        stepElement.style.transition = 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
        stepElement.style.opacity = '1';
        stepElement.style.transform = 'translateY(0)';
      }, stepIndex * 100); // Stagger animation
    }
  },
  
  /**
   * Update step status with visual feedback
   * @param {string} panelId - Panel ID
   * @param {number} stepIndex - Step index
   * @param {string} status - New status ('active', 'completed', 'error')
   */
  updateStepStatus: function(panelId, stepIndex, status) {
    const stepElement = document.getElementById(`${panelId}-step-${stepIndex}`);
    if (!stepElement) return;
    
    const indicator = stepElement.querySelector('.thinking-step-indicator');
    if (indicator) {
      // Remove existing status classes
      indicator.classList.remove('active', 'completed', 'error');
      // Add new status
      indicator.classList.add(status);
    }
    
    const panelData = this.activePanels.get(panelId);
    if (panelData && panelData.steps[stepIndex]) {
      panelData.steps[stepIndex].status = status;
    }
  },
  
  /**
   * Add MCP sources to the panel
   * @param {string} panelId - Panel ID
   * @param {Array} sources - Array of source objects
   */
  addSources: function(panelId, sources) {
    const sourcesContainer = document.getElementById(`${panelId}-sources`);
    if (!sourcesContainer || !sources || sources.length === 0) return;
    
    let sourcesHtml = `
      <div style="font-weight: 500; color: #374151; margin-bottom: 8px; font-size: 13px;">📊 Knowledge Sources</div>
      <div class="thinking-source-grid">`;
    
    sources.forEach(source => {
      const sourceType = source.type || 'unknown';
      const iconClass = sourceType.toLowerCase().includes('pinecone') ? 'pinecone' : 
                       sourceType.toLowerCase().includes('brave') ? 'brave' : 'unknown';
      
      sourcesHtml += `
        <div class="thinking-source-item" title="${source.description || source.type}">
          <div class="thinking-source-header">
            <div class="thinking-source-icon ${iconClass}">
              ${iconClass === 'pinecone' ? 'P' : iconClass === 'brave' ? 'B' : '?'}
            </div>
            <div class="thinking-source-name">${source.name || source.type}</div>
            ${source.confidence ? `<div class="thinking-source-confidence">${Math.round(source.confidence * 100)}%</div>` : ''}
          </div>
          <div class="thinking-source-meta">
            ${source.resultsCount ? `${source.resultsCount} results` : ''}
            ${source.responseTime ? ` • ${source.responseTime}ms` : ''}
          </div>
        </div>`;
    });
    
    sourcesHtml += '</div>';
    sourcesContainer.innerHTML = sourcesHtml;
    sourcesContainer.style.display = 'block';
    
    // Animate sources appearance
    const sourceItems = sourcesContainer.querySelectorAll('.thinking-source-item');
    sourceItems.forEach((item, index) => {
      item.style.opacity = '0';
      item.style.transform = 'translateY(8px)';
      setTimeout(() => {
        item.style.transition = 'all 0.4s ease';
        item.style.opacity = '1';
        item.style.transform = 'translateY(0)';
      }, index * 50);
    });
  },
  
  /**
   * Complete the thinking panel and update final status
   * @param {string} panelId - Panel ID
   * @param {Object} finalData - Final thinking data
   */
  complete: function(panelId, finalData = {}) {
    const panelData = this.activePanels.get(panelId);
    if (!panelData) return;
    
    const panel = panelData.element;
    const statusIndicator = panel.querySelector('.thinking-status-indicator');
    
    if (statusIndicator) {
      statusIndicator.classList.remove('searching', 'retrieving');
      statusIndicator.classList.add('completed');
      statusIndicator.textContent = 'completed';
    }
    
    // Update confidence if provided
    if (finalData.confidence) {
      const existingBadge = panel.querySelector('.thinking-panel-badge');
      if (existingBadge) {
        existingBadge.textContent = `${Math.round(finalData.confidence * 100)}% confidence`;
      } else {
        const titleDiv = panel.querySelector('.thinking-panel-title');
        const badge = document.createElement('div');
        badge.className = 'thinking-panel-badge';
        badge.textContent = `${Math.round(finalData.confidence * 100)}% confidence`;
        titleDiv.appendChild(badge);
      }
    }
    
    // Add memory insights if provided
    if (finalData.memory && (finalData.memory.patterns || finalData.memory.insights)) {
      this.addMemoryInsights(panelId, finalData.memory);
    }
    
    // Update final step statuses
    panelData.steps.forEach((step, index) => {
      if (step.status === 'active') {
        this.updateStepStatus(panelId, index, 'completed');
      }
    });
  },
  
  /**
   * Add memory insights to the panel
   * @param {string} panelId - Panel ID
   * @param {Object} memory - Memory data
   */
  addMemoryInsights: function(panelId, memory) {
    const memoryContainer = document.getElementById(`${panelId}-memory`);
    if (!memoryContainer) return;
    
    let memoryHtml = `
      <div class="thinking-memory-header">
        <span style="font-size: 12px;">🧠</span>
        <span>Memory Insights</span>
      </div>
      <div class="thinking-memory-items">`;
    
    if (memory.patterns) {
      memory.patterns.forEach(pattern => {
        memoryHtml += `<div class="thinking-memory-item" title="Pattern: ${pattern.description || ''}">${pattern.name || pattern}</div>`;
      });
    }
    
    if (memory.insights) {
      memory.insights.forEach(insight => {
        memoryHtml += `<div class="thinking-memory-item" title="Insight: ${insight.description || ''}">${insight.name || insight}</div>`;
      });
    }
    
    memoryHtml += '</div>';
    memoryContainer.innerHTML = memoryHtml;
    memoryContainer.style.display = 'block';
  },
  
  /**
   * Remove a thinking panel with animation
   * @param {string} panelId - Panel ID
   */
  remove: function(panelId) {
    const panelData = this.activePanels.get(panelId);
    if (!panelData) return;
    
    const panel = panelData.element;
    panel.classList.add('removing');
    
    setTimeout(() => {
      if (panel.parentNode) {
        panel.parentNode.removeChild(panel);
      }
      this.activePanels.delete(panelId);
    }, 400); // Match CSS animation duration
  }
};

// Global function for onclick handlers
function toggleThinkingPanel(panelId) {
  window.ArzaniThinkingPanel.toggle(panelId);
}

// Auto-collapse thinking panels after 30 seconds of inactivity
setInterval(() => {
  window.ArzaniThinkingPanel.activePanels.forEach((panelData, panelId) => {
    const panel = panelData.element;
    const age = Date.now() - panelData.startTime;
    
    // Auto-collapse after 30 seconds if not manually interacted with
    if (age > 30000 && !panel.classList.contains('collapsed') && !panel.dataset.userInteracted) {
      window.ArzaniThinkingPanel.toggle(panelId);
    }
  });
}, 5000);

// Track user interactions to prevent auto-collapse
document.addEventListener('click', (e) => {
  const thinkingPanel = e.target.closest('.thinking-panel');
  if (thinkingPanel) {
    thinkingPanel.dataset.userInteracted = 'true';
  }
});

console.log('🎯 Enhanced Thinking Panel system initialized');

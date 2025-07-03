/**
 * Sequential Agent UI Manager
 * Handles the visual representation of sequential agent delegation
 * with step-by-step indicators and progress tracking
 */

class SequentialAgentUI {
  constructor(containerId = 'chatMessages') {
    this.container = document.getElementById(containerId);
    this.activeSequences = new Map();
    this.agentColors = {
      broker: { primary: '#3B82F6', secondary: '#60A5FA' },
      legal: { primary: '#10B981', secondary: '#34D399' },
      finance: { primary: '#F59E0B', secondary: '#FBBF24' },
      generalist: { primary: '#8B5CF6', secondary: '#A78BFA' }
    };
    this.agentNames = {
      broker: 'Broker Agent',
      legal: 'Legal Agent',
      finance: 'Finance Agent',
      generalist: 'Generalist Agent'
    };
  }

  /**
   * Initialize a new agent consultation sequence
   * @param {object} sequenceData - Initial sequence data
   * @returns {string} Sequence container ID
   */
  initializeSequence(sequenceData) {
    const sequenceId = sequenceData.id || this._generateId();
    
    // Create the main sequence container
    const sequenceContainer = this._createSequenceContainer(sequenceId, sequenceData);
    
    // Add progress indicator
    const progressContainer = this._createProgressIndicator(sequenceData.agents || []);
    sequenceContainer.appendChild(progressContainer);
    
    // Add to active sequences
    this.activeSequences.set(sequenceId, {
      container: sequenceContainer,
      data: sequenceData,
      steps: [],
      startTime: new Date()
    });
    
    // Append to chat container
    if (this.container) {
      this.container.appendChild(sequenceContainer);
      this._scrollToBottom();
    }
    
    return sequenceId;
  }

  /**
   * Add or update an agent step in the sequence
   * @param {string} sequenceId - Sequence identifier
   * @param {object} stepData - Agent step data
   */
  updateAgentStep(sequenceId, stepData) {
    const sequence = this.activeSequences.get(sequenceId);
    if (!sequence) return;

    const existingStepIndex = sequence.steps.findIndex(s => s.agent === stepData.agent);
    
    if (existingStepIndex >= 0) {
      // Update existing step
      sequence.steps[existingStepIndex] = { ...sequence.steps[existingStepIndex], ...stepData };
      this._updateStepUI(sequenceId, stepData);
    } else {
      // Add new step
      sequence.steps.push(stepData);
      this._addStepUI(sequenceId, stepData);
    }
    
    // Update progress indicator
    this._updateProgress(sequenceId);
    
    // Show activity indicator
    this._showAgentActivity(stepData);
  }

  /**
   * Complete the agent consultation sequence
   * @param {string} sequenceId - Sequence identifier
   * @param {object} finalData - Final sequence data
   */
  completeSequence(sequenceId, finalData) {
    const sequence = this.activeSequences.get(sequenceId);
    if (!sequence) return;

    // Update sequence header to show completion
    const header = sequence.container.querySelector('.agent-sequence-header');
    if (header) {
      const badge = header.querySelector('.sequence-badge');
      if (badge) {
        badge.textContent = 'Completed';
        badge.style.background = 'rgba(16, 185, 129, 0.3)';
      }
    }

    // Update progress to show completion
    this._updateProgress(sequenceId, true);
    
    // Hide activity indicator
    this._hideAgentActivity();
    
    // Mark sequence as completed
    sequence.completed = true;
    sequence.endTime = new Date();
    sequence.finalData = finalData;
  }

  /**
   * Create the main sequence container
   * @param {string} sequenceId - Sequence identifier
   * @param {object} sequenceData - Sequence data
   * @returns {HTMLElement} Container element
   * @private
   */
  _createSequenceContainer(sequenceId, sequenceData) {
    const container = document.createElement('div');
    container.className = 'agent-sequence-container';
    container.dataset.sequenceId = sequenceId;

    const header = document.createElement('div');
    header.className = 'agent-sequence-header';
    
    const title = document.createElement('div');
    title.innerHTML = `
      <i class="fas fa-users-cog"></i>
      <span>Agent Consultation in Progress</span>
    `;
    
    const badge = document.createElement('div');
    badge.className = 'sequence-badge';
    badge.textContent = 'Processing';
    
    header.appendChild(title);
    header.appendChild(badge);
    container.appendChild(header);

    return container;
  }

  /**
   * Create progress indicator for the sequence
   * @param {Array<string>} agents - List of agent keys
   * @returns {HTMLElement} Progress container
   * @private
   */
  _createProgressIndicator(agents) {
    const container = document.createElement('div');
    container.className = 'consultation-progress';
    
    const title = document.createElement('div');
    title.className = 'progress-title';
    title.innerHTML = `
      <i class="fas fa-route"></i>
      <span>Consultation Progress</span>
    `;
    
    const stepsContainer = document.createElement('div');
    stepsContainer.className = 'progress-steps';
    
    agents.forEach((agent, index) => {
      const step = document.createElement('div');
      step.className = 'progress-step';
      step.dataset.agent = agent;
      
      const dot = document.createElement('div');
      dot.className = 'progress-dot';
      
      const label = document.createElement('div');
      label.className = 'progress-step-label';
      label.textContent = this.agentNames[agent] || agent;
      
      step.appendChild(dot);
      step.appendChild(label);
      stepsContainer.appendChild(step);
      
      // Add connecting line (except for last step)
      if (index < agents.length - 1) {
        const line = document.createElement('div');
        line.className = 'progress-line';
        stepsContainer.appendChild(line);
      }
    });
    
    container.appendChild(title);
    container.appendChild(stepsContainer);
    
    return container;
  }

  /**
   * Add a new agent step to the UI
   * @param {string} sequenceId - Sequence identifier
   * @param {object} stepData - Step data
   * @private
   */
  _addStepUI(sequenceId, stepData) {
    const sequence = this.activeSequences.get(sequenceId);
    if (!sequence) return;

    const stepContainer = document.createElement('div');
    stepContainer.className = 'agent-step';
    stepContainer.dataset.agent = stepData.agent;
    stepContainer.dataset.order = stepData.order || 0;

    // Create step header
    const header = this._createStepHeader(stepData);
    stepContainer.appendChild(header);

    // Create collapsible content area
    const content = this._createStepContent(stepData);
    stepContainer.appendChild(content);

    // Add click handler for expansion
    header.addEventListener('click', () => {
      stepContainer.classList.toggle('expanded');
    });

    // Insert in correct order
    const existingSteps = sequence.container.querySelectorAll('.agent-step');
    let inserted = false;
    
    for (const existingStep of existingSteps) {
      const existingOrder = parseInt(existingStep.dataset.order) || 0;
      if ((stepData.order || 0) < existingOrder) {
        sequence.container.insertBefore(stepContainer, existingStep);
        inserted = true;
        break;
      }
    }
    
    if (!inserted) {
      sequence.container.appendChild(stepContainer);
    }

    // Scroll to new step
    this._scrollToBottom();
  }

  /**
   * Create step header
   * @param {object} stepData - Step data
   * @returns {HTMLElement} Header element
   * @private
   */
  _createStepHeader(stepData) {
    const header = document.createElement('div');
    header.className = 'agent-step-header';

    const stepNumber = document.createElement('div');
    stepNumber.className = `step-number ${stepData.agent}`;
    stepNumber.textContent = stepData.order || '?';

    const stepInfo = document.createElement('div');
    stepInfo.className = 'step-info';
    
    const title = document.createElement('div');
    title.className = 'step-title';
    title.innerHTML = `
      <span>${this.agentNames[stepData.agent] || stepData.agent}</span>
      ${stepData.delegatedFrom ? `<span class="delegation-indicator">Delegated from ${this.agentNames[stepData.delegatedFrom] || stepData.delegatedFrom}</span>` : ''}
    `;
    
    const subtitle = document.createElement('div');
    subtitle.className = 'step-subtitle';
    subtitle.innerHTML = this._getStepSubtitle(stepData);
    
    stepInfo.appendChild(title);
    stepInfo.appendChild(subtitle);

    const status = document.createElement('div');
    status.className = 'step-status';
    
    const statusIcon = document.createElement('div');
    statusIcon.className = `status-icon ${this._getStatusClass(stepData.status)}`;
    statusIcon.innerHTML = this._getStatusIcon(stepData.status);
    
    const expandToggle = document.createElement('div');
    expandToggle.className = 'expand-toggle';
    expandToggle.innerHTML = '<i class="fas fa-chevron-down"></i>';
    
    status.appendChild(statusIcon);
    status.appendChild(expandToggle);

    header.appendChild(stepNumber);
    header.appendChild(stepInfo);
    header.appendChild(status);

    return header;
  }

  /**
   * Create step content area
   * @param {object} stepData - Step data
   * @returns {HTMLElement} Content element
   * @private
   */
  _createStepContent(stepData) {
    const content = document.createElement('div');
    content.className = 'agent-step-content';

    if (stepData.response) {
      const response = document.createElement('div');
      response.className = 'step-response';
      response.textContent = stepData.response;
      content.appendChild(response);
    }

    const metadata = document.createElement('div');
    metadata.className = 'step-metadata';
    
    const timestamp = document.createElement('div');
    timestamp.textContent = stepData.timestamp ? 
      new Date(stepData.timestamp).toLocaleTimeString() : 
      'Processing...';
    
    const delegationInfo = document.createElement('div');
    if (stepData.delegationReason) {
      delegationInfo.className = 'delegation-chain';
      delegationInfo.innerHTML = `
        <span>Reason:</span>
        <span class="delegation-reason">${stepData.delegationReason}</span>
      `;
    }
    
    metadata.appendChild(timestamp);
    metadata.appendChild(delegationInfo);
    content.appendChild(metadata);

    return content;
  }

  /**
   * Update progress indicator
   * @param {string} sequenceId - Sequence identifier
   * @param {boolean} completed - Whether sequence is completed
   * @private
   */
  _updateProgress(sequenceId, completed = false) {
    const sequence = this.activeSequences.get(sequenceId);
    if (!sequence) return;

    const progressSteps = sequence.container.querySelectorAll('.progress-step');
    const progressLines = sequence.container.querySelectorAll('.progress-line');

    progressSteps.forEach((step, index) => {
      const agent = step.dataset.agent;
      const agentStep = sequence.steps.find(s => s.agent === agent);
      
      const dot = step.querySelector('.progress-dot');
      const label = step.querySelector('.progress-step-label');
      
      if (agentStep && agentStep.status === 'completed') {
        step.classList.add('completed');
        step.classList.remove('active');
        dot.classList.add('completed');
        label.classList.add('completed');
        
        // Update connecting line
        if (progressLines[index]) {
          progressLines[index].classList.add('completed');
        }
      } else if (agentStep && agentStep.status === 'processing') {
        step.classList.add('active');
        step.classList.remove('completed');
        dot.classList.add('active');
        label.classList.add('active');
      }
    });

    // If completed, mark all as completed
    if (completed) {
      progressSteps.forEach(step => {
        step.classList.add('completed');
        step.classList.remove('active');
      });
      progressLines.forEach(line => {
        line.classList.add('completed');
      });
    }
  }

  /**
   * Show agent activity indicator
   * @param {object} stepData - Current step data
   * @private
   */
  _showAgentActivity(stepData) {
    let indicator = document.querySelector('.agent-activity-indicator');
    
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.className = 'agent-activity-indicator';
      document.body.appendChild(indicator);
    }

    const agentColor = this.agentColors[stepData.agent] || this.agentColors.generalist;
    
    indicator.innerHTML = `
      <div class="activity-avatar ${stepData.agent}" style="background: linear-gradient(135deg, ${agentColor.primary}, ${agentColor.secondary})">
        <i class="fas fa-${this._getAgentIcon(stepData.agent)}"></i>
      </div>
      <div class="activity-info">
        <div class="activity-text">${this.agentNames[stepData.agent] || stepData.agent}</div>
        <div class="activity-subtext">Analyzing your request...</div>
      </div>
    `;
    
    indicator.classList.add('visible');
  }

  /**
   * Hide agent activity indicator
   * @private
   */
  _hideAgentActivity() {
    const indicator = document.querySelector('.agent-activity-indicator');
    if (indicator) {
      indicator.classList.remove('visible');
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.parentNode.removeChild(indicator);
        }
      }, 300);
    }
  }

  /**
   * Get status CSS class
   * @param {string} status - Step status
   * @returns {string} CSS class
   * @private
   */
  _getStatusClass(status) {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'processing': return 'processing';
      default: return 'processing';
    }
  }

  /**
   * Get status icon
   * @param {string} status - Step status
   * @returns {string} Icon HTML
   * @private
   */
  _getStatusIcon(status) {
    switch (status) {
      case 'completed': return '<i class="fas fa-check"></i>';
      case 'failed': return '<i class="fas fa-times"></i>';
      case 'processing': return '<i class="fas fa-spinner fa-spin"></i>';
      default: return '<i class="fas fa-clock"></i>';
    }
  }

  /**
   * Get agent icon
   * @param {string} agent - Agent type
   * @returns {string} Icon class
   * @private
   */
  _getAgentIcon(agent) {
    switch (agent) {
      case 'broker': return 'handshake';
      case 'legal': return 'gavel';
      case 'finance': return 'chart-line';
      default: return 'robot';
    }
  }

  /**
   * Get step subtitle
   * @param {object} stepData - Step data
   * @returns {string} Subtitle HTML
   * @private
   */
  _getStepSubtitle(stepData) {
    const time = stepData.timestamp ? 
      new Date(stepData.timestamp).toLocaleTimeString() : 
      'In progress...';
    
    let subtitle = `<i class="fas fa-clock"></i> ${time}`;
    
    if (stepData.delegationReason) {
      subtitle += ` <i class="fas fa-arrow-right delegation-arrow"></i> ${stepData.delegationReason}`;
    }
    
    return subtitle;
  }

  /**
   * Scroll to bottom of container
   * @private
   */
  _scrollToBottom() {
    if (this.container) {
      this.container.scrollTop = this.container.scrollHeight;
    }
  }

  /**
   * Generate unique ID
   * @returns {string} Unique identifier
   * @private
   */
  _generateId() {
    return `seq_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Export for use in other scripts
window.SequentialAgentUI = SequentialAgentUI;

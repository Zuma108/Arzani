/**
 * Agent Registry for Arzani-AI
 * 
 * Manages agent instances and provides A2A communication interfaces
 */

const A2AClient = require('./client');
const { generalistAgentCard, brokerAgentCard, legalAgentCard, financeAgentCard } = require('./agentCards');
const config = require('../config');
const logger = require('../utils/logger');

class AgentRegistry {
  constructor() {
    this.agents = new Map();
    this.agentCards = {
      generalist: generalistAgentCard,
      broker: brokerAgentCard,
      legal: legalAgentCard,
      finance: financeAgentCard
    };
    
    // Initialize registry with agent instances
    this.initialize();
  }
  
  initialize() {
    // Register agent instances with A2A clients
    this.registerAgent('generalist', require('../agents/generalist'), config.endpoints.generalist);
    this.registerAgent('broker', require('../agents/broker'), config.endpoints.broker);
    this.registerAgent('legal', require('../agents/legal'), config.endpoints.legal);
    this.registerAgent('finance', require('../agents/finance'), config.endpoints.finance);
    
    logger.info('Agent registry initialized with all specialist agents');
  }
  
  registerAgent(name, agentModule, endpoint) {
    const a2aClient = new A2AClient(endpoint, {
      authToken: config.a2a.authToken
    });
    
    this.agents.set(name, {
      instance: agentModule,
      a2aClient,
      card: this.agentCards[name]
    });
    
    logger.info(`Registered ${name} agent with A2A endpoint: ${endpoint}`);
  }
  
  async getAgent(name) {
    const agent = this.agents.get(name);
    if (!agent) {
      throw new Error(`Agent not found: ${name}`);
    }
    return agent;
  }
  
  async getAgentCard(name) {
    const agent = await this.getAgent(name);
    return agent.card;
  }
  
  async sendTaskToAgent(agentName, message, options = {}) {
    const agent = await this.getAgent(agentName);
    return agent.a2aClient.sendTask(message, options);
  }
  
  async streamTaskToAgent(agentName, message, callbacks, options = {}) {
    const agent = await this.getAgent(agentName);
    return agent.a2aClient.sendTaskWithStreaming(
      message,
      callbacks.onUpdate,
      callbacks.onComplete,
      callbacks.onError,
      options
    );
  }
}

// Singleton instance
const registry = new AgentRegistry();

module.exports = registry;

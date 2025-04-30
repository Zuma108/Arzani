/**
 * Agent Card definitions for Arzani-AI specialist agents
 * 
 * These cards describe each agent's capabilities for A2A discovery
 */

const generalistAgentCard = {
  "name": "Arzani Generalist Agent",
  "description": "Coordinator agent for business valuation and brokerage services",
  "version": "1.0.0",
  "contact_url": "https://arzani.co.uk/support",
  "human_support_url": "https://arzani.co.uk/human-support",
  "icon_url": "https://arzani.co.uk/icons/generalist-agent.png",
  "endpoints": {
    "a2a": "https://api.arzani.co.uk/a2a/generalist"
  },
  "capabilities": {
    "streaming": true,
    "pushNotifications": true
  },
  "skills": [
    {
      "name": "coordinator",
      "description": "Orchestrates specialist agents and maintains conversation context"
    },
    {
      "name": "intent_classification",
      "description": "Classifies user intent to route to appropriate specialist agent"
    }
  ]
};

const brokerAgentCard = {
  "name": "Arzani Broker Agent",
  "description": "Specialist agent for business valuation and negotiation advice",
  "version": "1.0.0",
  "contact_url": "https://arzani.co.uk/support",
  "human_support_url": "https://arzani.co.uk/broker-support",
  "icon_url": "https://arzani.co.uk/icons/broker-agent.png",
  "endpoints": {
    "a2a": "https://api.arzani.co.uk/a2a/broker"
  },
  "capabilities": {
    "streaming": true
  },
  "skills": [
    {
      "name": "valuation",
      "description": "Calculates business valuations using comparable properties"
    },
    {
      "name": "negotiation_advice",
      "description": "Provides negotiation tactics and risk assessments"
    }
  ]
};

const legalAgentCard = {
  "name": "Arzani Legal Agent",
  "description": "Specialist agent for legal compliance and contract drafting",
  "version": "1.0.0",
  "contact_url": "https://arzani.co.uk/support",
  "human_support_url": "https://arzani.co.uk/legal-support",
  "icon_url": "https://arzani.co.uk/icons/legal-agent.png",
  "endpoints": {
    "a2a": "https://api.arzani.co.uk/a2a/legal"
  },
  "capabilities": {
    "streaming": false
  },
  "skills": [
    {
      "name": "compliance_check",
      "description": "License and compliance verification using regulations database"
    },
    {
      "name": "contract_drafting",
      "description": "Drafts standard contract clauses and templates"
    }
  ]
};

const financeAgentCard = {
  "name": "Arzani Finance Agent",
  "description": "Specialist agent for financial calculations and tax scenarios",
  "version": "1.0.0",
  "contact_url": "https://arzani.co.uk/support",
  "human_support_url": "https://arzani.co.uk/finance-support",
  "icon_url": "https://arzani.co.uk/icons/finance-agent.png",
  "endpoints": {
    "a2a": "https://api.arzani.co.uk/a2a/finance"
  },
  "capabilities": {
    "streaming": false
  },
  "skills": [
    {
      "name": "valuation_math",
      "description": "EBITDA multiple calculations and financial modeling"
    },
    {
      "name": "tax_scenarios",
      "description": "Tax liability analysis and planning for business transactions"
    }
  ]
};

module.exports = {
  generalistAgentCard,
  brokerAgentCard,
  legalAgentCard,
  financeAgentCard
};

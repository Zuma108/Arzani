/**
 * Markdown Utilities for A2A Agents
 * 
 * Utilities for enhancing agent responses with consistent
 * markdown formatting and structure.
 */

// Import markdown configuration
import { MARKDOWN_FORMAT_GUIDE, AGENT_MARKDOWN_GUIDELINES, getAgentMarkdownGuide } from '../config/markdown-config.js';

/**
 * Enhance a system prompt with markdown formatting guidelines
 * @param {string} systemPrompt - Original system prompt
 * @param {string} agentType - Type of agent (orchestrator, finance, legal, broker)
 * @returns {string} - Enhanced system prompt with markdown guidelines
 */
function enhanceSystemPromptWithMarkdown(systemPrompt, agentType) {
  // Get markdown guide for this agent type
  const markdownGuide = getAgentMarkdownGuide(agentType);
  
  // Insert markdown guide after any existing "CRITICAL" or "IMPORTANT" sections
  // or at the beginning if those sections don't exist
  if (systemPrompt.includes('CRITICAL') || systemPrompt.includes('IMPORTANT')) {
    // Find the end of the critical/important section
    const criticalMatch = systemPrompt.match(/\b(CRITICAL|IMPORTANT)[\s\S]*?\n\n/);
    if (criticalMatch && criticalMatch.index !== undefined) {
      const insertPosition = criticalMatch.index + criticalMatch[0].length;
      return systemPrompt.slice(0, insertPosition) + 
             "## MARKDOWN FORMATTING REQUIREMENTS\n" + markdownGuide + "\n\n" + 
             systemPrompt.slice(insertPosition);
    }
  }
  
  // If no critical section, insert at the beginning
  return "## MARKDOWN FORMATTING REQUIREMENTS\n" + markdownGuide + "\n\n" + systemPrompt;
}

/**
 * Format agent response with consistent markdown structure
 * @param {string} response - Raw agent response
 * @param {string} agentType - Type of agent
 * @returns {string} - Formatted response with enhanced markdown
 */
function formatAgentResponse(response, agentType) {
  // Ensure response starts with a heading if it doesn't already
  if (!response.startsWith('#')) {
    const agentName = agentType.charAt(0).toUpperCase() + agentType.slice(1);
    response = `## ${agentName} Analysis\n\n${response}`;
  }
  
  // Ensure proper spacing around markdown elements
  response = response
    .replace(/\n(#+)([^\n])/g, '\n$1 $2') // Fix headings without space
    .replace(/\n(-|\d+\.)([^\s])/g, '\n$1 $2') // Fix list items without space
    .replace(/\n---\n/g, '\n\n---\n\n') // Fix horizontal rules without spacing
    .replace(/(\n\n\n+)/g, '\n\n') // Remove excessive line breaks
    .replace(/<ul.*?>|<ol.*?>/g, '') // Remove any direct HTML list tags
    .replace(/<\/ul>|<\/ol>/g, '') // Remove any direct HTML list closing tags
    .replace(/<li.*?>(.*?)<\/li>/g, '- $1') // Convert any HTML list items to markdown
    .replace(/<p.*?>(.*?)<\/p>/g, '$1\n\n'); // Convert any HTML paragraphs to plain text with line breaks
  
  return response;
}

/**
 * Add appropriate agent signature to response
 * @param {string} response - Formatted agent response
 * @param {string} agentType - Type of agent
 * @returns {string} - Response with signature
 */
function addAgentSignature(response, agentType) {
  const signatures = {
    orchestrator: '🔄 **Orchestrator Agent**',
    finance: '📊 **Finance Agent**',
    legal: '⚖️ **Legal Agent**',
    broker: '🏢 **Broker Agent**',
    generalist: '🤖 **Generalist Agent**',
    revenue: '📈 **Revenue Agent**'
  };
  
  const signature = signatures[agentType] || `**${agentType.charAt(0).toUpperCase() + agentType.slice(1)} Agent**`;
  
  return response + '\n\n---\n' + signature;
}

export {
  enhanceSystemPromptWithMarkdown,
  formatAgentResponse,
  addAgentSignature
};

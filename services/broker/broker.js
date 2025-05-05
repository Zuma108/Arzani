/**
 * Broker Agent Logic
 * 
 * Core business logic for the Broker Specialist Agent
 * - Business valuation
 * - Market comparables analysis
 * - Deal structure advice
 */

import { createTextPart, createDataPart, createMessage } from '../../libs/a2a/utils.js';

// Industry-specific EBITDA multiples based on recent market data
const INDUSTRY_MULTIPLES = {
  'ecommerce': {
    'base': 3.0,
    'premium': 4.5,
    'range': [2.5, 5.0]
  },
  'saas': { 
    'base': 6.0,
    'premium': 10.0,
    'range': [4.0, 12.0]
  },
  'services': {
    'base': 2.5,
    'premium': 3.5,
    'range': [2.0, 4.0]
  },
  'manufacturing': {
    'base': 4.0,
    'premium': 5.5,
    'range': [3.5, 6.0]
  },
  'retail': {
    'base': 2.0,
    'premium': 3.0,
    'range': [1.5, 3.5]
  },
  'food': {
    'base': 2.5,
    'premium': 3.0,
    'range': [2.0, 4.0]
  },
  'health': {
    'base': 4.5,
    'premium': 7.0,
    'range': [4.0, 8.0]
  },
  'tech': {
    'base': 5.0,
    'premium': 8.0,
    'range': [4.0, 10.0]
  },
  'default': {
    'base': 3.0,
    'premium': 5.0,
    'range': [2.5, 6.0]
  }
};

/**
 * Process a broker agent task based on the request message
 * 
 * @param {object} task - A2A task object
 * @param {object} message - A2A message object
 * @returns {Promise<object>} - Response with task and message
 */
export async function processBrokerTask(task, message) {
  // Extract text from message parts
  const textParts = message.parts.filter(part => part.type === 'text');
  const dataParts = message.parts.filter(part => part.type === 'data');
  
  if (textParts.length === 0) {
    return createErrorResponse('Invalid request: No text parts found in message');
  }
  
  const query = textParts[0].text.toLowerCase();
  
  // Determine the type of broker request based on the query
  if (query.includes('valuation') || query.includes('value') || query.includes('worth')) {
    return handleValuationRequest(task, message, query, dataParts[0]?.data);
  } else if (query.includes('comparable') || query.includes('comps') || query.includes('similar businesses')) {
    return handleComparableRequest(task, message, query, dataParts[0]?.data);
  } else if (query.includes('deal') || query.includes('structure') || query.includes('acquisition')) {
    return handleDealStructureRequest(task, message, query, dataParts[0]?.data);
  } else {
    return handleGeneralBrokerRequest(task, message, query);
  }
}

/**
 * Handle a business valuation request
 * 
 * @param {object} task - A2A task object
 * @param {object} message - A2A message object
 * @param {string} query - The user's query text
 * @param {object} data - Optional structured data
 * @returns {object} - Response with task and message
 */
async function handleValuationRequest(task, message, query, data = {}) {
  // Extract business information from query and/or data
  const extractedData = extractBusinessData(query, data);
  const { revenue, ebitda, industry, growthRate } = extractedData;
  
  // Calculate business valuation based on available data
  const valuation = calculateBusinessValuation(extractedData);
  
  // Adjust task state to completed
  const responseTask = {
    ...task,
    state: 'completed'
  };
  
  // Prepare response message with valuation results
  const responseMessage = createMessage([
    createTextPart(`Based on the information provided, I've prepared a valuation analysis for your ${industry || ''} business.`),
    createTextPart(`**Business Valuation Summary:**\n\n` +
      `- Revenue: $${formatNumber(revenue || 'N/A')}\n` +
      `- EBITDA: $${formatNumber(ebitda || 'N/A')}\n` +
      `- Industry: ${industry || 'Not specified'}\n` +
      `- Growth Rate: ${growthRate ? `${(growthRate * 100).toFixed(1)}%` : 'Not specified'}\n\n` +
      `**Estimated Valuation Range:** $${formatNumber(valuation.low)} to $${formatNumber(valuation.high)}\n` +
      `**Average Valuation:** $${formatNumber(valuation.average)}\n\n` +
      `The valuation is based on an EBITDA multiple range of ${valuation.multipleRange[0].toFixed(1)}x to ${valuation.multipleRange[1].toFixed(1)}x, which is typical for ${industry || 'businesses'} in the current market.`),
    createDataPart({
      valuation: {
        average: valuation.average,
        low: valuation.low,
        high: valuation.high,
        ebitdaMultiple: valuation.multipleUsed,
        multipleRange: valuation.multipleRange
      },
      businessData: extractedData
    }, 'valuation_data')
  ]);
  
  return { task: responseTask, message: responseMessage };
}

/**
 * Handle a request for comparable business listings
 * 
 * @param {object} task - A2A task object
 * @param {object} message - A2A message object
 * @param {string} query - The user's query text
 * @param {object} data - Optional structured data
 * @returns {object} - Response with task and message
 */
async function handleComparableRequest(task, message, query, data = {}) {
  // Extract business information to find comparables
  const extractedData = extractBusinessData(query, data);
  const { revenue, industry } = extractedData;
  
  // Find comparable businesses (this would connect to a database in a real implementation)
  const comparables = findComparableBusinesses(industry, revenue);
  
  // Adjust task state to completed
  const responseTask = {
    ...task,
    state: 'completed'
  };
  
  // Prepare response message with comparable listings
  const responseMessage = createMessage([
    createTextPart(`I've found ${comparables.length} comparable ${industry || ''} businesses based on your criteria.`),
    createTextPart(`**Comparable Business Listings:**\n\n` + 
      comparables.map((comp, index) => 
        `**${index + 1}. ${comp.title}**\n` +
        `- Revenue: $${formatNumber(comp.revenue)}\n` +
        `- EBITDA: $${formatNumber(comp.ebitda)}\n` +
        `- Asking Price: $${formatNumber(comp.askingPrice)}\n` +
        `- Multiple: ${comp.multiple.toFixed(2)}x EBITDA\n` +
        `- ${comp.description}\n`
      ).join('\n')),
    createDataPart({
      comparables: comparables,
      industryStats: {
        averageMultiple: comparables.reduce((sum, comp) => sum + comp.multiple, 0) / comparables.length,
        averageRevenue: comparables.reduce((sum, comp) => sum + comp.revenue, 0) / comparables.length,
        totalListings: comparables.length
      }
    }, 'comparables_data')
  ]);
  
  return { task: responseTask, message: responseMessage };
}

/**
 * Handle a request for deal structure advice
 * 
 * @param {object} task - A2A task object
 * @param {object} message - A2A message object
 * @param {string} query - The user's query text
 * @param {object} data - Optional structured data
 * @returns {object} - Response with task and message
 */
async function handleDealStructureRequest(task, message, query, data = {}) {
  // Extract business information relevant to deal structure
  const extractedData = extractBusinessData(query, data);
  
  // Generate deal structure advice
  const dealStructureAdvice = generateDealStructureAdvice(extractedData);
  
  // Adjust task state to completed
  const responseTask = {
    ...task,
    state: 'completed'
  };
  
  // Prepare response message with deal structure advice
  const responseMessage = createMessage([
    createTextPart(`Based on your business profile, here are recommended deal structures to consider:`),
    createTextPart(dealStructureAdvice.text),
    createDataPart({
      recommendedStructures: dealStructureAdvice.structures,
      considerations: dealStructureAdvice.considerations
    }, 'deal_structure_data')
  ]);
  
  return { task: responseTask, message: responseMessage };
}

/**
 * Handle general broker-related questions
 * 
 * @param {object} task - A2A task object
 * @param {object} message - A2A message object
 * @param {string} query - The user's query text
 * @returns {object} - Response with task and message
 */
async function handleGeneralBrokerRequest(task, message, query) {
  // Process general broker questions
  let response = "As your broker agent, I can help with business valuations, finding comparable listings, and deal structuring advice. Could you provide more details about your business and what specific information you're looking for?";
  
  // Adjust task state to completed
  const responseTask = {
    ...task,
    state: 'completed'
  };
  
  // Prepare response message
  const responseMessage = createMessage([
    createTextPart(response)
  ]);
  
  return { task: responseTask, message: responseMessage };
}

/**
 * Extract business data from query text and structured data
 * 
 * @param {string} query - The user's query text
 * @param {object} data - Optional structured data
 * @returns {object} - Extracted business data
 */
function extractBusinessData(query, data = {}) {
  // Start with any provided structured data
  const extractedData = { ...data };
  
  // If no structured data, try to extract from query text
  if (!data || Object.keys(data).length === 0) {
    // Extract revenue (e.g., "$500K", "$1.2M", "$1.2 million", etc.)
    const revenueMatch = query.match(/\$([\d.]+)\s*([KMB]|thousand|million|billion)/i);
    if (revenueMatch) {
      const amount = parseFloat(revenueMatch[1]);
      const unit = revenueMatch[2].toUpperCase();
      
      if (unit === 'K' || unit === 'THOUSAND') {
        extractedData.revenue = amount * 1000;
      } else if (unit === 'M' || unit === 'MILLION') {
        extractedData.revenue = amount * 1000000;
      } else if (unit === 'B' || unit === 'BILLION') {
        extractedData.revenue = amount * 1000000000;
      }
    }
    
    // Extract EBITDA as a dollar amount or as a percentage of revenue
    const ebitdaAmountMatch = query.match(/EBITDA\s*(of)?\s*\$([\d.]+)\s*([KMB]|thousand|million|billion)/i);
    const ebitdaPercentMatch = query.match(/EBITDA\s*(of)?\s*([\d.]+)\s*%/i) || query.match(/(\d+)%\s*EBITDA/i);
    
    if (ebitdaAmountMatch) {
      const amount = parseFloat(ebitdaAmountMatch[2]);
      const unit = ebitdaAmountMatch[3].toUpperCase();
      
      if (unit === 'K' || unit === 'THOUSAND') {
        extractedData.ebitda = amount * 1000;
      } else if (unit === 'M' || unit === 'MILLION') {
        extractedData.ebitda = amount * 1000000;
      } else if (unit === 'B' || unit === 'BILLION') {
        extractedData.ebitda = amount * 1000000000;
      }
    } else if (ebitdaPercentMatch && extractedData.revenue) {
      const percentage = parseFloat(ebitdaPercentMatch[2] || ebitdaPercentMatch[1]) / 100;
      extractedData.ebitda = extractedData.revenue * percentage;
    }
    
    // Try to identify industry
    const industries = [
      'ecommerce', 'saas', 'services', 'manufacturing', 'retail', 
      'food', 'health', 'tech'
    ];
    
    for (const industry of industries) {
      if (query.includes(industry)) {
        extractedData.industry = industry;
        break;
      }
    }
    
    // Try to identify growth rate
    const growthMatch = query.match(/(\d+(?:\.\d+)?)\s*%\s*growth/i);
    if (growthMatch) {
      extractedData.growthRate = parseFloat(growthMatch[1]) / 100;
    }
  }
  
  return extractedData;
}

/**
 * Calculate business valuation using multiple methods
 * 
 * @param {object} businessData - Business data for valuation
 * @returns {object} - Valuation results
 */
function calculateBusinessValuation(businessData) {
  const { revenue, ebitda, industry = 'default', growthRate = 0 } = businessData;
  
  // Get industry multiples
  const multiples = INDUSTRY_MULTIPLES[industry.toLowerCase()] || INDUSTRY_MULTIPLES.default;
  
  // Adjust multiple based on growth rate
  const growthAdjustment = growthRate > 0.2 ? 1.5 : 
                          growthRate > 0.1 ? 1.2 : 
                          growthRate > 0.05 ? 1.1 : 1.0;
  
  let multipleUsed = multiples.base * growthAdjustment;
  if (growthRate > 0.3) {
    multipleUsed = multiples.premium;
  }
  
  // Calculate valuation from EBITDA if available
  if (ebitda) {
    const average = ebitda * multipleUsed;
    const low = ebitda * multiples.range[0];
    const high = ebitda * multiples.range[1] * growthAdjustment;
    
    return {
      average,
      low,
      high,
      multipleUsed,
      multipleRange: multiples.range,
      method: 'ebitda'
    };
  } 
  // If no EBITDA but we have revenue, estimate EBITDA based on industry averages
  else if (revenue) {
    // Typical EBITDA margins by industry
    const margins = {
      'ecommerce': 0.15,
      'saas': 0.25,
      'services': 0.20,
      'manufacturing': 0.18,
      'retail': 0.08,
      'food': 0.12,
      'health': 0.22,
      'tech': 0.20,
      'default': 0.15
    };
    
    const margin = margins[industry.toLowerCase()] || margins.default;
    const estimatedEbitda = revenue * margin;
    
    const average = estimatedEbitda * multipleUsed;
    const low = estimatedEbitda * multiples.range[0];
    const high = estimatedEbitda * multiples.range[1] * growthAdjustment;
    
    return {
      average,
      low,
      high,
      multipleUsed,
      multipleRange: multiples.range,
      method: 'revenue-based-estimate',
      estimatedEbitda
    };
  }
  
  // Not enough data for valuation
  return {
    average: 0,
    low: 0,
    high: 0,
    multipleUsed: multipleUsed,
    multipleRange: multiples.range,
    method: 'insufficient-data'
  };
}

/**
 * Find comparable businesses based on industry and revenue
 * 
 * @param {string} industry - Business industry
 * @param {number} revenue - Annual revenue
 * @returns {Array<object>} - List of comparable businesses
 */
function findComparableBusinesses(industry = '', revenue = 0) {
  // In a real implementation, this would query a database of business listings
  // For demo purposes, we'll return mock data based on the input parameters
  
  // Normalize industry
  const normalizedIndustry = industry.toLowerCase();
  
  // Mock comparable business data
  const mockComparables = [
    {
      title: "Established E-commerce Store in Pet Supplies",
      revenue: 750000,
      ebitda: 150000,
      askingPrice: 600000,
      multiple: 4.0,
      industry: "ecommerce",
      description: "Online pet supplies store with 5 years of operations and a loyal customer base."
    },
    {
      title: "SaaS Platform for Small Businesses",
      revenue: 1200000,
      ebitda: 300000,
      askingPrice: 2400000,
      multiple: 8.0,
      industry: "saas",
      description: "B2B SaaS platform with recurring revenue and 95% client retention rate."
    },
    {
      title: "Digital Marketing Agency",
      revenue: 850000,
      ebitda: 170000,
      askingPrice: 510000,
      multiple: 3.0,
      industry: "services",
      description: "Full-service marketing agency specializing in e-commerce clients."
    },
    {
      title: "Custom Manufacturing Workshop",
      revenue: 2100000,
      ebitda: 378000,
      askingPrice: 1600000,
      multiple: 4.2,
      industry: "manufacturing",
      description: "Specialized manufacturing business with proprietary processes and equipment."
    },
    {
      title: "Health Food Product Line",
      revenue: 950000,
      ebitda: 180000,
      askingPrice: 810000,
      multiple: 4.5,
      industry: "food",
      description: "Organic food product line with distribution in major retail chains."
    },
    {
      title: "Premium Online Clothing Brand",
      revenue: 1800000,
      ebitda: 270000,
      askingPrice: 810000,
      multiple: 3.0,
      industry: "ecommerce",
      description: "Direct-to-consumer clothing brand with strong social media presence."
    },
    {
      title: "Healthcare Software Solution",
      revenue: 3200000,
      ebitda: 800000,
      askingPrice: 5600000,
      multiple: 7.0,
      industry: "health",
      description: "Specialized software for healthcare providers with subscription model."
    }
  ];
  
  // Filter by industry if provided
  let filteredComps = mockComparables;
  if (normalizedIndustry && normalizedIndustry !== 'default') {
    filteredComps = mockComparables.filter(comp => 
      comp.industry.toLowerCase().includes(normalizedIndustry) ||
      normalizedIndustry.includes(comp.industry.toLowerCase())
    );
  }
  
  // Filter by revenue range if provided
  if (revenue > 0) {
    const lowerBound = revenue * 0.5;
    const upperBound = revenue * 2.0;
    
    filteredComps = filteredComps.filter(comp => 
      comp.revenue >= lowerBound && comp.revenue <= upperBound
    );
  }
  
  // If no matches found, return closest ones by revenue
  if (filteredComps.length === 0 && revenue > 0) {
    return mockComparables
      .sort((a, b) => Math.abs(a.revenue - revenue) - Math.abs(b.revenue - revenue))
      .slice(0, 3);
  }
  
  // Return limited set (max 5)
  return filteredComps.slice(0, 5);
}

/**
 * Generate deal structure advice based on business data
 * 
 * @param {object} businessData - Business data for deal structure advice
 * @returns {object} - Deal structure advice
 */
function generateDealStructureAdvice(businessData) {
  const { industry = 'default', revenue = 0, ebitda = 0 } = businessData;
  
  // Default structures
  const structures = [
    {
      name: "Standard Asset Sale",
      description: "Purchase of business assets without assuming liabilities",
      allocation: {
        "Tangible Assets": "30-40%",
        "Goodwill": "50-60%",
        "Non-compete": "5-10%"
      },
      benefits: [
        "Cleaner transaction with fewer inherited risks",
        "Potentially more favorable tax treatment for buyer"
      ],
      considerations: [
        "May require asset transfer documentation",
        "Could trigger sales tax on tangible assets"
      ]
    },
    {
      name: "Seller Financing",
      description: "Seller provides partial financing with downpayment and installments",
      terms: {
        "Typical Down Payment": "30-50%",
        "Financing Term": "3-5 years",
        "Interest Rate": "5-8%"
      },
      benefits: [
        "Lower initial capital requirement",
        "Demonstrates seller's confidence in business",
        "Smooth transition with seller's vested interest"
      ],
      considerations: [
        "Requires strong legal agreements",
        "Need clear performance conditions and defaults"
      ]
    },
    {
      name: "Earn-out Structure",
      description: "Portion of purchase price tied to future business performance",
      terms: {
        "Initial Payment": "60-70%",
        "Earn-out Period": "1-3 years",
        "Performance Metrics": "Revenue or EBITDA targets"
      },
      benefits: [
        "Bridges valuation gaps",
        "Reduces buyer's risk",
        "Incentivizes smooth transition"
      ],
      considerations: [
        "Define clear, measurable performance metrics",
        "Requires detailed legal agreements",
        "May need third-party verification of results"
      ]
    }
  ];
  
  // Recommended structures based on business size
  let recommended = [];
  if (revenue < 500000 || ebitda < 100000) {
    // Small business recommendations
    recommended = [structures[0], structures[1]];
  } else if (revenue < 2000000 || ebitda < 500000) {
    // Medium business recommendations
    recommended = [structures[1], structures[2]];
  } else {
    // Larger business recommendations
    recommended = structures;
  }
  
  // Industry-specific considerations
  const industryConsiderations = {
    'ecommerce': [
      "Consider inventory guarantees at closing",
      "Include transition of digital assets (domains, social media)",
      "Address customer data privacy concerns in agreements"
    ],
    'saas': [
      "Structure for customer contract assignments",
      "Consider escrow for source code",
      "Address recurring revenue verification method"
    ],
    'services': [
      "Strong non-compete and employee retention provisions",
      "Client transition plan with retention incentives",
      "Consider longer transition period with owner"
    ],
    'default': [
      "Document all assumptions used in valuation",
      "Consider tax implications for both parties",
      "Define clear transition plan and timeline"
    ]
  };
  
  const considerations = industryConsiderations[industry.toLowerCase()] || 
                        industryConsiderations.default;
  
  // Generate advice text
  const text = `## Recommended Deal Structures\n\n` +
    recommended.map(structure => 
      `### ${structure.name}\n` +
      `${structure.description}\n\n` +
      `**Key Terms:**\n` +
      (structure.terms ? 
        Object.entries(structure.terms).map(([term, value]) => `- ${term}: ${value}`).join('\n') :
        Object.entries(structure.allocation).map(([type, percent]) => `- ${type}: ${percent}`).join('\n')
      ) +
      `\n\n**Benefits:**\n` +
      structure.benefits.map(benefit => `- ${benefit}`).join('\n') +
      `\n\n**Considerations:**\n` +
      structure.considerations.map(consideration => `- ${consideration}`).join('\n')
    ).join('\n\n') +
    `\n\n## Industry-Specific Considerations\n\n` +
    considerations.map(item => `- ${item}`).join('\n');
  
  return {
    text,
    structures: recommended,
    considerations
  };
}

/**
 * Format a number with commas for thousands
 * 
 * @param {number|string} num - Number to format
 * @returns {string} - Formatted number
 */
function formatNumber(num) {
  if (typeof num === 'string') return num;
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export default {
  processBrokerTask
};
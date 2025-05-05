/**
 * Finance Agent Logic
 * 
 * Core business logic for the Finance Specialist Agent
 * - EBITDA × multiple valuations
 * - Tax scenario analysis
 * - Financial due diligence guidance
 */

import { createTextPart, createDataPart, createMessage } from '../../libs/a2a/utils.js';

// Industry multiple ranges (would come from a database in production)
const INDUSTRY_MULTIPLES = {
  'restaurant': {
    min: 2.5,
    max: 3.5,
    median: 3.0,
    description: 'Food service businesses typically sell for 2.5-3.5× EBITDA depending on location, growth, and brand strength.'
  },
  'retail': {
    min: 3.0,
    max: 4.5,
    median: 3.8,
    description: 'Retail businesses typically sell for 3-4.5× EBITDA depending on location, inventory turnover, and online presence.'
  },
  'ecommerce': {
    min: 3.5,
    max: 5.0,
    median: 4.2,
    description: 'E-commerce businesses typically sell for 3.5-5× EBITDA depending on growth rate, market segment, and customer acquisition costs.'
  },
  'manufacturing': {
    min: 4.0,
    max: 6.0,
    median: 5.0,
    description: 'Manufacturing businesses typically sell for 4-6× EBITDA depending on equipment age, IP portfolio, and customer concentration.'
  },
  'saas': {
    min: 6.0,
    max: 10.0,
    median: 8.0,
    description: 'SaaS businesses typically sell for 6-10× ARR depending on growth rate, churn, and CAC/LTV metrics.'
  },
  'professional_services': {
    min: 2.0,
    max: 3.0,
    median: 2.5,
    description: 'Professional service firms typically sell for 2-3× EBITDA depending on client retention, partner dependency, and revenue predictability.'
  },
  'construction': {
    min: 3.0, 
    max: 4.0,
    median: 3.5,
    description: 'Construction businesses typically sell for 3-4× EBITDA depending on backlog, equipment ownership, and licensing.'
  },
  'default': {
    min: 3.0,
    max: 5.0,
    median: 4.0,
    description: 'Most small-to-medium brick-and-mortar businesses typically sell for 3-5× EBITDA.'
  }
};

// Tax scenarios by country (would be more extensive in production)
const TAX_SCENARIOS = {
  'uk': {
    'asset_sale': {
      name: 'Asset Sale (UK)',
      description: 'Sale of business assets rather than shares',
      considerations: [
        {
          name: 'Capital Gains Tax',
          description: 'Business asset disposal relief (formerly Entrepreneurs' Relief) may reduce CGT to 10% on qualifying assets up to the lifetime limit of £1 million.',
          impact: 'medium'
        },
        {
          name: 'VAT',
          description: 'VAT may be charged on asset transfers, though Transfer of Going Concern (TOGC) rules may apply if conditions are met.',
          impact: 'high'
        },
        {
          name: 'Stamp Duty',
          description: 'Stamp Duty Land Tax applies to property transfers at progressive rates.',
          impact: 'medium'
        }
      ]
    },
    'share_sale': {
      name: 'Share Sale (UK)',
      description: 'Sale of company shares rather than underlying assets',
      considerations: [
        {
          name: 'Capital Gains Tax',
          description: 'Business asset disposal relief may apply, reducing CGT to 10% up to lifetime limit.',
          impact: 'medium'
        },
        {
          name: 'Stamp Duty',
          description: '0.5% stamp duty on share transfers above £1,000.',
          impact: 'low'
        },
        {
          name: 'Inheritance Tax',
          description: 'Business Relief may provide up to 100% relief from inheritance tax if shares were held for at least 2 years.',
          impact: 'high'
        }
      ]
    }
  },
  'usa': {
    'asset_sale': {
      name: 'Asset Sale (USA)',
      description: 'Sale of business assets rather than entity ownership',
      considerations: [
        {
          name: 'Federal Income Tax',
          description: 'Seller pays ordinary income tax on assets sold above depreciated value, and capital gains tax on appreciated assets.',
          impact: 'high'
        },
        {
          name: 'State and Local Taxes',
          description: 'Sales tax may apply to tangible assets, varying by state and locality.',
          impact: 'medium'
        },
        {
          name: 'Depreciation Recapture',
          description: 'Depreciation previously claimed may be recaptured at 25% rate for real property or ordinary income rates for other assets.',
          impact: 'medium'
        }
      ]
    },
    'stock_sale': {
      name: 'Stock Sale (USA)',
      description: 'Sale of company stock rather than underlying assets',
      considerations: [
        {
          name: 'Capital Gains Tax',
          description: 'Long-term capital gains rates (0%, 15%, or 20% depending on income bracket) apply if stock held > 1 year.',
          impact: 'medium'
        },
        {
          name: 'Section 1202 QSBS Exclusion',
          description: 'Qualified Small Business Stock may exclude up to 100% of capital gains if held > 5 years (limits apply).',
          impact: 'high'
        },
        {
          name: 'Net Investment Income Tax',
          description: '3.8% additional tax may apply to net investment income for high income sellers.',
          impact: 'low'
        }
      ]
    }
  }
};

/**
 * Process a finance agent task based on the request message
 * 
 * @param {object} task - A2A task object
 * @param {object} message - A2A message object
 * @returns {Promise<object>} - Response with task and message
 */
export async function processFinanceTask(task, message) {
  // Extract text from message parts
  const textParts = message.parts.filter(part => part.type === 'text');
  const dataParts = message.parts.filter(part => part.type === 'data');
  
  if (textParts.length === 0) {
    throw new Error('Invalid request: No text parts found in message');
  }
  
  const query = textParts[0].text.toLowerCase();
  
  // Determine the type of finance request based on the query
  if (query.includes('valuation') || query.includes('value') || query.includes('worth') || query.includes('multiple')) {
    return handleValuationRequest(task, message, query, dataParts[0]?.data);
  } else if (query.includes('tax') || query.includes('capital gains') || query.includes('taxation')) {
    return handleTaxScenarioRequest(task, message, query, dataParts[0]?.data);
  } else {
    return handleGeneralFinanceRequest(task, message, query);
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
  // Extract valuation parameters from query and structured data
  const valuationParams = extractValuationParameters(query, data);
  
  // Calculate business valuation
  const valuation = calculateBusinessValuation(valuationParams);
  
  // Include comparable businesses if available
  const comparableSales = findComparableSales(valuationParams);
  
  // Adjust task state to completed
  const responseTask = {
    ...task,
    state: 'completed'
  };
  
  // Prepare response message with valuation
  const responseMessage = createMessage([
    createTextPart(formatValuationResponse(valuation, valuationParams, comparableSales)),
    createDataPart({
      valuation: {
        value: valuation.value,
        range: {
          low: valuation.rangeLow,
          high: valuation.rangeHigh
        },
        metrics: valuation.metrics,
        industry: valuationParams.industry,
        multiple: valuation.multipleUsed
      },
      comparables: comparableSales,
      parameters: valuationParams
    }, 'valuation_data')
  ]);
  
  return { task: responseTask, message: responseMessage };
}

/**
 * Handle a tax scenario analysis request
 * 
 * @param {object} task - A2A task object
 * @param {object} message - A2A message object
 * @param {string} query - The user's query text
 * @param {object} data - Optional structured data
 * @returns {object} - Response with task and message
 */
async function handleTaxScenarioRequest(task, message, query, data = {}) {
  // Extract tax scenario parameters
  const taxParams = extractTaxParameters(query, data);
  
  // Get tax scenarios for the country
  const scenarios = getTaxScenarios(taxParams);
  
  // Adjust task state to completed
  const responseTask = {
    ...task,
    state: 'completed'
  };
  
  // Prepare response message with tax scenarios
  const responseMessage = createMessage([
    createTextPart(formatTaxScenarioResponse(scenarios, taxParams)),
    createDataPart({
      scenarios: scenarios,
      country: taxParams.country,
      businessType: taxParams.businessType,
      parameters: taxParams
    }, 'tax_scenario_data')
  ]);
  
  return { task: responseTask, message: responseMessage };
}

/**
 * Handle general finance-related questions
 * 
 * @param {object} task - A2A task object
 * @param {object} message - A2A message object
 * @param {string} query - The user's query text
 * @returns {object} - Response with task and message
 */
async function handleGeneralFinanceRequest(task, message, query) {
  // Generate general finance guidance
  let response = "As your financial advisor for business transactions, I can help with:\n\n" +
                 "- Business valuations using EBITDA × multiple method\n" +
                 "- Tax implications of different sale structures\n" +
                 "- Financial due diligence checklists\n\n" +
                 "Could you provide more details about your business and what specific financial information you need?";
  
  // Check if the query contains some industry mentions
  if (query.includes('restaurant') || query.includes('cafe') || query.includes('food')) {
    response = "For restaurant businesses, key financial considerations include:\n\n" +
               "- Typical valuation multiples range from 2.5-3.5× EBITDA\n" +
               "- Cash flow verification is critical (many restaurants have cash transactions)\n" +
               "- Lease terms significantly impact valuation\n" +
               "- Inventory valuation methods matter for tax treatment\n\n" +
               "Would you like a detailed valuation analysis or tax scenario for your restaurant business?";
  } else if (query.includes('ecommerce') || query.includes('online') || query.includes('digital')) {
    response = "For e-commerce businesses, key financial considerations include:\n\n" +
               "- Typical valuation multiples range from 3.5-5× EBITDA\n" +
               "- SDE (Seller's Discretionary Earnings) is often used instead of EBITDA\n" +
               "- Customer acquisition costs and retention rates impact valuation\n" +
               "- Inventory turnover and shipping logistics affect working capital needs\n\n" +
               "Would you like a detailed valuation analysis or tax scenario for your e-commerce business?";
  }
  
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
 * Extract parameters for valuation from query and data
 * 
 * @param {string} query - The user's query text
 * @param {object} data - Optional structured data
 * @returns {object} - Extracted valuation parameters
 */
function extractValuationParameters(query, data = {}) {
  // Start with any provided structured data
  const params = { ...data };
  
  // Default values if not specified
  if (!params.industry) params.industry = "default";
  if (!params.currency) params.currency = "GBP";
  if (!params.ebitda && !params.revenue) {
    params.ebitda = 0;
    params.revenue = 0;
  }
  
  // Extract industry if mentioned
  if (query.includes('restaurant') || query.includes('cafe') || query.includes('food service')) {
    params.industry = 'restaurant';
  } else if (query.includes('retail') || query.includes('shop') || query.includes('store')) {
    params.industry = 'retail';
  } else if (query.includes('ecommerce') || query.includes('online store')) {
    params.industry = 'ecommerce';
  } else if (query.includes('manufacturing')) {
    params.industry = 'manufacturing';
  } else if (query.includes('saas') || query.includes('software')) {
    params.industry = 'saas';
  } else if (query.includes('professional') || query.includes('consultant') || query.includes('agency')) {
    params.industry = 'professional_services';
  } else if (query.includes('construction') || query.includes('contractor')) {
    params.industry = 'construction';
  }
  
  // Extract EBITDA if mentioned
  const ebitdaMatch = query.match(/ebitda (?:of|is|at|about|around)? [£$€]?(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:k|m|thousand|million|bn|billion)?/i);
  if (ebitdaMatch) {
    let ebitda = parseFloat(ebitdaMatch[1].replace(/,/g, ''));
    
    // Handle scale
    if (ebitdaMatch[0].includes('k') || ebitdaMatch[0].includes('thousand')) {
      ebitda *= 1000;
    } else if (ebitdaMatch[0].includes('m') || ebitdaMatch[0].includes('million')) {
      ebitda *= 1000000;
    } else if (ebitdaMatch[0].includes('bn') || ebitdaMatch[0].includes('billion')) {
      ebitda *= 1000000000;
    }
    
    params.ebitda = ebitda;
  }
  
  // Extract revenue if mentioned
  const revenueMatch = query.match(/revenue (?:of|is|at|about|around)? [£$€]?(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:k|m|thousand|million|bn|billion)?/i);
  if (revenueMatch) {
    let revenue = parseFloat(revenueMatch[1].replace(/,/g, ''));
    
    // Handle scale
    if (revenueMatch[0].includes('k') || revenueMatch[0].includes('thousand')) {
      revenue *= 1000;
    } else if (revenueMatch[0].includes('m') || revenueMatch[0].includes('million')) {
      revenue *= 1000000;
    } else if (revenueMatch[0].includes('bn') || revenueMatch[0].includes('billion')) {
      revenue *= 1000000000;
    }
    
    params.revenue = revenue;
  }
  
  // Extract multiple if specified
  const multipleMatch = query.match(/(\d+(?:\.\d+)?)\s*(?:x|times|×)\s*(?:multiple|ebitda)/i);
  if (multipleMatch) {
    params.requestedMultiple = parseFloat(multipleMatch[1]);
  }
  
  // Extract currency if mentioned
  if (query.includes('£') || query.includes('gbp') || query.includes('pounds')) {
    params.currency = 'GBP';
  } else if (query.includes('$') || query.includes('usd') || query.includes('dollars')) {
    params.currency = 'USD';
  } else if (query.includes('€') || query.includes('eur') || query.includes('euros')) {
    params.currency = 'EUR';
  }
  
  // If no explicit EBITDA but we have revenue, estimate EBITDA
  if (params.revenue > 0 && !params.ebitda) {
    // Simple industry margins estimates
    const margins = {
      'restaurant': 0.08,
      'retail': 0.06,
      'ecommerce': 0.12,
      'manufacturing': 0.14,
      'saas': 0.20,
      'professional_services': 0.18,
      'construction': 0.10,
      'default': 0.12
    };
    
    params.ebitda = params.revenue * (margins[params.industry] || margins.default);
    params.ebitdaEstimated = true;
  }
  
  return params;
}

/**
 * Extract parameters for tax scenario analysis
 * 
 * @param {string} query - The user's query text
 * @param {object} data - Optional structured data
 * @returns {object} - Extracted tax parameters
 */
function extractTaxParameters(query, data = {}) {
  // Start with any provided structured data
  const params = { ...data };
  
  // Default values
  if (!params.country) params.country = "uk";
  if (!params.saleType) params.saleType = "asset_sale";
  if (!params.businessType) params.businessType = "default";
  
  // Extract country if mentioned
  if (query.includes('uk') || query.includes('united kingdom') || query.includes('britain')) {
    params.country = 'uk';
  } else if (query.includes('us') || query.includes('united states') || query.includes('america')) {
    params.country = 'usa';
  }
  
  // Extract sale type if mentioned
  if (query.includes('asset sale') || query.includes('selling assets')) {
    params.saleType = 'asset_sale';
  } else if (query.includes('share sale') || query.includes('stock sale') || query.includes('selling shares')) {
    params.saleType = params.country === 'usa' ? 'stock_sale' : 'share_sale';
  }
  
  // Extract business type if mentioned
  if (query.includes('restaurant') || query.includes('cafe') || query.includes('food service')) {
    params.businessType = 'restaurant';
  } else if (query.includes('retail') || query.includes('shop')) {
    params.businessType = 'retail';
  } else if (query.includes('ecommerce') || query.includes('online')) {
    params.businessType = 'ecommerce';
  }
  
  return params;
}

/**
 * Calculate business valuation using EBITDA × multiple
 * 
 * @param {object} params - Valuation parameters
 * @returns {object} - Valuation results
 */
function calculateBusinessValuation(params) {
  const { ebitda, industry, requestedMultiple } = params;
  
  // Get multiple range for the industry
  const multipleRange = INDUSTRY_MULTIPLES[industry] || INDUSTRY_MULTIPLES.default;
  
  // Use requested multiple if specified, otherwise use median for industry
  const multipleUsed = requestedMultiple || multipleRange.median;
  
  // Calculate valuation
  const value = ebitda * multipleUsed;
  
  // Calculate valuation range
  const rangeLow = ebitda * multipleRange.min;
  const rangeHigh = ebitda * multipleRange.max;
  
  // Prepare metrics for comparison
  const metrics = {
    ebitdaMultiple: multipleUsed,
    industryMinMultiple: multipleRange.min,
    industryMaxMultiple: multipleRange.max,
    industryMedianMultiple: multipleRange.median
  };
  
  return {
    value,
    rangeLow,
    rangeHigh,
    metrics,
    multipleUsed,
    multipleDescription: multipleRange.description
  };
}

/**
 * Look up comparable business sales
 * 
 * @param {object} params - Search parameters
 * @returns {Array<object>} - List of comparable sales
 */
function findComparableSales(params) {
  // In a real system, this would query a database of recent sales
  // Here we'll just generate some realistic samples
  
  const { industry, ebitda, revenue } = params;
  const industryInfo = INDUSTRY_MULTIPLES[industry] || INDUSTRY_MULTIPLES.default;
  const comparables = [];
  
  // Generate 3 comparable sales with slight variations
  for (let i = 0; i < 3; i++) {
    // Vary EBITDA by +/- 20%
    const variationFactor = 0.8 + (Math.random() * 0.4); // Between 0.8 and 1.2
    const compEbitda = Math.round(ebitda * variationFactor);
    
    // Vary multiple within industry range
    const multipleRange = industryInfo.max - industryInfo.min;
    const multiple = industryInfo.min + (Math.random() * multipleRange);
    const roundedMultiple = Math.round(multiple * 10) / 10; // Round to 1 decimal place
    
    // Calculate sale price
    const salePrice = Math.round(compEbitda * roundedMultiple);
    
    // Generate some realistic company details
    const companyNames = {
      'restaurant': ['TastyBites', 'Urban Kitchen', 'Flavor Fusion'],
      'retail': ['StyleHub', 'EverydayGoods', 'MerchandisePlus'],
      'ecommerce': ['ClickCart', 'WebWares', 'DigitalMart'],
      'manufacturing': ['PrecisionParts', 'IndustrialWorks', 'AssemblyPro'],
      'saas': ['CloudSolutions', 'DataFlow', 'TechWave'],
      'professional_services': ['ExpertConsult', 'AdvisoryGroup', 'SpecialistFirm'],
      'construction': ['BuildRight', 'StructureTeam', 'DevelopmentCrew'],
      'default': ['BusinessVentures', 'EnterpriseSolutions', 'CompanyGroup']
    };
    
    const regions = ['London', 'Manchester', 'Birmingham', 'Edinburgh', 'Leeds', 'Bristol'];
    
    // Add comparable to list
    comparables.push({
      businessName: companyNames[industry]?.[i] || companyNames.default[i],
      industry,
      region: regions[Math.floor(Math.random() * regions.length)],
      ebitda: compEbitda,
      multiple: roundedMultiple,
      salePrice,
      saleDate: getRandomRecentDate()
    });
  }
  
  return comparables;
}

/**
 * Get tax scenarios based on parameters
 * 
 * @param {object} params - Tax scenario parameters
 * @returns {Array<object>} - Tax scenarios
 */
function getTaxScenarios(params) {
  const { country, saleType } = params;
  
  // Get country scenarios
  const countryScenarios = TAX_SCENARIOS[country] || TAX_SCENARIOS.uk;
  
  // Get scenario for sale type
  const scenario = countryScenarios[saleType];
  
  // If no specific scenario found, return all scenarios
  if (!scenario) {
    return Object.values(countryScenarios);
  }
  
  return [scenario];
}

/**
 * Format valuation response for human-readable output
 * 
 * @param {object} valuation - Valuation results
 * @param {object} params - Valuation parameters
 * @param {Array<object>} comparableSales - Comparable business sales
 * @returns {string} - Formatted valuation response
 */
function formatValuationResponse(valuation, params, comparableSales) {
  const { ebitda, revenue, currency, industry, ebitdaEstimated } = params;
  const { value, rangeLow, rangeHigh, multipleUsed, multipleDescription } = valuation;
  
  // Format currency values
  const formatCurrency = (value) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M ${currency}`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K ${currency}`;
    } else {
      return `${value.toFixed(0)} ${currency}`;
    }
  };
  
  // Starting with the valuation summary
  let response = `# Business Valuation Analysis\n\n`;
  response += `## Estimated Value\n\n`;
  response += `**${formatCurrency(value)}** _(range: ${formatCurrency(rangeLow)} - ${formatCurrency(rangeHigh)})_\n\n`;
  
  // Add calculation method
  response += `## Calculation Method\n\n`;
  response += `This valuation uses the EBITDA multiple method with a multiple of **${multipleUsed.toFixed(1)}×**\n\n`;
  response += `${multipleDescription}\n\n`;
  
  // Add financial metrics
  response += `## Financial Metrics\n\n`;
  
  if (ebitdaEstimated) {
    response += `- Annual Revenue: ${formatCurrency(revenue)}\n`;
    response += `- Estimated EBITDA: ${formatCurrency(ebitda)} (estimated from industry averages)\n`;
  } else {
    response += `- EBITDA: ${formatCurrency(ebitda)}\n`;
    if (revenue) {
      response += `- Annual Revenue: ${formatCurrency(revenue)}\n`;
      response += `- EBITDA Margin: ${((ebitda / revenue) * 100).toFixed(1)}%\n`;
    }
  }
  
  response += `- Industry: ${industry.charAt(0).toUpperCase() + industry.slice(1).replace('_', ' ')}\n\n`;
  
  // Add comparable sales
  if (comparableSales && comparableSales.length > 0) {
    response += `## Recent Comparable Sales\n\n`;
    
    comparableSales.forEach((comp, index) => {
      response += `### ${index + 1}. ${comp.businessName}\n`;
      response += `- Sale Price: ${formatCurrency(comp.salePrice)}\n`;
      response += `- EBITDA: ${formatCurrency(comp.ebitda)}\n`;
      response += `- Multiple: ${comp.multiple.toFixed(1)}×\n`;
      response += `- Region: ${comp.region}\n`;
      response += `- Sale Date: ${comp.saleDate}\n\n`;
    });
  }
  
  // Add disclaimer
  response += `## Disclaimer\n\n`;
  response += `This valuation is an estimate based on the information provided and industry benchmarks. `;
  response += `Actual market value may vary based on specific business attributes, market conditions, and buyer interest. `;
  response += `For a more precise valuation, consider engaging a certified business appraiser.`;
  
  return response;
}

/**
 * Format tax scenario response for human-readable output
 * 
 * @param {Array<object>} scenarios - Tax scenarios
 * @param {object} params - Tax parameters
 * @returns {string} - Formatted tax scenario response
 */
function formatTaxScenarioResponse(scenarios, params) {
  const { country, saleType, businessType } = params;
  
  let response = `# Business Sale Tax Analysis\n\n`;
  
  // Add sale structure information
  response += `## Sale Structure\n\n`;
  response += `You're considering a **${formatSaleType(saleType)}** in **${formatCountry(country)}**`;
  if (businessType !== 'default') {
    response += ` for a **${businessType.replace('_', ' ')}** business`;
  }
  response += `.\n\n`;
  
  // Add scenarios
  scenarios.forEach(scenario => {
    response += `## ${scenario.name}\n\n`;
    response += `${scenario.description}\n\n`;
    
    response += `### Key Tax Considerations\n\n`;
    
    scenario.considerations.forEach((consideration, index) => {
      response += `#### ${index + 1}. ${consideration.name}\n\n`;
      response += `${consideration.description}\n\n`;
      
      if (consideration.impact) {
        const impactIcon = consideration.impact === 'high' ? '⚠️ High Impact' : 
                          consideration.impact === 'medium' ? '⚠ Medium Impact' : 
                          '• Low Impact';
        response += `**Impact Level:** ${impactIcon}\n\n`;
      }
    });
  });
  
  // Add practical next steps
  response += `## Recommended Next Steps\n\n`;
  response += `1. **Consult a Tax Specialist** - Tax laws are complex and frequently change. Consult with a qualified tax advisor familiar with business sales.\n\n`;
  response += `2. **Pre-Sale Tax Planning** - Consider restructuring options before listing your business to optimize tax efficiency.\n\n`;
  response += `3. **Document All Business Assets** - Keep detailed records of purchase dates and costs for all business assets to accurately calculate potential gains.\n\n`;
  
  // Add disclaimer
  response += `## Disclaimer\n\n`;
  response += `This information is provided for general guidance only and is not a substitute for professional tax advice. `;
  response += `Tax regulations may change, and specific requirements may apply to your situation. `;
  response += `It is recommended to consult with a qualified tax professional before making decisions about your business sale.`;
  
  return response;
}

/**
 * Helper function to format sale type for display
 * 
 * @param {string} saleType - Sale type code
 * @returns {string} - Formatted sale type
 */
function formatSaleType(saleType) {
  switch (saleType) {
    case 'asset_sale':
      return 'Asset Sale';
    case 'share_sale':
      return 'Share Sale';
    case 'stock_sale':
      return 'Stock Sale';
    default:
      return saleType;
  }
}

/**
 * Helper function to format country for display
 * 
 * @param {string} country - Country code
 * @returns {string} - Formatted country name
 */
function formatCountry(country) {
  switch (country) {
    case 'uk':
      return 'United Kingdom';
    case 'usa':
      return 'United States';
    default:
      return country.toUpperCase();
  }
}

/**
 * Generate a random recent date for comparable sales
 * 
 * @returns {string} - Formatted date string
 */
function getRandomRecentDate() {
  const today = new Date();
  const monthsAgo = Math.floor(Math.random() * 18); // Random date within last 18 months
  
  const date = new Date(today);
  date.setMonth(today.getMonth() - monthsAgo);
  
  const options = { year: 'numeric', month: 'short' };
  return date.toLocaleDateString('en-GB', options);
}

export default {
  processFinanceTask
};
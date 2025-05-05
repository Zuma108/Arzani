/**
 * Legal Agent Logic
 * 
 * Core business logic for the Legal Specialist Agent
 * - NDA generation
 * - Compliance lookup
 * - Regulatory guidance
 */

import { createTextPart, createDataPart, createMessage } from '../../libs/a2a/utils.js';

// Regulatory compliance database (would come from a real database in production)
const COMPLIANCE_DATABASE = {
  'usa': {
    'federal': {
      'securities': {
        'code': 'SEC Rule 10b-5',
        'description': 'Anti-fraud provisions that apply to securities transactions',
        'expires': '2029-12-31',
        'link': 'https://www.sec.gov/rules/final/33-8400.htm'
      },
      'business_sale': {
        'code': 'FTC 16 CFR Part 436',
        'description': 'Franchise Rule - may apply to business sales with ongoing relationships',
        'expires': '2028-07-01',
        'link': 'https://www.ftc.gov/enforcement/rules/rulemaking-regulatory-reform-proceedings/franchise-rule'
      }
    },
    'california': {
      'business_sale': {
        'code': 'CA Corp Code § 25102',
        'description': 'California securities exemptions for business sales',
        'expires': '2026-01-01',
        'link': 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml'
      }
    },
    'new_york': {
      'business_sale': {
        'code': 'NY Gen Bus Law § 359-e',
        'description': 'New York securities registration requirements',
        'expires': '2027-06-30',
        'link': 'https://www.nysenate.gov/legislation/laws/GBS/359-E'
      }
    }
  },
  'uk': {
    'national': {
      'business_sale': {
        'code': 'UK Companies Act 2006',
        'description': 'Governs transfer of business ownership in the UK',
        'expires': '2030-12-31',
        'link': 'https://www.legislation.gov.uk/ukpga/2006/46/contents'
      },
      'data_protection': {
        'code': 'UK GDPR and Data Protection Act 2018',
        'description': 'Data protection requirements that impact business transfers',
        'expires': '2028-05-25',
        'link': 'https://ico.org.uk/for-organisations/guide-to-data-protection/'
      }
    }
  },
  'eu': {
    'union': {
      'business_sale': {
        'code': 'Council Directive 2001/23/EC',
        'description': 'EU directive on protecting employees in business transfers',
        'expires': '2031-03-12',
        'link': 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A32001L0023'
      }
    }
  }
};

// NDA templates for different jurisdictions
const NDA_TEMPLATES = {
  'general': {
    'title': 'General Non-Disclosure Agreement',
    'description': 'Standard NDA for business sale discussions',
    'content': [
      '# CONFIDENTIALITY AND NON-DISCLOSURE AGREEMENT',
      '',
      'This Confidentiality and Non-Disclosure Agreement (the "Agreement") is entered into as of the date of last signature below ("Effective Date"), by and between:',
      '',
      '**Disclosing Party**: {SELLER_NAME}, having its principal place of business at {SELLER_ADDRESS} ("Seller"), and',
      '',
      '**Receiving Party**: {BUYER_NAME}, having its principal place of business at {BUYER_ADDRESS} ("Buyer").',
      '',
      '## 1. PURPOSE',
      '',
      'The parties wish to explore a potential business transaction involving the potential sale of Seller\'s business (the "Purpose"). In connection with the Purpose, Receiving Party may receive certain confidential and proprietary information from Disclosing Party.',
      '',
      '## 2. CONFIDENTIAL INFORMATION',
      '',
      '"Confidential Information" means all non-public information relating to the Disclosing Party or its business that is designated as confidential or that, given the nature of the information or circumstances surrounding its disclosure, reasonably should be considered as confidential. This includes, without limitation, business plans, financial information, customer lists, pricing, marketing strategies, proprietary technology, trade secrets, and other sensitive information.',
      '',
      '## 3. OBLIGATIONS OF RECEIVING PARTY',
      '',
      'Receiving Party agrees to:',
      '',
      '(a) Use the Confidential Information solely for the Purpose;',
      '(b) Maintain the Confidential Information in strict confidence;',
      '(c) Not disclose the Confidential Information to any third party without prior written consent;',
      '(d) Limit access to those employees, agents, and representatives who need to know such information; and',
      '(e) Return or destroy all Confidential Information upon request or when no longer needed for the Purpose.',
      '',
      '## 4. TERM',
      '',
      'This Agreement shall remain in effect for a period of {TERM_LENGTH} years from the Effective Date.',
      '',
      '## 5. GOVERNING LAW',
      '',
      'This Agreement shall be governed by the laws of {JURISDICTION} without regard to its conflict of laws principles.',
      '',
      '## 6. SIGNATURE BLOCKS',
      '',
      'IN WITNESS WHEREOF, the parties have executed this Agreement as of the Effective Date.',
      '',
      '**DISCLOSING PARTY (SELLER)**',
      '',
      'Signature: ________________________',
      '',
      'Name: ___________________________',
      '',
      'Title: ____________________________',
      '',
      'Date: ____________________________',
      '',
      '**RECEIVING PARTY (BUYER)**',
      '',
      'Signature: ________________________',
      '',
      'Name: ___________________________',
      '',
      'Title: ____________________________',
      '',
      'Date: ____________________________'
    ]
  },
  'uk': {
    'title': 'UK-Specific Non-Disclosure Agreement',
    'description': 'NDA template for use in United Kingdom business transactions',
    'content': [
      '# CONFIDENTIALITY AND NON-DISCLOSURE AGREEMENT',
      '',
      'This Confidentiality and Non-Disclosure Agreement (the "Agreement") is entered into as of the date of last signature below (the "Effective Date"),',
      '',
      '**BETWEEN**',
      '',
      '**Disclosing Party**: {SELLER_NAME}, a company registered in {SELLER_JURISDICTION} with company number {SELLER_REG_NUMBER} and having its registered office at {SELLER_ADDRESS} (the "Seller"), and',
      '',
      '**Receiving Party**: {BUYER_NAME}, a company registered in {BUYER_JURISDICTION} with company number {BUYER_REG_NUMBER} and having its registered office at {BUYER_ADDRESS} (the "Buyer").',
      '',
      'Each a "Party" and together the "Parties".',
      '',
      '## 1. BACKGROUND AND PURPOSE',
      '',
      'The Parties wish to explore a potential business transaction involving the potential sale of the Seller\'s business (the "Purpose"). In connection with the Purpose, the Receiving Party may receive certain confidential and proprietary information from the Disclosing Party.',
      '',
      '## 2. DEFINITIONS',
      '',
      'In this Agreement:',
      '',
      '"Confidential Information" means all information (whether in oral, written or electronic form) relating to the Disclosing Party\'s business, including but not limited to technical or commercial know-how, specifications, inventions, processes or initiatives, plans, product details, financial information, customer information, business methods and strategies, that is designated as confidential or that reasonably should be understood to be confidential given the nature of the information and the circumstances of disclosure.',
      '',
      '## 3. OBLIGATIONS OF RECEIVING PARTY',
      '',
      'The Receiving Party agrees:',
      '',
      '(a) To keep the Confidential Information secret and confidential;',
      '(b) To use the Confidential Information solely for the Purpose;',
      '(c) Not to disclose the Confidential Information to any third party without the Disclosing Party\'s prior written consent, except to professional advisers who are bound by confidentiality obligations;',
      '(d) To apply the same security measures and degree of care to the Confidential Information as the Receiving Party applies to its own confidential information, which shall be no less than reasonable care;',
      '(e) To inform its employees or professional advisers who have access to the Confidential Information of the confidential nature of the information and their obligations with respect to it;',
      '(f) To return or destroy all Confidential Information upon request or upon completion of the Purpose.',
      '',
      '## 4. TERM AND TERMINATION',
      '',
      'This Agreement shall remain in force for a period of {TERM_LENGTH} years from the Effective Date.',
      '',
      '## 5. GOVERNING LAW AND JURISDICTION',
      '',
      'This Agreement and any dispute or claim arising out of or in connection with it shall be governed by and construed in accordance with the laws of England and Wales. The parties irrevocably agree that the courts of England and Wales shall have exclusive jurisdiction to settle any dispute or claim that arises out of or in connection with this Agreement.',
      '',
      '## 6. DATA PROTECTION',
      '',
      'Each Party shall comply with all applicable requirements of the UK Data Protection Legislation. This clause is in addition to, and does not relieve, remove or replace, a Party\'s obligations under the Data Protection Legislation.',
      '',
      '## 7. SIGNATURE BLOCKS',
      '',
      'IN WITNESS WHEREOF, the parties have executed this Agreement as of the Effective Date.',
      '',
      '**SIGNED by or on behalf of the DISCLOSING PARTY (SELLER)**',
      '',
      'Signature: ________________________',
      '',
      'Name: ___________________________',
      '',
      'Title: ____________________________',
      '',
      'Date: ____________________________',
      '',
      '**SIGNED by or on behalf of the RECEIVING PARTY (BUYER)**',
      '',
      'Signature: ________________________',
      '',
      'Name: ___________________________',
      '',
      'Title: ____________________________',
      '',
      'Date: ____________________________'
    ]
  }
};

/**
 * Process a legal agent task based on the request message
 * 
 * @param {object} task - A2A task object
 * @param {object} message - A2A message object
 * @returns {Promise<object>} - Response with task and message
 */
export async function processLegalTask(task, message) {
  // Extract text from message parts
  const textParts = message.parts.filter(part => part.type === 'text');
  const dataParts = message.parts.filter(part => part.type === 'data');
  
  if (textParts.length === 0) {
    throw new Error('Invalid request: No text parts found in message');
  }
  
  const query = textParts[0].text.toLowerCase();
  
  // Determine the type of legal request based on the query
  if (query.includes('nda') || query.includes('non-disclosure') || query.includes('confidentiality')) {
    return handleNdaRequest(task, message, query, dataParts[0]?.data);
  } else if (query.includes('compliance') || query.includes('regulation') || query.includes('legal requirement')) {
    return handleComplianceRequest(task, message, query, dataParts[0]?.data);
  } else {
    return handleGeneralLegalRequest(task, message, query);
  }
}

/**
 * Handle a request for NDA generation
 * 
 * @param {object} task - A2A task object
 * @param {object} message - A2A message object
 * @param {string} query - The user's query text
 * @param {object} data - Optional structured data
 * @returns {object} - Response with task and message
 */
async function handleNdaRequest(task, message, query, data = {}) {
  // Extract parameters for NDA generation
  const ndaParams = extractNdaParameters(query, data);
  
  // Select appropriate NDA template based on jurisdiction
  const templateKey = ndaParams.jurisdiction === 'uk' ? 'uk' : 'general';
  const template = NDA_TEMPLATES[templateKey];
  
  // Fill in template with parameters
  const ndaDocument = generateNdaDocument(template, ndaParams);
  
  // Adjust task state to completed
  const responseTask = {
    ...task,
    state: 'completed'
  };
  
  // Prepare response message with NDA document
  const responseMessage = createMessage([
    createTextPart(`I've prepared a ${template.title} based on your request. This is suitable for ${ndaParams.jurisdiction || 'general'} business sale discussions.`),
    createTextPart(ndaDocument),
    createDataPart({
      documentType: 'nda',
      title: template.title,
      jurisdiction: ndaParams.jurisdiction || 'general',
      customizations: ndaParams
    }, 'nda_metadata')
  ]);
  
  return { task: responseTask, message: responseMessage };
}

/**
 * Handle a request for compliance information
 * 
 * @param {object} task - A2A task object
 * @param {object} message - A2A message object
 * @param {string} query - The user's query text
 * @param {object} data - Optional structured data
 * @returns {object} - Response with task and message
 */
async function handleComplianceRequest(task, message, query, data = {}) {
  // Extract compliance lookup parameters
  const complianceParams = extractComplianceParameters(query, data);
  
  // Look up compliance information
  const complianceInfo = lookupComplianceInfo(complianceParams);
  
  // Adjust task state to completed
  const responseTask = {
    ...task,
    state: 'completed'
  };
  
  // Prepare response message with compliance information
  const responseMessage = createMessage([
    createTextPart(`Based on your business type and location, I've identified the following regulatory considerations for your business sale:`),
    createTextPart(formatComplianceInfo(complianceInfo)),
    createDataPart({
      compliance: complianceInfo,
      jurisdiction: complianceParams.jurisdiction,
      businessType: complianceParams.businessType,
      queryParameters: complianceParams
    }, 'compliance_data')
  ]);
  
  return { task: responseTask, message: responseMessage };
}

/**
 * Handle general legal-related questions
 * 
 * @param {object} task - A2A task object
 * @param {object} message - A2A message object
 * @param {string} query - The user's query text
 * @returns {object} - Response with task and message
 */
async function handleGeneralLegalRequest(task, message, query) {
  // Generate general legal guidance
  let response = "As your legal advisor, I can help with various aspects of business transactions, including:\n\n" +
                 "- Preparing Non-Disclosure Agreements (NDAs)\n" +
                 "- Providing regulatory compliance information\n" +
                 "- Advising on legal requirements for business sales\n\n" +
                 "Could you provide more specific details about your legal needs so I can assist you better?";
  
  // Check if the query contains some business type mentions
  if (query.includes('restaurant') || query.includes('cafe') || query.includes('food')) {
    response = "For food service businesses, important legal considerations include:\n\n" +
               "- Food safety licensing transfers\n" +
               "- Health department permits and inspections\n" +
               "- Liquor license transfers (if applicable)\n" +
               "- Lease assignment provisions\n\n" +
               "Would you like me to prepare an NDA for a restaurant business sale or provide specific compliance information?";
  } else if (query.includes('ecommerce') || query.includes('online') || query.includes('digital')) {
    response = "For ecommerce businesses, key legal considerations include:\n\n" +
               "- Digital asset transfers (domains, social accounts)\n" +
               "- Customer data transfer compliance (GDPR, CCPA)\n" +
               "- Intellectual property assignments\n" +
               "- Third-party service provider contracts\n\n" +
               "Would you like me to prepare an NDA for an ecommerce business sale or provide specific compliance information?";
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
 * Extract parameters for NDA generation from query and data
 * 
 * @param {string} query - The user's query text
 * @param {object} data - Optional structured data
 * @returns {object} - Extracted NDA parameters
 */
function extractNdaParameters(query, data = {}) {
  // Start with any provided structured data
  const params = { ...data };
  
  // Default values
  if (!params.termLength) params.termLength = "3";
  if (!params.jurisdiction) params.jurisdiction = "general";
  
  // Extract jurisdiction if mentioned
  if (query.includes('uk') || query.includes('united kingdom') || query.includes('england')) {
    params.jurisdiction = 'uk';
  } else if (query.includes('us') || query.includes('united states') || query.includes('america')) {
    params.jurisdiction = 'usa';
  } else if (query.includes('eu') || query.includes('europe')) {
    params.jurisdiction = 'eu';
  }
  
  // Extract term length if mentioned
  const termMatch = query.match(/(\d+)\s*(year|yr)/i);
  if (termMatch) {
    params.termLength = termMatch[1];
  }
  
  // Extract seller name if mentioned
  const sellerMatch = query.match(/seller(?:'s)?\s+name\s+is\s+([^,\.]+)/i);
  if (sellerMatch) {
    params.sellerName = sellerMatch[1].trim();
  }
  
  // Extract buyer name if mentioned
  const buyerMatch = query.match(/buyer(?:'s)?\s+name\s+is\s+([^,\.]+)/i);
  if (buyerMatch) {
    params.buyerName = buyerMatch[1].trim();
  }
  
  // Default placeholder values if not specified
  if (!params.sellerName) params.sellerName = "{SELLER_NAME}";
  if (!params.buyerName) params.buyerName = "{BUYER_NAME}";
  if (!params.sellerAddress) params.sellerAddress = "{SELLER_ADDRESS}";
  if (!params.buyerAddress) params.buyerAddress = "{BUYER_ADDRESS}";
  
  return params;
}

/**
 * Extract parameters for compliance lookup from query and data
 * 
 * @param {string} query - The user's query text
 * @param {object} data - Optional structured data
 * @returns {object} - Extracted compliance parameters
 */
function extractComplianceParameters(query, data = {}) {
  // Start with any provided structured data
  const params = { ...data };
  
  // Default values
  if (!params.jurisdiction) params.jurisdiction = "usa";
  if (!params.businessType) params.businessType = "general";
  
  // Extract jurisdiction if mentioned
  if (query.includes('uk') || query.includes('united kingdom') || query.includes('england')) {
    params.jurisdiction = 'uk';
  } else if (query.includes('us') || query.includes('united states') || query.includes('america')) {
    params.jurisdiction = 'usa';
  } else if (query.includes('eu') || query.includes('europe')) {
    params.jurisdiction = 'eu';
  }
  
  // Extract state/region if mentioned for USA
  if (params.jurisdiction === 'usa') {
    if (query.includes('california') || query.includes('CA')) {
      params.region = 'california';
    } else if (query.includes('new york') || query.includes('NY')) {
      params.region = 'new_york';
    } else {
      params.region = 'federal';
    }
  }
  
  // Extract business type if mentioned
  if (query.includes('restaurant') || query.includes('cafe') || query.includes('food service')) {
    params.businessType = 'food_service';
  } else if (query.includes('ecommerce') || query.includes('online store')) {
    params.businessType = 'ecommerce';
  } else if (query.includes('saas') || query.includes('software')) {
    params.businessType = 'software';
  } else if (query.includes('manufacturing')) {
    params.businessType = 'manufacturing';
  } else if (query.includes('retail')) {
    params.businessType = 'retail';
  } else if (query.includes('franchise')) {
    params.businessType = 'franchise';
  }
  
  return params;
}

/**
 * Generate an NDA document by filling in template with parameters
 * 
 * @param {object} template - NDA template object
 * @param {object} params - Parameters to fill in the template
 * @returns {string} - Generated NDA document
 */
function generateNdaDocument(template, params) {
  // Join template content lines into a single string
  let document = template.content.join('\n');
  
  // Replace placeholder values with parameters
  document = document.replace(/\{SELLER_NAME\}/g, params.sellerName);
  document = document.replace(/\{BUYER_NAME\}/g, params.buyerName);
  document = document.replace(/\{SELLER_ADDRESS\}/g, params.sellerAddress);
  document = document.replace(/\{BUYER_ADDRESS\}/g, params.buyerAddress);
  document = document.replace(/\{TERM_LENGTH\}/g, params.termLength);
  document = document.replace(/\{JURISDICTION\}/g, params.jurisdiction);
  
  // Replace optional placeholders if present
  if (params.sellerRegNumber) {
    document = document.replace(/\{SELLER_REG_NUMBER\}/g, params.sellerRegNumber);
  } else {
    document = document.replace(/\{SELLER_REG_NUMBER\}/g, "[SELLER REGISTRATION NUMBER]");
  }
  
  if (params.buyerRegNumber) {
    document = document.replace(/\{BUYER_REG_NUMBER\}/g, params.buyerRegNumber);
  } else {
    document = document.replace(/\{BUYER_REG_NUMBER\}/g, "[BUYER REGISTRATION NUMBER]");
  }
  
  if (params.sellerJurisdiction) {
    document = document.replace(/\{SELLER_JURISDICTION\}/g, params.sellerJurisdiction);
  } else {
    document = document.replace(/\{SELLER_JURISDICTION\}/g, "[SELLER JURISDICTION]");
  }
  
  if (params.buyerJurisdiction) {
    document = document.replace(/\{BUYER_JURISDICTION\}/g, params.buyerJurisdiction);
  } else {
    document = document.replace(/\{BUYER_JURISDICTION\}/g, "[BUYER JURISDICTION]");
  }
  
  return document;
}

/**
 * Look up regulatory compliance information based on parameters
 * 
 * @param {object} params - Compliance lookup parameters
 * @returns {Array<object>} - Relevant compliance information
 */
function lookupComplianceInfo(params) {
  const { jurisdiction, region, businessType } = params;
  const results = [];
  
  // Look up jurisdiction in compliance database
  if (COMPLIANCE_DATABASE[jurisdiction]) {
    // Look up region-specific regulations
    if (region && COMPLIANCE_DATABASE[jurisdiction][region]) {
      Object.values(COMPLIANCE_DATABASE[jurisdiction][region]).forEach(regulation => {
        results.push({ ...regulation, jurisdiction, region });
      });
    }
    
    // Also include national/federal regulations
    const nationalKey = jurisdiction === 'usa' ? 'federal' : 
                        jurisdiction === 'uk' ? 'national' : 'union';
    
    if (COMPLIANCE_DATABASE[jurisdiction][nationalKey]) {
      Object.values(COMPLIANCE_DATABASE[jurisdiction][nationalKey]).forEach(regulation => {
        results.push({ ...regulation, jurisdiction, region: nationalKey });
      });
    }
  }
  
  // If no regulations found, provide general guidance
  if (results.length === 0) {
    results.push({
      code: 'General Guidance',
      description: `No specific regulations found for ${jurisdiction}/${businessType}. Consider consulting a local attorney.`,
      expires: 'N/A',
      link: 'https://www.arzani-marketplace.com/legal-guidance',
      jurisdiction,
      region: 'general'
    });
  }
  
  return results;
}

/**
 * Format compliance information for human-readable output
 * 
 * @param {Array<object>} complianceInfo - Compliance information to format
 * @returns {string} - Formatted compliance information
 */
function formatComplianceInfo(complianceInfo) {
  if (!complianceInfo || complianceInfo.length === 0) {
    return "No compliance information found.";
  }
  
  let output = "## Regulatory Considerations\n\n";
  
  complianceInfo.forEach((regulation, index) => {
    output += `### ${index + 1}. ${regulation.code}\n\n`;
    output += `**Description:** ${regulation.description}\n\n`;
    output += `**Jurisdiction:** ${regulation.jurisdiction}${regulation.region ? ' / ' + regulation.region : ''}\n\n`;
    output += `**Valid Until:** ${regulation.expires}\n\n`;
    
    if (regulation.link) {
      output += `**More Information:** [Official Documentation](${regulation.link})\n\n`;
    }
  });
  
  output += "## Disclaimer\n\n";
  output += "This information is provided for general guidance only and is not a substitute for professional legal advice. ";
  output += "Regulations may change, and specific requirements may apply to your situation. ";
  output += "It is recommended to consult with a qualified attorney familiar with business transactions in your jurisdiction.";
  
  return output;
}

export default {
  processLegalTask
};
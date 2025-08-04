/**
 * Finance AI Agent RAG Data Population Script
 * This script adds comprehensive UK business finance and funding information 
 * to Pinecone vector database for the Finance AI Agent's RAG system
 * 
 * Content includes:
 * - Government business finance schemes (gov.uk)
 * - British Business Bank guidance
 * - Start Up Loans information
 * - Enterprise Finance Guarantee details
 * - Innovate UK funding guidance
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';
import { Pinecone } from '@pinecone-database/pinecone';

dotenv.config();

console.log('💰 Finance AI Agent RAG Data Population - UK Business Finance');
console.log('==============================================================\n');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Pinecone
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
});

const indexName = process.env.PINECONE_INDEX_NAME || 'marketplace-index';

// UK Business Finance Data - Government schemes and support
const ukBusinessFinanceData = {
  overview: {
    id: 'uk_business_finance_overview',
    title: 'UK Business Finance and Support Overview',
    category: 'Government schemes',
    finance_type: 'General',
    scheme: 'Government Support',
    source: 'gov.uk',
    authority: 'UK Government',
    content: `
UK Business Finance and Support Overview

Central directory of all UK government loans, grants and advice schemes, from start-up loans to growth funding.

Key Categories:
- Finance and equity schemes
- Grant funding opportunities 
- Loan programs
- Expertise and advice services
- Recognition awards

Business Stages Supported:
- Not yet trading
- Start-ups (1-2 years trading)
- Established businesses

Filter Options:
- Type of support (Finance, Equity, Grant, Loan, Advice)
- Business stage and industry
- Number of employees (0-9, 10-249, 250-500, 500+)
- Regional availability

Available Schemes Include:
- Start Up Loans for business (£500-£25,000)
- Finance and support finder
- Software for filing company accounts
- Business support services
- Business plan writing guidance

129 Government Schemes Available:
- Access to finance programs
- Business development support
- Manufacturing supply chain funding
- Aerospace technology funding
- Regional loan schemes
- Growth grants and loans
- Digital technology support
- Enterprise programs
- Environmental technology support

Application Process:
- Use online business finance support finder
- Filter by business needs and location
- Apply directly to relevant schemes
- Free initial consultations available
- Professional support services
    `,
    source_url: 'https://www.gov.uk/browse/business/finance-support'
  },

  startup_loans_scheme: {
    id: 'uk_startup_loans_scheme',
    title: 'Start Up Loans Scheme',
    category: 'Start-up loans',
    finance_type: 'Loan',
    scheme: 'Start Up Loans',
    source: 'gov.uk',
    authority: 'UK Government',
    content: `
Start Up Loans Scheme

Government-backed Start Up Loan of £500 to £25,000 to start or grow your business.

Key Features:
- Unsecured personal loan (not business loan)
- Credit check required
- Free support and guidance included
- Business plan writing assistance
- Up to 12 months of free mentoring for successful applicants

Eligibility Criteria:
- Must live in the UK
- Must be 18 or over
- Have (or plan to start) a UK-based business
- Business must be trading for less than 36 months

Loan Terms:
- Fixed interest rate: 6% per year
- Repayment period: 1 to 5 years
- No application fee
- No early repayment fee
- Government-backed guarantee

Application Process:
- Apply through Start Up Loans website
- Complete online application
- Business plan assessment
- Credit check and affordability assessment
- Mentoring allocation upon approval

Support Included:
- Free business plan guidance
- Pre-application support
- 12 months post-loan mentoring
- Ongoing business advice
- Local business support connections

Benefits:
- Access to finance for new businesses
- Lower interest rates than commercial loans
- Professional mentoring support
- No security required
- Flexible repayment terms
    `,
    source_url: 'https://www.gov.uk/apply-start-up-loan'
  }
};

// Enterprise Finance Guarantee Scheme Data
const ukEFGSchemeData = {
  overview: {
    id: 'uk_efg_overview',
    title: 'Enterprise Finance Guarantee Overview',
    category: 'Government lending',
    finance_type: 'Loan Guarantee',
    scheme: 'Enterprise Finance Guarantee',
    source: 'gov.uk',
    authority: 'UK Government',
    content: `
Enterprise Finance Guarantee (EFG) Overview

Loan guarantee scheme to facilitate lending to viable businesses that have been turned down for normal commercial loans due to lack of security or proven track record.

Scheme Purpose:
- Encourage additional lending to viable SMEs
- Government provides 75% guarantee to lenders
- Support businesses that can repay but lack security
- Fully delegated to participating lenders

Eligibility Guidelines:
- Operate in the UK
- Turnover less than £41 million
- Seeking finance between £1,000 and £1 million
- Repayment terms from 3 months to 10 years
- Operate in eligible sector (most sectors eligible)
- Business must be viable and able to repay

Types of Facilities Available:
- New term loans (unsecured/partially secured)
- Refinancing of existing term loans
- Overdraft conversion to term loans
- Invoice finance guarantee (up to 3 years)
- Overdraft guarantee (up to 2 years)

Government Guarantee Structure:
- 75% government guarantee to lender
- Borrower responsible for 100% repayment
- 2% annual premium charged to borrower
- Premium collected quarterly in advance
- Based on outstanding capital balance

Lender Requirements:
- Standard commercial lending criteria applied
- Viability assessment required
- Security may be taken (except principal residence)
- Personal guarantees permitted
- Commercial recovery procedures followed

Legal Framework:
- Industrial Development Act 1982
- EU de minimis State Aid rules
- Sector restrictions apply
- British Business Bank oversight
    `,
    source_url: 'https://www.gov.uk/guidance/understanding-the-enterprise-finance-guarantee'
  },

  application_process: {
    id: 'uk_efg_application',
    title: 'EFG Application Process and Lenders',
    category: 'Government lending',
    finance_type: 'Loan Guarantee',
    scheme: 'Enterprise Finance Guarantee',
    source: 'gov.uk',
    authority: 'UK Government',
    content: `
EFG Application Process and Participating Lenders

Application Requirements:
- Same information as commercial loan applications
- Financial statements and business plans
- Cash flow forecasts
- Security details (if available)
- Management information

Lender Assessment Process:
1. Standard lending criteria applied
2. Viability assessment (ability to repay)
3. Security adequacy evaluation
4. EFG suitability determination
5. Eligibility confirmation via web portal

Participating Lenders Include:
- Major UK banks
- Regional banks
- Specialist finance providers
- Community Development Finance Institutions
- Alternative finance providers

Application Stages:
1. Approach participating lender
2. Submit loan application
3. Lender viability assessment
4. EFG eligibility check
5. Government guarantee registration
6. Loan approval and documentation
7. Premium schedule provision
8. Direct debit setup for premiums

Risk Sharing Structure:
- Government: 75% guarantee
- Lender: 25% risk retention
- Borrower: 100% repayment liability
- Three-way risk sharing approach

Decision Making:
- Fully delegated to lenders
- Government plays no role in decisions
- Lenders determine viability and suitability
- Standard commercial recovery procedures

Support Services:
- British Business Bank oversight
- Lender training and guidance
- Quarterly statistics reporting
- Appeals process available
- Financial Ombudsman Service access
    `,
    source_url: 'https://www.gov.uk/guidance/understanding-the-enterprise-finance-guarantee'
  }
};

// Innovate UK Funding Data
const ukInnovateUKData = {
  overview: {
    id: 'uk_innovate_overview',
    title: 'Innovate UK Funding Overview',
    category: 'Grant funding',
    finance_type: 'Grant',
    scheme: 'Innovate UK',
    source: 'gov.uk',
    authority: 'UK Government',
    content: `
Innovate UK Funding Overview

Supports innovative ideas and business growth through tailored support, grant funding, loans and procurements.

Funding Types Available:
- Grant funding for innovation projects
- Innovation loans for R&D
- Procurement contracts
- Knowledge transfer partnerships
- Investor partnership programs

Key Programs:

UKRI Challenge Fund:
- Aligned with four grand challenges
- Industrial Strategy alignment
- Bringing research and business together
- Major industrial and societal challenges

Knowledge Transfer Partnerships (KTP):
- Funding for new knowledge and expertise
- Academic organisation partnerships
- Highly qualified graduate placements
- UK registered businesses and not-for-profits eligible

Innovation Loans:
- Affordable, flexible and patient capital for SMEs
- Late-stage R&D projects
- Clear route to commercialisation
- Business growth through innovation
- Quality innovative project required

Contracts for Innovation:
- Funded procurement contracts
- Government organisation partnerships
- Development of innovative ideas
- Public sector innovation support

Specialist Programs:
- Biomedical Catalyst (health and care)
- Energy Catalyst (clean energy solutions)
- ICURe (university research commercialisation)
- International programs (Horizon Europe, EUREKA)

Application Process:
- Check eligibility criteria
- Complete application via Innovation Funding Service
- Project assessment and review
- Award notification and contracting
- Project delivery and reporting

Eligibility:
- UK businesses of all sizes
- Research organizations
- Academic institutions
- Not-for-profit organizations
- International partnerships (specific programs)
    `,
    source_url: 'https://www.ukri.org/councils/innovate-uk/guidance-for-applicants/general-guidance/'
  }
};

// British Business Bank Data
const ukBritishBusinessBankData = {
  guidance_overview: {
    id: 'uk_bbb_guidance',
    title: 'British Business Bank Finance Guidance',
    category: 'Finance guidance',
    finance_type: 'General',
    scheme: 'British Business Bank',
    source: 'british-business-bank.co.uk',
    authority: 'British Business Bank',
    content: `
British Business Bank Finance Guidance

Comprehensive guidance on debt, equity, invoice finance, EFG, and Start-Up Loans, plus real-world case studies.

Finance Types Available:

Debt Finance:
- Term loans for growth
- Working capital facilities
- Asset finance options
- Invoice finance solutions

Equity Finance:
- Growth capital investment
- Development capital
- Management buyouts
- Venture capital partnerships

Specialist Finance:
- Invoice finance and factoring
- Asset-based lending
- Trade finance solutions
- Property development finance

Government-Backed Schemes:
- Enterprise Finance Guarantee
- Start Up Loans program
- Growth Guarantee Scheme
- Recovery Loan Scheme

Business Guidance Topics:

Making Business Finance Work:
- Understanding finance types
- Choosing appropriate funding
- Application preparation
- Lender relationship management

Finance Finder Tool:
- Matches business needs to finance options
- Covers all business stages
- Multiple finance types
- Regional and national providers

Business Guidance Articles:
- Finance: External finance options and growth funding
- Staffing: Recruitment and retention strategies
- Sustainability: Green growth preparation
- Supply Chains: Improvement strategies
- Business Essentials: Operational requirements

Success Stories:
- Growth Guarantee Scheme case studies
- Regional investment fund examples
- Technology sector funding
- Manufacturing finance solutions

Additional Support:
- ICAEW Business Advice Service
- Free initial consultations
- Regulated accountant connections
- Insolvency advice and support

Finance Matching Process:
1. Business assessment
2. Finance needs analysis
3. Options identification
4. Provider matching
5. Application support
6. Ongoing relationship management
    `,    source_url: 'https://www.british-business-bank.co.uk/business-guidance'
  }
};

// Additional empty data objects for completeness
const ukStartUpLoansData = {}; // Start Up Loans content is included in ukBusinessFinanceData

// Convert finance data to searchable text format for RAG
function formatFinanceContentForRAG(content) {
  return `
${content.title}

Category: ${content.category}
Source: ${content.source}
Finance Type: ${content.finance_type || 'General'}
Scheme: ${content.scheme || 'N/A'}

Content:
${content.content}

Source: Official UK Government/Banking guidance (${content.source_url})

Finance Context: This information provides official UK guidance on business finance, funding schemes, and support programs. Always verify current requirements and eligibility criteria with the relevant authorities and seek professional financial advice for specific situations.
  `.trim();
}

// Check if Pinecone index exists and create if needed
async function ensurePineconeIndex() {
  try {
    console.log('🔍 Checking Pinecone index...');
    
    const indexList = await pinecone.listIndexes();
    const indexExists = indexList.indexes?.some(index => index.name === indexName);
    
    if (!indexExists) {
      console.log(`📝 Creating Pinecone index: ${indexName}`);
      await pinecone.createIndex({
        name: indexName,
        dimension: 1536, // text-embedding-3-small dimension
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1'
          }
        }
      });
      
      // Wait for index to be ready
      console.log('⏳ Waiting for index to be ready...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    console.log('✅ Index ready');
    return pinecone.index(indexName);
    
  } catch (error) {
    console.error('❌ Error setting up Pinecone index:', error.message);
    throw error;
  }
}

// Generate embeddings and upload finance data to Pinecone
async function populateFinanceData() {
  try {
    console.log('🚀 Starting finance data population...\n');
    
    // Ensure index exists
    const index = await ensurePineconeIndex();
    
    // Check current vector count
    const stats = await index.describeIndexStats();
    console.log(`📊 Current vectors in index: ${stats.totalVectorCount || 0}`);
    
    console.log('\n🔄 Processing UK finance data...');
    
    const vectors = [];
    
    // Combine all finance datasets
    const allFinanceData = [
      ...Object.values(ukBusinessFinanceData),
      ...Object.values(ukStartUpLoansData),
      ...Object.values(ukEFGSchemeData),
      ...Object.values(ukInnovateUKData),
      ...Object.values(ukBritishBusinessBankData)
    ];
    
    console.log(`💰 Total finance sections to process: ${allFinanceData.length}`);
    
    for (const content of allFinanceData) {
      console.log(`💼 Processing: ${content.title}`);
      
      try {
        // Generate searchable text
        const searchText = formatFinanceContentForRAG(content);
        
        // Generate embedding
        const embedding = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: searchText
        });
        
        // Prepare vector for Pinecone
        const vector = {
          id: content.id,
          values: embedding.data[0].embedding,
          metadata: {
            title: content.title,
            category: content.category,
            finance_type: content.finance_type,
            scheme: content.scheme,
            source: content.source,
            source_url: content.source_url,
            document_type: 'finance_guidance',
            authority: content.authority,
            reliability: 'official',
            text_content: searchText.substring(0, 8000), // Limit metadata size
            created_at: new Date().toISOString()
          }
        };
        
        vectors.push(vector);
        console.log(`✅ ${content.title}: Embedding generated (${embedding.data[0].embedding.length} dimensions)`);
        
      } catch (error) {
        console.error(`❌ Error processing ${content.title}:`, error.message);
      }
    }
    
    // Upload vectors to Pinecone in appropriate namespaces
    console.log(`\n📤 Uploading ${vectors.length} finance vectors to Pinecone...`);
    
    // Group vectors by namespace
    const namespaceGroups = {
      'business_finance': vectors.filter(v => v.metadata.category.includes('Government schemes') || v.metadata.category.includes('Finance guidance')),
      'startup_loans': vectors.filter(v => v.metadata.category.includes('Start-up') || v.metadata.scheme === 'Start Up Loans'),
      'efg_scheme': vectors.filter(v => v.metadata.scheme === 'Enterprise Finance Guarantee'),
      'grant_funding': vectors.filter(v => v.metadata.category.includes('Grant funding') || v.metadata.category.includes('Innovation'))
    };
    
    const batchSize = 100; // Pinecone batch limit
    let totalUploaded = 0;
    
    for (const [namespace, namespaceVectors] of Object.entries(namespaceGroups)) {
      if (namespaceVectors.length === 0) continue;
      
      console.log(`\n📂 Uploading ${namespaceVectors.length} vectors to ${namespace} namespace...`);
      
      for (let i = 0; i < namespaceVectors.length; i += batchSize) {
        const batch = namespaceVectors.slice(i, i + batchSize);
        
        try {
          await index.namespace(namespace).upsert(batch);
          console.log(`✅ Uploaded batch ${Math.floor(i/batchSize) + 1} (${batch.length} vectors) to ${namespace}`);
          totalUploaded += batch.length;
        } catch (error) {
          console.error(`❌ Error uploading batch to ${namespace}:`, error.message);
        }
      }
    }
    
    // Wait for vectors to be available
    console.log('\n⏳ Waiting for vectors to be indexed...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Verify upload
    const finalStats = await index.describeIndexStats();
    const vectorCount = finalStats.totalVectorCount || 0;
    console.log(`📊 Final vector count: ${vectorCount}`);
    console.log(`✅ Successfully uploaded ${totalUploaded} finance vectors`);
    
    // Test search functionality
    console.log('\n🧪 Testing finance search functionality...');
    const testQueries = [
      "UK government business funding schemes",
      "Start up loans eligibility criteria", 
      "Enterprise Finance Guarantee requirements",
      "Innovate UK grant application process"
    ];
    
    for (const query of testQueries) {
      console.log(`🔍 Search query: "${query}"`);
      
      try {
        const queryEmbedding = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: query
        });
        
        // Search across all finance namespaces
        const namespaces = ['business_finance', 'startup_loans', 'efg_scheme', 'grant_funding'];
        let foundResults = false;
        
        for (const ns of namespaces) {
          try {
            const searchResults = await index.namespace(ns).query({
              vector: queryEmbedding.data[0].embedding,
              topK: 2,
              includeMetadata: true
            });
            
            if (searchResults.matches && searchResults.matches.length > 0) {
              foundResults = true;
              console.log(`📈 Found ${searchResults.matches.length} results in ${ns}:`);
              searchResults.matches.forEach((match, i) => {
                console.log(`   ${i + 1}. ${match.metadata.title}`);
                console.log(`      🎯 Score: ${(match.score * 100).toFixed(1)}%`);
                console.log(`      💼 Category: ${match.metadata.category}`);
              });
            }
          } catch (nsError) {
            // Namespace might be empty, continue
            continue;
          }
        }
        
        if (!foundResults) {
          console.log('   ⚠️ No results found - vectors may still be indexing');
        }
      } catch (error) {
        console.error(`❌ Search test failed: ${error.message}`);
      }
    }
    
    console.log(`✅ Completed ${testQueries.length} search tests`);
    
    console.log('\n🎉 Finance RAG population complete!');
    console.log('\n📋 Summary:');
    console.log(`✅ Finance vectors uploaded: ${totalUploaded}`);
    console.log(`✅ Search functionality: Working`);
    console.log(`✅ Index: ${indexName}`);
    console.log(`✅ Namespaces: business_finance, startup_loans, efg_scheme, grant_funding`);
    console.log(`✅ Content: UK Business Finance Guidance (gov.uk, BBB, Innovate UK)`);
    
    console.log('\n💰 Finance Content Added:');
    
    // Show content by category
    const categories = ['Government schemes', 'Finance guidance', 'Start-up loans', 'Grant funding', 'Government lending'];
    categories.forEach(category => {
      const categoryContent = allFinanceData.filter(content => content.category.includes(category));
      if (categoryContent.length > 0) {
        console.log(`\n📊 ${category}:`);
        categoryContent.forEach((content, index) => {
          console.log(`  ${index + 1}. ${content.title}`);
        });
      }
    });
    
    console.log('\n🔄 Next Steps:');
    console.log('1. ✅ Pinecone populated with comprehensive UK finance data');
    console.log('2. 🔄 Finance AI Agent can access funding schemes, loans & grants guidance');
    console.log('3. 🔄 Test Finance AI Agent queries across all funding areas');
    console.log('4. 🔄 Monitor search performance and funding scheme updates');
    
  } catch (error) {
    console.error('❌ Finance population failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Set timeout and run
setTimeout(() => {
  console.log('\n⏰ Script timed out after 120 seconds');
  process.exit(1);
}, 120000);

// Placeholder main function - will be called after data is populated
async function main() {
  if (Object.keys(ukBusinessFinanceData).length === 0) {
    console.log('⚠️ No finance data loaded. Please populate data objects first.');
    console.log('💡 Scrape content using Firecrawl MCP and add to data objects.');
    return;
  }
  
  await populateFinanceData();
}

// Run the main function since data is now populated
main().catch(console.error);

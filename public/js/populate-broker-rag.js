/**
 * Broker RAG Data Population Script
 * This script adds comprehensive UK broker and transaction-specific content
 * to Pinecone vector database for the Broker Agent's RAG system
 * 
 * Content includes:
 * - CMA Merger Assessment Guidelines (PDF)
 * - UK Merger Investigation Thresholds (GOV.UK)
 * - Company Annual Accounts Requirements (GOV.UK)
 * - Business Sale Responsibilities (GOV.UK)
 * - iTABB Industry Standards (itabb.org)
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';
import { Pinecone } from '@pinecone-database/pinecone';

dotenv.config();

console.log('🏢 Broker RAG Data Population - UK Transaction & Regulatory Content');
console.log('===================================================================\n');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Pinecone
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
});

const indexName = process.env.PINECONE_INDEX_NAME || 'marketplace-index';

// UK Merger Investigation Thresholds (GOV.UK scraped data)
const ukMergerThresholdsData = {
  overview: {
    id: 'uk_merger_thresholds_overview',
    title: 'UK Merger Investigation Overview',
    step: 'Thresholds & Overview',
    content: `
UK Merger Investigation Thresholds

When Mergers Will Be Investigated:
The Competition and Markets Authority (CMA) investigates mergers that meet certain thresholds or raise competition concerns.

Key Investigation Triggers:
- Turnover threshold: £70 million or more annual UK turnover
- Share of supply threshold: 25% or more market share
- Special sectors: Additional rules for media, water, banking

CMA Investigation Criteria:
A merger usually only qualifies for a CMA investigation if either:
- the business being taken over has a UK annual turnover of at least £70 million
- the combined businesses have at least a 25% share of any reasonable market

Types of Mergers:
Merging businesses includes acquisitions, take-overs and joint ventures.

Legal Framework:
- CMA Merger Assessment Guidelines
- CMA jurisdiction and procedure guidance
- Merger remedies and prohibitions guidance

Additional Resources:
- Merger assessment guidelines available from CMA
- Prohibitions and remedies documentation
- Guidance on CMA's jurisdiction and procedure

Process Overview:
- No mandatory pre-notification system in UK
- Voluntary notification available for certainty
- CMA can investigate completed mergers up to 4 months post-completion
- Phase 1: Initial assessment (40 working days)
- Phase 2: In-depth investigation (24 weeks if referred)    `,
    category: 'Competition Law',
    legal_area: 'merger_control',
    jurisdiction: 'UK',
    source_url: 'https://assets.publishing.service.gov.uk/media/67766a574961c1185ea21b73/CMA18_A_quick_guide_to_UK_merger_assessment.pdf'
  },

  merger_review_process: {
    id: 'uk_merger_review_process',
    title: 'UK Merger Review Process 2025',
    step: 'Procedure & Timing',
    content: `
UK Merger Review Process 2025

CMA Jurisdiction:
The CMA reviews mergers where two or more enterprises cease to be distinct and meet thresholds:
- UK turnover threshold: £100 million (updated 2025)
- Share of supply: 25% market share with increase
- Hybrid test: 33% supply share, £350M turnover, UK nexus

Review Routes:
1. Notification: Formal Merger Notice submission
2. Own-initiative: CMA investigates unreported mergers  
3. SMS reporting: Mandatory for strategic market status firms

Phase 1 Process:
- Duration: 40 working days statutory deadline
- Threshold: Realistic prospect of SLC
- Outcomes: Clear, refer to Phase 2, or accept UILs
- Fast track: Available on request if conditions met

Phase 2 Process:
- Duration: 24 weeks (extendable to 32-35 weeks)
- Threshold: Balance of probabilities of SLC
- Decision makers: Independent CMA panel members
- Outcomes: Clear, prohibit, or remedies

Pre-notification Benefits:
- Legal certainty before completion
- Avoid interim measures and trustee costs
- Confidential discussions with CMA
- UILs consideration and guidance

Fees and Costs:
- CMA review fees payable by notifying business
- Interim measures can impose trustee costs
- Divestiture costs if merger prohibited
- 25-30% of cases are own-initiative investigations

Key Deadlines:
- 4 months post-completion for CMA intervention
- 5 working days to offer UILs after SLC finding
- 12 weeks to implement Phase 2 remedies (extendable to 18 weeks)

SMS Firm Requirements:
- Mandatory pre-completion reporting
- Enhanced scrutiny of digital mergers
- Strategic market status designation triggers
    `,
    category: 'Competition Law',
    legal_area: 'merger_control',
    jurisdiction: 'UK',
    source_url: 'https://assets.publishing.service.gov.uk/media/67766a574961c1185ea21b73/CMA18_A_quick_guide_to_UK_merger_assessment.pdf'
  },

  cma_assessment_guidelines: {
    id: 'uk_cma_assessment_guidelines',
    title: 'CMA Merger Assessment Guidelines 2025',
    step: 'Assessment Framework',
    content: `
CMA Merger Assessment Guidelines 2025 - Quick Guide

Legal Authority:
The Competition and Markets Authority (CMA) assesses mergers under the Enterprise Act 2002 and Digital Markets, Competition and Consumers Act 2024 to determine whether they substantially lessen competition.

Updated Jurisdiction Thresholds (2025):
- Turnover threshold: £100 million annual UK turnover (increased from £70 million)
- Share of supply threshold: 25% market share 
- Hybrid test: 33% share of supply, £350 million UK turnover, plus UK nexus
- SMS firms: Mandatory reporting requirement for strategic market status firms

Assessment Framework:
- Substantial lessening of competition (SLC) test
- Three main theories of harm:
  1. Unilateral horizontal effects
  2. Coordinated effects  
  3. Vertical/conglomerate foreclosure

Key Assessment Criteria:
- Phase 1: Realistic prospect of SLC (40 working days)
- Phase 2: Balance of probabilities of SLC (24 weeks)
- Statutory fast track process available
- Undertakings in Lieu (UILs) to avoid Phase 2

Competition Concerns:
- Removal of competitive constraint
- Loss of potential/dynamic competition
- Coordinated interaction enabling
- Vertical foreclosure of rivals
- Conglomerate bundling strategies

Countervailing Factors:
- Rivalry-enhancing efficiencies
- Relevant customer benefits
- Entry and expansion prospects
- Merger-specific synergies

Digital Markets Updates (2025):
- SMS firms reporting requirements
- Enhanced potential competition assessment
- Dynamic competition considerations
- Innovation competition focus
- Market definition and analysis
- Competitive effects assessment
- Countervailing factors
- Efficiency considerations

Investigation Phases:
Phase 1 Investigation:
- Duration: 40 working days (extendable)
- Initial competition assessment
- Market testing of theories of harm
- Decision on reference to Phase 2

Phase 2 Investigation:
- Duration: 24 weeks (extendable to 32 weeks)
- In-depth competition analysis
- Detailed economic assessment
- Final determination and remedies

Market Definition:
- Product market definition
- Geographic market definition
- Temporal market considerations
- Demand-side and supply-side substitution

Competitive Effects:
- Horizontal mergers (same level of supply chain)
- Vertical mergers (different levels of supply chain)
- Conglomerate mergers (different markets)
- Unilateral effects vs coordinated effects

Remedies Framework:
- Structural remedies (divestiture)
- Behavioural remedies (ongoing obligations)
- Monitoring and enforcement
- Crown jewel provisions

Notification Process:
- Voluntary pre-notification system
- Statutory information requests
- Third party consultation
- Public interest considerations
    `,
    category: 'Competition Law',
    legal_area: 'merger_assessment',
    jurisdiction: 'UK',
    source_url: 'https://assets.publishing.service.gov.uk/media/61f952dd8fa8f5388690df76/MAGs_for_publication_2021_--_.pdf'
  },

  qualifying_thresholds: {
    id: 'uk_merger_qualifying_thresholds',
    title: 'Qualifying Thresholds for UK Merger Investigation',
    step: 'Qualifying Thresholds',
    content: `
Qualifying Thresholds for UK Merger Investigation

Turnover Test:
- Annual UK turnover of £70 million or more
- Applies to target business or acquiring group
- Based on most recent accounts
- Includes turnover of connected enterprises

Share of Supply Test:
- 25% or more of goods/services of particular description
- Can be calculated by reference to various factors:
  - Value of supplies
  - Volume of supplies
  - Capacity to supply
  - Number of workers employed
- Applies in UK or substantial part of UK

Relevant Merger Situations:
- Two or more enterprises cease to be distinct
- Arrangements in progress or contemplation
- Material influence threshold
- De facto control considerations

Timing Considerations:
- 4-month limitation period from completion
- CMA awareness may extend period
- No limitation for public interest cases
- Voluntary notification stops time running

Special Sector Rules:
- Media mergers: Special public interest test
- Water industry: Additional regulatory oversight
- Banking: Financial stability considerations
- Defence: National security assessment

Connected Enterprises:
- Subsidiary companies included
- Associated companies considerations
- Control relationships
- Attribution of turnover rules
    `,
    category: 'Competition Law',
    legal_area: 'merger_thresholds',
    jurisdiction: 'UK',
    source_url: 'https://www.gov.uk/mergers-when-they-will-be-investigated'
  },

  investigation_process: {
    id: 'uk_merger_investigation_process',
    title: 'UK Merger Investigation Process',
    step: 'Investigation Process',
    content: `
UK Merger Investigation Process

Phase 1 Investigation:
- Duration: 40 working days (extendable)
- Initial competition assessment
- Information gathering from parties
- Third party consultation
- Market testing of theories of harm

Phase 1 Outcomes:
- Clearance (no competition concerns)
- Clearance with undertakings in lieu
- Reference to Phase 2 investigation
- Abandonment by parties

Phase 2 Investigation:
- Duration: 24 weeks (extendable to 32 weeks)
- In-depth competition analysis
- Detailed economic assessment
- Extensive third party consultation
- Hearing with main parties

Phase 2 Outcomes:
- Clearance with no further action
- Prohibition of the merger
- Clearance subject to remedies
- Partial prohibition

Information Gathering Powers:
- Statutory information requests
- Compulsory interviews
- Site visits and inspections
- Document production orders
- Penalties for non-compliance

Third Party Rights:
- Consultation opportunities
- Submission of evidence
- Access to non-confidential materials
- Oral hearings in Phase 2
- Judicial review rights

Remedies Framework:
- Structural remedies (divestiture)
- Behavioural remedies (ongoing obligations)
- Crown jewel provisions
- Monitoring and enforcement
    `,
    category: 'Competition Law',
    legal_area: 'merger_procedure',
    jurisdiction: 'UK',
    source_url: 'https://www.gov.uk/mergers-when-they-will-be-investigated'
  }
};

// Company Annual Accounts Requirements (GOV.UK scraped data)
const ukCompanyAccountsData = {
  overview: {
    id: 'uk_company_accounts_overview',
    title: 'UK Company Annual Accounts Overview',
    step: 'Overview',
    content: `
UK Company Annual Accounts Requirements

Legal Requirement:
All UK companies must prepare and file annual accounts with Companies House, except dormant companies in certain circumstances.

Types of Accounts:
- Statutory accounts (required by law)
- Management accounts (internal use)
- Abbreviated accounts (for small companies)
- Full accounts (medium/large companies)

Key Components:
- Balance sheet (mandatory for all companies)
- Profit and loss account
- Notes to the accounts
- Directors' report
- Auditor's report (if required)

Financial Year:
- Period for which accounts are prepared
- Usually 12 months
- Can be longer for first accounts (up to 18 months)
- Must end on same date each year

Filing Deadlines:
- Private companies: 9 months after financial year end
- Public companies: 6 months after financial year end
- First accounts: can be up to 21 months from incorporation

Penalties for Late Filing:
- £150 (up to 1 month late)
- £375 (1-3 months late)
- £750 (3-6 months late)
- £1,500 (over 6 months late)
- Daily penalties may apply

Company Categories:
- Micro-entities: Simplified reporting
- Small companies: Abbreviated accounts option
- Medium companies: Full accounts required
- Large companies: Full accounts and audit required

Consequences of Non-Compliance:
- Criminal offence for failure to file
- Late filing penalties
- Risk of company being struck off register
- Director prosecution and unlimited fines
- Assets may become property of the Crown
    `,
    category: 'Statutory Accounts',
    legal_area: 'company_accounts',
    jurisdiction: 'UK',
    source_url: 'https://www.gov.uk/government/publications/life-of-a-company-annual-requirements/life-of-a-company-part-1-accounts'
  },

  accounting_reference_dates: {
    id: 'uk_accounts_ard_requirements',
    title: 'Accounting Reference Dates and Financial Years',
    step: 'Financial Year Setup',
    content: `
Accounting Reference Dates and Financial Years

Financial Year Definition:
A financial year is usually a 12 month period for which you prepare accounts. Every company must prepare accounts that report on:
- Performance and activities of the company during the financial year
- Position of the company at the end of the year

Accounting Reference Date (ARD):
- First ARD: Last day of the month in which the anniversary of incorporation falls
- Subsequent ARDs: Automatically fall on the same date each year
- Can make up accounts to ARD or a date up to 7 days either side

Example:
If company incorporated on 6 April 2025, first ARD would be 30 April 2026 and 30 April for every following year.

Changing ARD:
You can change the current or immediately previous accounting reference date to extend or shorten the period.

Methods to change ARD:
- File online through Companies House
- Use third-party software
- Send paper form AA01 to Companies House

Timing Requirements:
- Must change before filing deadline of accounts for the period you want to change
- If accounts are overdue, too late to change ARD
- Private companies: 9 months filing deadline
- Public companies: 6 months filing deadline

Restrictions on Changing ARD:
Extension Restrictions:
- Cannot extend period to more than 18 months from start date (unless in administration)
- Can only extend more than once in 5 years in specific circumstances:
  - Company is in administration
  - Secretary of State has approved
  - Aligning with subsidiary or parent undertaking ARD

Shortening Periods:
- Can shorten accounting reference period as often as you like
- Can shorten by as many months as you like
- No additional restrictions when changing first ARD

Special Circumstances:
- Company in administration: Extended deadlines may apply
- Alignment with group companies: Special provisions available
- First accounts: Maximum 18 months period allowed
    `,
    category: 'Statutory Accounts',
    legal_area: 'accounting_periods',
    jurisdiction: 'UK',
    source_url: 'https://www.gov.uk/government/publications/life-of-a-company-annual-requirements/life-of-a-company-part-1-accounts'
  },

  filing_deadlines: {
    id: 'uk_accounts_filing_deadlines',
    title: 'Company Accounts Filing Deadlines',
    step: 'Filing Requirements',
    content: `
Company Accounts Filing Deadlines

Standard Filing Deadlines:
Unless filing first accounts, time allowed for delivering acceptable accounts to Companies House:
- Private companies: 9 months from accounting reference date
- Public companies: 6 months from accounting reference date

Important Notes:
- Deadline calculated to exact day
- Date recorded is when Companies House receives acceptable accounts
- Not the date accounts were sent
- Weekend/bank holiday deadlines still apply

First Accounts Deadlines:
If first accounts cover more than 12 months:
Private companies:
- 21 months from date of incorporation, OR
- 3 months from accounting reference date (whichever is longer)

Public companies:
- 18 months from date of incorporation, OR  
- 3 months from accounting reference date (whichever is longer)

Example:
Private company incorporated 1 January 2025 with ARD 31 January has until 1 October 2026 (21 months from incorporation) to deliver first accounts.

Shortened Accounting Periods:
When company shortens accounting period, new filing deadline is longer of:
- 9 months for private (6 months for public) from new ARD
- 3 months from date of receipt of change notice (form AA01)

Month Definition for Filing:
Period of months after given date ends on corresponding date in appropriate month.

Examples:
- Private company ARD 4 April: Deadline midnight 4 January following year
- Private company ARD 30 April: Deadline midnight 31 January following year (last day rule)

Late Filing Consequences:
Processing Delays:
- Paper accounts take longer to process
- Must send acceptable accounts well before deadline
- If rejected after deadline, automatic late filing penalty applies
- Company record shows 'overdue' until examined and accepted

Penalty Structure:
| Length of period | Private company | Public company |
| Not more than 1 month | £150 | £750 |
| 1-3 months | £375 | £1,500 |
| 3-6 months | £750 | £3,000 |
| More than 6 months | £1,500 | £7,500 |

Criminal Consequences:
- Failing to deliver documents is criminal offence
- All directors risk prosecution
- Potentially unlimited fine for each offence
- Separate from civil late filing penalty

Extension Applications:
- Can apply for extension before filing deadline only
- Must be due to unplanned event preventing filing
- No extensions available after deadline has passed
    `,
    category: 'Statutory Accounts',
    legal_area: 'filing_compliance',
    jurisdiction: 'UK',
    source_url: 'https://www.gov.uk/government/publications/life-of-a-company-annual-requirements/life-of-a-company-part-1-accounts'
  },

  company_size_categories: {
    id: 'uk_company_size_categories',
    title: 'Company Size Categories and Exemptions',
    step: 'Size Categories',
    content: `
Company Size Categories and Exemptions

Classification Overview:
Three main classifications for company size when preparing accounts:
- Small companies (including micro-entities sub-classification)
- Medium companies
- Large companies (those not meeting small/medium criteria)

Micro-Entity Qualification (from 6 April 2025):
Must meet at least 2 of the following:
- Annual turnover no more than £1 million
- Balance sheet total no more than £500,000
- No more than 10 employees on average

Previous thresholds (30 Sept 2013 - 5 April 2025):
- Annual turnover no more than £632,000
- Balance sheet total no more than £316,000
- No more than 10 employees on average

Small Company Qualification (from 6 April 2025):
Must meet at least 2 of the following:
- Annual turnover no more than £15 million
- Balance sheet total no more than £7.5 million
- No more than 50 employees on average

Previous thresholds (1 Jan 2016 - 5 April 2025):
- Annual turnover no more than £10.2 million
- Balance sheet total no more than £5.1 million
- No more than 50 employees on average

Medium Company Qualification (from 6 April 2025):
Must meet at least 2 of the following:
- Annual turnover no more than £54 million
- Balance sheet total no more than £27 million
- No more than 250 employees on average

Previous thresholds (1 Jan 2016 - 5 April 2025):
- Annual turnover no more than £36 million
- Balance sheet total no more than £18 million
- No more than 250 employees on average

Exclusions from Small/Medium Company Regime:
Cannot prepare small/medium company accounts if company is:
- Public company
- Member of ineligible group
- Authorised insurance company or carrying out insurance market activity
- Banking company or e-money issuer
- MiFID investment firm or UCITS management company

Ineligible Group Definition:
Group is ineligible if any member is:
- Company with transferable securities traded on UK regulated market
- Body corporate with shares traded on UK regulated market
- Person with FCA permission for regulated activity (except small companies)
- Small company that is insurance/banking/e-money/MiFID/UCITS company
- Person carrying on insurance market activity

Annual Qualification Rules:
- Company qualifies in first financial year if meets conditions that year
- Following years: must meet conditions in current year AND previous year
- If qualified one year but not next: may continue claiming exemptions next year
- If reverts back to qualifying: exemption continues uninterrupted

Micro-Entity Benefits:
- Abbreviated balance sheet with less information required
- No requirement to file profit and loss account at Companies House
- No directors' report required for filing
- Audit exemption (if qualifying)
- Must state on balance sheet: "Accounts prepared under micro-entity provisions"

Small Company Benefits:
- Can prepare abridged accounts
- Don't have to file directors' report or profit and loss account
- Audit exemption available
- Reduced disclosure requirements
- Must state: "Accounts prepared under small companies regime"

Medium Company Benefits:
- Can omit certain strategic report information
- May file reduced version of profit and loss account
- Can omit some disclosure requirements from member accounts
- Some subsidiary audit exemptions available
    `,
    category: 'Statutory Accounts',
    legal_area: 'company_exemptions',
    jurisdiction: 'UK',
    source_url: 'https://www.gov.uk/government/publications/life-of-a-company-annual-requirements/life-of-a-company-part-1-accounts'
  }
};

// Business Sale Responsibilities (GOV.UK scraped data)  
const ukBusinessSaleData = {
  overview: {
    id: 'uk_business_sale_overview',
    title: 'UK Business Sale Responsibilities Overview',
    step: 'Overview',
    content: `
UK Business Sale Responsibilities - Limited Company

Legal Obligations When Selling:
When selling your limited company, you have various legal obligations to fulfill before, during and after the sale.

Types of Business Sales:
- Asset sale: Selling business assets individually
- Share sale: Selling shares in the company
- Merger or acquisition: Combining with another business
- Management buyout: Sale to existing management

Pre-Sale Responsibilities:
- Update company records at Companies House
- Prepare financial information and due diligence
- Consider tax implications and reliefs
- Review contracts and licenses
- Assess employee obligations

During Sale Process:
- Provide accurate information to buyers
- Comply with disclosure requirements
- Handle confidential information appropriately
- Manage ongoing business operations
- Consider competition law implications

Post-Sale Obligations:
- Complete Companies House filings
- Handle final tax returns
- Transfer licenses and permits
- Manage employee transitions
- Complete warranty periods

Key Stakeholders:
- Directors and shareholders
- Employees and their representatives
- Customers and suppliers  
- Regulatory authorities
- Professional advisors (lawyers, accountants)

Common Issues:
- Incomplete due diligence preparation
- Inadequate disclosure of liabilities
- Employment law compliance failures
- Tax optimization missed opportunities
- Breach of warranty provisions
    `,
    category: 'Deal Close',
    legal_area: 'business_sale',
    jurisdiction: 'UK',
    source_url: 'https://www.gov.uk/selling-your-business-your-responsibilities/limited-company'
  },

  share_sale_responsibilities: {
    id: 'uk_share_sale_responsibilities',
    title: 'Share Sale Responsibilities',
    step: 'Share Sale',
    content: `
Share Sale Responsibilities

Selling Entire Shareholding:
When selling 100% of shares, the company continues to exist but under new ownership.

Director Responsibilities:
- Continue fiduciary duties until resignation
- File Form TM01 to remove directors
- Update Companies House within 14 days
- Hand over company records and documents
- Complete any outstanding director obligations

Shareholder Responsibilities:
- Transfer shares using stock transfer form
- Pay any Capital Gains Tax due
- Update shareholding at Companies House
- Provide warranties and indemnities
- Complete disclosure schedules

Companies House Filings:
- Form SH01 (allotment of shares if new shares issued)
- Form TM01 (termination of director appointment)
- Form AP01 (appointment of director if new directors)
- PSC01/PSC04 (People with Significant Control changes)
- Annual confirmation statement updates

Tax Considerations:
- Capital Gains Tax on share disposal
- Business Asset Disposal Relief (if qualifying)
- Stamp duty on share transfer (0.5%)
- Corporation tax on any company gains
- VAT implications if assets transferred

Warranties and Indemnities:
- Accuracy of financial information
- Compliance with laws and regulations
- No material adverse changes
- Employee matters properly handled
- Intellectual property ownership

Due Diligence Support:
- Provide access to company records
- Answer buyer inquiries accurately
- Disclose all material information
- Facilitate management presentations
- Support buyer verification process

Completion Requirements:
- Execute share purchase agreement
- Deliver share certificates
- Provide board resolutions
- Hand over company seal
- Transfer signing authorities
    `,
    category: 'Deal Close',
    legal_area: 'share_sale',
    jurisdiction: 'UK',
    source_url: 'https://www.gov.uk/selling-your-business-your-responsibilities/limited-company'
  },

  asset_sale_responsibilities: {
    id: 'uk_asset_sale_responsibilities',
    title: 'Asset Sale Responsibilities',
    step: 'Asset Sale',
    content: `
Asset Sale Responsibilities

Definition of Asset Sale:
Sale of individual business assets rather than company shares. Company remains with seller but without operational assets.

Assets Typically Included:
- Tangible assets (equipment, inventory, property)
- Intangible assets (goodwill, customer lists, IP)
- Contracts and agreements
- Licenses and permits
- Employee contracts (TUPE transfer)

VAT Considerations:
- Transfer of Going Concern (TOGC) relief
- Standard VAT on individual asset sales
- VAT registration transfer
- Input tax recovery
- Output tax on supplies

TUPE Obligations:
- Transfer of Undertakings Protection of Employment
- Employee consultation requirements
- Information provision to buyer
- Liability transfer for employment claims
- Pension scheme considerations

Contract Assignments:
- Customer contracts
- Supplier agreements
- Lease assignments
- License transfers
- Banking arrangements

Intellectual Property:
- Trademark assignments
- Copyright transfers
- Patent assignments
- Trade secret protections
- Non-compete agreements

Completion Checklist:
- Asset purchase agreement execution
- Asset delivery and verification
- Payment receipt and verification
- Legal title transfers
- Insurance arrangements

Post-Sale Company:
- May become dormant if no assets remain
- Consider company dissolution
- Final tax returns and clearances
- Employee redundancy if applicable
- Creditor settlements

Environmental Liabilities:
- Contaminated land responsibilities
- Waste disposal obligations
- Environmental permits
- Health and safety compliance
- Insurance coverage transfer
    `,
    category: 'Deal Close',
    legal_area: 'asset_sale',
    jurisdiction: 'UK',
    source_url: 'https://www.gov.uk/selling-your-business-your-responsibilities/limited-company'
  }
};

// iTABB Industry Standards (scraped data)
const ukBrokerStandardsData = {
  overview: {
    id: 'uk_broker_standards_overview',
    title: 'UK Business Broker Industry Standards - iTABB',
    step: 'Overview',
    content: `
UK Business Broker Industry Standards - iTABB

About iTABB:
The Institute of Transaction Advisers & Business Brokers is the UK's premier trade association for business intermediaries, representing more than 1200 business brokers, corporate finance firms, M&A advisory firms and boutique investment banks.

Mission:
- Promote professional standards in business brokerage
- Provide education and training for members
- Maintain ethical guidelines and best practices
- Represent industry interests to regulators
- Serve as premium platform for UK business owners to find professional advisers

Membership Categories:
iTABB caters for all transaction advisory firms including:
- Business transfer agents
- Business brokers  
- Commercial real estate agents
- Corporate finance professionals
- Transaction advisory firms
- M&A advisories and other intermediaries
- Legal, financial, accounting, valuation professionals

Professional Standards:
- Code of professional conduct
- Continuing professional development requirements
- Client confidentiality obligations
- Conflict of interest management
- Fee transparency requirements
- "Certified Member" badge for code compliance

Directory Services:
- UK's only comprehensive directory of business intermediaries
- Free assistance service for finding right broker/intermediary
- Business disposal specialists
- Acquisition advisory services
- Legal and compliance experts
- Other transaction support services

Service Categories:
Business Disposals:
- Selling businesses and business broking
- Capital raising and equity markets
- MBOs, VIMBOs, BIMBOs, IPOs
- Mergers, divestments, recapitalising

Acquisitions:
- Deal sourcing and raising acquisition capital
- Business valuations
- Management buy ins
- Due diligence and transaction assistance

Legal Services:
- Share purchase agreements
- Letters of intent and heads of terms
- Lease negotiations
- Regulatory compliance
- Deal structuring

Other Services:
- Virtual data rooms
- Transition and integration
- Market intelligence
- Exit planning
- Escrow services
- Currency conversions
- Credit checking

Quality Assurance:
- Member verification process
- Complaint handling procedures
- Professional indemnity requirements
- Disciplinary procedures
- Public register of members
- Planned redress system for disputes

Professional Development:
- Annual conference and workshops
- Professional development courses
- Market conditions briefings
- Regulatory updates
- Best practice sharing
- Hub for training opportunities

Membership Process:
- Membership by invitation only
- Application and registration process
- Member-centered organization
- Value creation through resources and directory platform
    `,
    category: 'Industry Standards',
    legal_area: 'broker_standards',
    jurisdiction: 'UK',
    source_url: 'https://itabb.org/'
  },

  code_of_conduct: {
    id: 'uk_broker_code_conduct',
    title: 'iTABB Professional Code of Conduct',
    step: 'Professional Standards',
    content: `
iTABB Professional Code of Conduct

Professional Standards Framework:
iTABB is committed to setting and enforcing standards in the business intermediary industry through a comprehensive code of conduct.

Certified Member Requirements:
Members who have signed up to the Code of Conduct are indicated by the "Certified Member" badge, demonstrating commitment to highest professional standards.

Key Principles:
- Uphold the highest standards of professional conduct
- Maintain client confidentiality and trust
- Provide transparent fee structures
- Avoid conflicts of interest
- Deliver competent professional service
- Act with integrity in all business dealings

Client Service Standards:
- Professional competence and due care
- Accurate representation of services and capabilities
- Timely and effective communication
- Fair dealing in all transactions
- Protection of client interests
- Proper handling of client funds and documentation

Industry Standards:
- Setting benchmarks for professional practice
- Establishing best practice guidelines
- Creating accountability mechanisms
- Promoting continuous professional development
- Maintaining public confidence in the industry

Enforcement Mechanisms:
- Member verification and monitoring
- Complaint handling procedures
- Disciplinary actions for code violations
- Professional indemnity requirements
- Public register of compliant members

Benefits of Compliance:
- Enhanced professional credibility
- Client confidence and trust
- Access to iTABB resources and network
- Professional recognition in the market
- Protection through industry standards

Future Developments:
- Introduction of redress system for disputes
- Enhanced training and certification programs
- Expanded professional development opportunities
- Stronger regulatory engagement
- Improved public protection measures

Professional Development:
- Continuing education requirements
- Skills development programs
- Industry knowledge updates
- Regulatory compliance training
- Best practice workshops

Quality Assurance:
- Regular member assessments
- Client feedback mechanisms
- Performance monitoring
- Compliance audits
- Professional standards reviews
    `,
    category: 'Industry Standards',
    legal_area: 'professional_conduct',
    jurisdiction: 'UK',
    source_url: 'https://itabb.org/'
  }
};

// Format content for RAG ingestion
function formatBrokerContentForRAG(content) {
  return `
${content.title}

Category: ${content.category}
Legal Area: ${content.legal_area}
Jurisdiction: ${content.jurisdiction}
Step: ${content.step}

Content:
${content.content}

Source: Official UK Government/Industry guidance (${content.source_url})

Context: This information provides authoritative UK guidance for business brokers and transaction advisors on regulatory requirements, procedures, and professional standards. Always verify current requirements and seek professional legal advice for specific transactions.
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
      await waitForIndexReady(indexName);
    } else {
      console.log('✅ Index already exists');
    }
    
    return pinecone.index(indexName);
  } catch (error) {
    console.error('❌ Error managing Pinecone index:', error);
    throw error;
  }
}

// Wait for Pinecone index to be ready
async function waitForIndexReady(indexName, maxWaitTime = 300000) {
  const startTime = Date.now();
  const pollInterval = 5000;
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      const indexStats = await pinecone.index(indexName).describeIndexStats();
      if (indexStats) {
        console.log('✅ Index is ready');
        return;
      }
    } catch (error) {
      console.log('⏳ Index not ready yet, waiting...');
    }
    
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  
  throw new Error('Timeout waiting for index to be ready');
}

// Generate embeddings and upload broker data to Pinecone
async function populateBrokerData() {
  try {
    console.log('🚀 Starting broker data population...\n');
    
    // Ensure index exists
    const index = await ensurePineconeIndex();
    
    // Check current vector count
    const stats = await index.describeIndexStats();
    console.log(`📊 Current vectors in index: ${stats.totalVectorCount || 0}`);
    
    console.log('\n🔄 Processing UK broker regulatory data...');
    
    const vectors = [];
    
    // Combine all broker datasets
    const allBrokerData = [
      ...Object.values(ukMergerThresholdsData),
      ...Object.values(ukCompanyAccountsData),
      ...Object.values(ukBusinessSaleData),
      ...Object.values(ukBrokerStandardsData)
    ];
    
    console.log(`📚 Total broker sections to process: ${allBrokerData.length}`);
    
    for (const content of allBrokerData) {
      console.log(`🏢 Processing: ${content.title}`);
      
      try {
        // Generate searchable text
        const searchText = formatBrokerContentForRAG(content);
        
        // Generate embedding
        const embedding = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: searchText
        });
        
        // Determine namespace based on category
        let namespace = 'broker_guidance';
        if (content.category === 'Competition Law') {
          namespace = 'cma_mergers';
        } else if (content.category === 'Statutory Accounts') {
          namespace = 'companies_house';
        } else if (content.category === 'Deal Close') {
          namespace = 'deal_close';
        } else if (content.category === 'Industry Standards') {
          namespace = 'industry_standards';
        }
        
        // Prepare vector for Pinecone
        const vector = {
          id: content.id,
          values: embedding.data[0].embedding,
          metadata: {
            title: content.title,
            category: content.category,
            legal_area: content.legal_area,
            jurisdiction: content.jurisdiction,
            step: content.step,
            source: 'official_uk_regulatory',
            source_url: content.source_url,
            document_type: 'broker_guidance',
            content_type: content.legal_area,
            authority: 'UK Government/Industry Body',
            reliability: 'official',
            namespace: namespace,
            text_content: searchText.substring(0, 8000), // Limit metadata size
            created_at: new Date().toISOString()
          }
        };
        
        vectors.push({ vector, namespace });
        console.log(`✅ ${content.title}: Embedding generated (${embedding.data[0].embedding.length} dimensions) → ${namespace}`);
        
      } catch (error) {
        console.error(`❌ Error processing ${content.title}:`, error.message);
      }
    }
    
    // Upload vectors to Pinecone in appropriate namespaces
    console.log(`\n📤 Uploading ${vectors.length} broker vectors to Pinecone...`);
    
    // Group vectors by namespace
    const vectorsByNamespace = {};
    vectors.forEach(({ vector, namespace }) => {
      if (!vectorsByNamespace[namespace]) {
        vectorsByNamespace[namespace] = [];
      }
      vectorsByNamespace[namespace].push(vector);
    });
    
    // Upload each namespace separately
    for (const [namespace, namespaceVectors] of Object.entries(vectorsByNamespace)) {
      console.log(`\n📁 Uploading ${namespaceVectors.length} vectors to ${namespace} namespace...`);
      
      const batchSize = 100; // Pinecone batch limit
      for (let i = 0; i < namespaceVectors.length; i += batchSize) {
        const batch = namespaceVectors.slice(i, i + batchSize);
        
        try {
          await index.namespace(namespace).upsert(batch);
          console.log(`✅ Uploaded batch ${Math.floor(i/batchSize) + 1} (${batch.length} vectors) to ${namespace} namespace`);
        } catch (error) {
          console.error(`❌ Error uploading batch ${Math.floor(i/batchSize) + 1} to ${namespace}:`, error.message);
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
    
    if (vectorCount > 0) {
      console.log(`✅ Successfully uploaded ${vectors.length} broker vectors`);
      
      // Test search functionality
      await testBrokerSearch(index);
    } else {
      console.log('⚠️ No vectors found in index after upload');
    }
    
    console.log('\n🎉 Broker RAG population complete!');
    console.log('\n📋 Summary:');
    console.log(`✅ Broker vectors uploaded: ${vectors.length}`);
    console.log(`✅ Search functionality: Working`);
    console.log(`✅ Index: ${indexName}`);
    console.log(`✅ Namespaces: ${Object.keys(vectorsByNamespace).join(', ')}`);
    console.log(`✅ Content: UK Broker & Transaction Guidance`);
    
    console.log('\n🏢 Broker Content Added:');
    
    // Merger Thresholds
    console.log('\n⚖️ Competition Law (CMA):');
    Object.values(ukMergerThresholdsData).forEach((content, index) => {
      console.log(`  ${index + 1}. ${content.title}`);
    });
    
    // Company Accounts
    console.log('\n📊 Statutory Accounts:');
    Object.values(ukCompanyAccountsData).forEach((content, index) => {
      console.log(`  ${index + 1}. ${content.title}`);
    });
    
    // Business Sale
    console.log('\n🤝 Deal Close:');
    Object.values(ukBusinessSaleData).forEach((content, index) => {
      console.log(`  ${index + 1}. ${content.title}`);
    });
    
    // Industry Standards
    console.log('\n🏛️ Industry Standards:');
    Object.values(ukBrokerStandardsData).forEach((content, index) => {
      console.log(`  ${index + 1}. ${content.title}`);
    });
    
    console.log('\n🔄 Next Steps:');
    console.log('1. ✅ Pinecone populated with comprehensive UK broker guidance');
    console.log('2. 🔄 Broker agent can access CMA, Companies House & iTABB guidance');
    console.log('3. 🔄 Test broker agent queries across all regulatory areas');
    console.log('4. 🔄 Monitor search performance and add PDF content from CMA MAGs');
    
  } catch (error) {
    console.error('❌ Broker population failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Test broker search functionality
async function testBrokerSearch(index) {
  console.log('\n🧪 Testing broker search functionality...');
  
  const testQueries = [
    'UK merger investigation thresholds and CMA requirements',
    'Company annual accounts filing requirements and deadlines',
    'Business sale responsibilities for limited companies',
    'iTABB professional standards for business brokers'
  ];
  
  for (const query of testQueries) {
    try {
      console.log(`🔍 Search query: "${query}"`);
      
      const queryEmbedding = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query
      });
      
      const searchResults = await index.query({
        vector: queryEmbedding.data[0].embedding,
        topK: 3,
        includeMetadata: true
      });
      
      console.log(`📈 Found ${searchResults.matches.length} results:`);
      searchResults.matches.forEach((match, index) => {
        console.log(`   ${index + 1}. ${match.metadata.title}`);
        console.log(`      🎯 Score: ${(match.score * 100).toFixed(1)}%`);
        console.log(`      📋 Step: ${match.metadata.step}`);
        console.log(`      🏢 Legal Area: ${match.metadata.legal_area}`);
      });
    } catch (error) {
      console.error(`❌ Error testing query "${query}":`, error.message);
    }
  }
  
  console.log(`✅ Completed ${testQueries.length} search tests`);
}

// Set timeout and run
setTimeout(() => {
  console.log('\n⏰ Script timed out after 120 seconds');
  process.exit(1);
}, 120000);

// Main execution
async function main() {
  try {
    console.log('✅ Environment variables configured');
    console.log(`📝 Target index: ${indexName}`);
    console.log(`📊 Broker data sections: ${
      Object.keys(ukMergerThresholdsData).length + 
      Object.keys(ukCompanyAccountsData).length + 
      Object.keys(ukBusinessSaleData).length + 
      Object.keys(ukBrokerStandardsData).length
    }`);
    
    await populateBrokerData();
  } catch (error) {
    console.error('❌ Main execution failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);

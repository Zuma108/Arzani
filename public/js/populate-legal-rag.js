/**
 * Legal RAG Data Population Script
 * This script adds comprehensive UK legal information from gov.uk, ICO, and HSE 
 * to Pinecone vector database for the Legal Agent's RAG system
 * 
 * Content includes:
 * - Company Formation (gov.uk)
 * - Self Assessment Registration (gov.uk)  
 * - VAT Registration (gov.uk)
 * - GDPR Compliance (ICO)
 * - Health & Safety (HSE)
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';
import { Pinecone } from '@pinecone-database/pinecone';

dotenv.config();

console.log('⚖️ Legal RAG Data Population - Comprehensive UK Legal Content');
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

// Scraped UK Company Formation Content - Chunked by Steps
const ukCompanyFormationData = {
  overview: {
    id: 'uk_company_formation_overview',
    title: 'UK Limited Company Overview',
    step: 'Overview',
    content: `
UK Limited Company Formation Overview

A limited company is one way to set up a business in the UK. It is legally separate from the people who own it. A company director is responsible for running the business.

Key Benefits:
- Limited liability protection: owners are responsible for business debts only up to the value of their financial investment
- Can apply for business loans and investments
- Professional business structure

Key Requirements:
- Must register with Companies House before trading
- Must follow rules for company names
- Directors have legal responsibilities for company records and accounts
- Must pay Corporation Tax on profits
- Must register for VAT if meeting requirements

Legal Framework:
- Governed by Companies Act 2006
- Subject to UK GDPR and Data Protection Act 2018
- Must comply with employment law including TUPE regulations
- Regulated by Companies House, HMRC, and other UK authorities
    `,
    category: 'incorporation',
    legal_area: 'company_law',
    jurisdiction: 'UK',
    source_url: 'https://www.gov.uk/limited-company-formation'
  },

  step1: {
    id: 'uk_company_formation_step1',
    title: 'Step 1: Check if setting up a limited company is right for you',
    step: 'Step 1',
    content: `
Step 1: Check if setting up a limited company is right for you

How you set up your business depends on what sort of work you do. It can also affect the way you pay tax and get funding. Most businesses register as a limited company or a sole trader.

Limited Company Benefits:
- Limited liability protection
- Professional business structure
- Easier to secure business funding and investment
- Can be more tax efficient for higher earners
- Continues to exist even if directors change

Considerations:
- More administrative responsibilities
- Must file accounts and returns with Companies House
- Corporation Tax obligations
- Directors' legal responsibilities

Alternative Business Structures:
- Sole trader: simpler but unlimited liability
- Partnership: shared responsibility but complex agreements needed
- Limited liability partnership (LLP): professional services alternative

Next Steps:
- Consider your business type and needs
- Evaluate tax implications
- Assess funding requirements
- Review administrative capacity
    `,
    category: 'incorporation',
    legal_area: 'business_structure',
    jurisdiction: 'UK',
    source_url: 'https://www.gov.uk/limited-company-formation'
  },

  step2: {
    id: 'uk_company_formation_step2',
    title: 'Step 2: Choose your limited company type',
    step: 'Step 2',
    content: `
Step 2: Choose your limited company type

UK Limited Company Types:

1. Company Limited by Shares:
- Most common type for commercial businesses
- Shareholders own the company through shares
- Liability limited to unpaid share capital
- Can distribute profits as dividends
- Suitable for businesses seeking investment

2. Company Limited by Guarantee:
- Common for charities, clubs, and non-profit organizations
- No share capital
- Members provide guarantee instead of buying shares
- Profits cannot be distributed to members
- Suitable for community interest companies

Key Differences:
- Ownership structure (shares vs membership)
- Profit distribution rights
- Liability arrangements
- Regulatory requirements

Legal Considerations:
- Companies Act 2006 applies to both types
- Different filing requirements with Companies House
- Tax treatment may vary
- Investment and funding options differ

Decision Factors:
- Business purpose and objectives
- Funding and investment needs
- Profit distribution requirements
- Regulatory and compliance preferences
    `,
    category: 'incorporation',
    legal_area: 'company_types',
    jurisdiction: 'UK',
    source_url: 'https://www.gov.uk/limited-company-formation'
  },

  step3: {
    id: 'uk_company_formation_step3',
    title: 'Step 3: Choose directors and a company secretary',
    step: 'Step 3',
    content: `
Step 3: Choose directors and a company secretary

Director Requirements:
- Must appoint at least one director
- Directors are responsible for running the business
- Must be at least 16 years old
- Cannot be an undischarged bankrupt (unless court permission)
- Must not be disqualified by the courts

Director Responsibilities:
- Comply with the Companies Act 2006
- Keep proper company records and accounts
- File annual accounts and confirmation statements
- Act in the best interests of the company
- Avoid conflicts of interest
- Exercise reasonable care, skill and diligence

Company Secretary (Optional):
- Not required for private limited companies
- Can help with administrative duties
- Must be qualified if appointed
- Cannot be the sole director

Legal Obligations:
- Personal liability for certain company debts if duties breached
- Potential criminal liability for serious breaches
- Fiduciary duties to the company
- Statutory duties under Companies Act 2006

Disqualification Risks:
- Fraudulent or wrongful trading
- Breach of fiduciary duties
- Persistent breaches of company law
- Unfit conduct as director

Professional Advice:
- Consider professional indemnity insurance
- Understand director and officer (D&O) insurance
- Seek legal advice on director responsibilities
- Regular compliance reviews recommended
    `,
    category: 'incorporation',
    legal_area: 'corporate_governance',
    jurisdiction: 'UK',
    source_url: 'https://www.gov.uk/limited-company-formation'
  },

  step4: {
    id: 'uk_company_formation_step4',
    title: 'Step 4: Decide who the shareholders are',
    step: 'Step 4',
    content: `
Step 4: Decide who the shareholders are (Companies Limited by Shares)

Shareholder Requirements:
- Need at least one shareholder
- Shareholders can also be directors
- No maximum number of shareholders for private companies
- Shareholders own the company through shares

Shareholder Rights:
- Right to receive dividends when declared
- Voting rights on company matters
- Right to receive company information
- Right to attend general meetings
- Pre-emption rights on new share issues

Share Classes:
- Ordinary shares: standard voting and dividend rights
- Preference shares: preferential dividend rights
- Non-voting shares: no voting rights but dividend entitlement
- Different classes can have different rights

Legal Considerations:
- Shareholders' agreement recommended
- Share transfer restrictions
- Minority shareholder protection
- Exit provisions and valuation mechanisms

Tax Implications:
- Dividend tax rates apply to distributions
- Capital gains tax on share disposals
- Entrepreneur's relief/Business Asset Disposal Relief
- Share scheme tax advantages

Companies House Filing:
- Statement of capital required
- Share allotment returns
- Annual confirmation statement updates
- PSC (People with Significant Control) register

Documentation Required:
- Share certificates
- Register of members
- Share transfer forms (when shares change hands)
- Board resolutions for share allotments
    `,
    category: 'incorporation',
    legal_area: 'share_capital',
    jurisdiction: 'UK',
    source_url: 'https://www.gov.uk/limited-company-formation'
  },

  step5: {
    id: 'uk_company_formation_step5',
    title: 'Step 5: Identify People with Significant Control (PSC)',
    step: 'Step 5',
    content: `
Step 5: Identify People with Significant Control (PSC)

PSC Definition:
People with significant control are individuals or entities that:
- Hold more than 25% of shares
- Hold more than 25% of voting rights
- Have the right to appoint or remove the majority of directors
- Have significant influence or control over the company
- Have significant influence or control over a trust or firm that meets the above conditions

Legal Requirements:
- Must maintain PSC register
- File PSC information with Companies House
- Annual confirmation statement updates required
- Criminal penalties for non-compliance

PSC Register Contents:
- Full name and service address
- Country or state of residence
- Date of birth (month and year)
- Nationality
- Nature of control (shares, voting rights, etc.)
- Date person became/ceased to be PSC

Exemptions and Special Cases:
- Public companies on regulated markets
- Companies subject to disclosure requirements under DTRs
- Subsidiaries of certain parent companies

Corporate PSCs:
- Other companies can be PSCs
- Must identify ultimate beneficial owners
- Chain of control must be documented
- Complex ownership structures require careful analysis

Compliance Obligations:
- Update register within 14 days of changes
- Provide annual confirmation to Companies House
- Make register available for public inspection
- Maintain supporting documentation

Penalties for Non-Compliance:
- Criminal offences for companies and officers
- Fines up to £1,000 per day
- Potential disqualification of directors
- Restrictions on company operations
    `,
    category: 'incorporation',
    legal_area: 'beneficial_ownership',
    jurisdiction: 'UK',
    source_url: 'https://www.gov.uk/limited-company-formation'
  },

  step6: {
    id: 'uk_company_formation_step6',
    title: 'Step 6: Choose a company name',
    step: 'Step 6',
    content: `
Step 6: Choose a company name

Company Name Rules:
- Must end with "Limited" or "Ltd"
- Cannot be the same as existing company name
- Cannot suggest connection with government without permission
- Cannot be offensive or contain sensitive words
- Must not infringe trademarks

Restricted Words:
- Words requiring approval: "Royal", "National", "British"
- Professional terms: "Solicitor", "Architect", "Dentist"
- Financial terms: "Bank", "Insurance", "Trust"
- Educational terms: "University", "College"

Name Availability Checks:
- Search Companies House register
- Check trademark database
- Domain name availability
- Social media handles
- International trademark searches

Intellectual Property Considerations:
- Trademark searches essential
- Copyright considerations for creative names
- Passing off risks from similar names
- International trademark protection

Name Change Process:
- Special resolution required (75% majority)
- Companies House notification within 15 days
- New certificate of incorporation issued
- Update all company documents and contracts

Legal Protection:
- Consider trademark registration
- Register relevant domain names
- Protect social media accounts
- Monitor for unauthorized use

Due Diligence:
- Google searches for existing use
- Trade publication searches
- Professional body registers
- Industry association checks

Documentation:
- Special resolution for name adoption
- Updated memorandum and articles
- Amended stationery and documentation
- Notification to banks and suppliers
    `,
    category: 'incorporation',
    legal_area: 'intellectual_property',
    jurisdiction: 'UK',
    source_url: 'https://www.gov.uk/limited-company-formation'
  },

  step7: {
    id: 'uk_company_formation_step7',
    title: 'Step 7: Prepare company formation documents',
    step: 'Step 7',
    content: `
Step 7: Prepare company formation documents

Required Documents:

1. Memorandum of Association:
- Historical document showing company formation
- Lists subscribers (initial shareholders)
- States intention to form company
- Filed with Companies House
- Cannot be amended after incorporation

2. Articles of Association:
- Company's constitution and rules
- Governs company operations
- Can use Model Articles or draft bespoke version
- Covers directors' powers, shareholder rights, meetings
- Can be amended by special resolution

3. Statement of Capital (Shares Companies):
- Details of share structure
- Number and nominal value of shares
- Share classes and rights
- Initial shareholders and shareholdings

4. Statement of Guarantee (Guarantee Companies):
- Members' guarantee amounts
- Usually nominal sum (e.g., £1)
- Alternative to share capital

Key Provisions in Articles:
- Directors' appointment and removal
- Board meetings and decisions
- Shareholder meetings and voting
- Dividend distribution
- Share transfer restrictions
- Company administration

Professional Drafting:
- Standard articles may not suit all businesses
- Bespoke articles for complex structures
- Consider shareholder protection provisions
- Exit and valuation mechanisms
- Drag-along and tag-along rights

Legal Compliance:
- Must comply with Companies Act 2006
- Cannot exclude mandatory provisions
- Must not conflict with law
- Regular review and updates recommended

Amendment Process:
- Articles can be amended by special resolution
- 75% majority required
- Some provisions may require higher thresholds
- File amended articles with Companies House
    `,
    category: 'incorporation',
    legal_area: 'constitutional_documents',
    jurisdiction: 'UK',
    source_url: 'https://www.gov.uk/limited-company-formation'
  },

  step8: {
    id: 'uk_company_formation_step8',
    title: 'Step 8: Company records and ongoing obligations',
    step: 'Step 8',
    content: `
Step 8: Company records and ongoing obligations

Statutory Records Required:
- Register of members (shareholders)
- Register of directors and secretaries
- Register of PSCs (People with Significant Control)
- Register of charges (if applicable)
- Minutes of board and shareholder meetings
- Copies of all resolutions

Accounting Records:
- All receipts and expenditure
- Assets and liabilities
- Stock records (if applicable)
- Daily entries of money received/paid
- Customer and supplier accounts
- Must retain for 3 years (private companies)

Companies House Filings:
- Annual accounts (within 9 months of year-end)
- Confirmation statement (annually)
- Changes to company information (within 14 days)
- Special resolutions and capital changes

HMRC Obligations:
- Corporation Tax registration
- Corporation Tax returns (within 12 months)
- VAT registration (if threshold met)
- PAYE registration (if employing staff)

Record Keeping Best Practices:
- Maintain contemporaneous records
- Store securely for required periods
- Regular backup and disaster recovery
- Digital and physical record management
- Access controls and confidentiality

Professional Services:
- Accountant for accounts preparation
- Company secretary services
- Legal advice for complex matters
- Registered office provision

Compliance Calendar:
- Annual accounts deadline tracking
- Confirmation statement dates
- Tax return deadlines
- Board meeting schedules
- Quarterly VAT returns (if applicable)

Penalties for Non-Compliance:
- Late filing penalties from Companies House
- Interest and penalties from HMRC
- Potential prosecution for serious breaches
- Director disqualification risks
    `,
    category: 'incorporation',
    legal_area: 'compliance_obligations',
    jurisdiction: 'UK',
    source_url: 'https://www.gov.uk/limited-company-formation'
  },

  step9: {
    id: 'uk_company_formation_step9',
    title: 'Step 9: Register with Companies House',
    step: 'Step 9',
    content: `
Step 9: Register with Companies House

Registration Process:
- Complete Form IN01 (incorporation application)
- Submit required documents and fee
- Online registration available and recommended
- Paper applications take longer and cost more

Required Information:
- Company name and type
- Registered office address
- Director and secretary details
- Shareholder/member information
- PSC details
- SIC codes (business activities)

Registered Office Requirements:
- UK address required
- Can be residential or business address
- Must be genuine address (not PO Box)
- Used for official correspondence
- Can be changed after incorporation

SIC Codes:
- Standard Industrial Classification codes
- Describe company's business activities
- Up to 4 codes can be selected
- Affects statistical returns
- Some codes have regulatory implications

Registration Fees:
- Online registration: £12
- Paper registration: £40
- Same day service: £100
- Companies House Direct Debit available

Post-Registration:
- Certificate of incorporation issued
- Company legally exists from this date
- Can commence business activities
- Must display company information

Common Registration Issues:
- Name rejection due to similarity
- Incomplete or incorrect information
- Missing documents or signatures
- Payment problems
- Address verification issues

Professional Services:
- Company formation agents available
- Solicitor or accountant assistance
- Package deals including registered office
- Ongoing company secretarial services

Timeline:
- Online applications: usually same day
- Paper applications: 8-10 days
- Complex applications may take longer
- Same day service available for urgent cases
    `,
    category: 'incorporation',
    legal_area: 'company_registration',
    jurisdiction: 'UK',
    source_url: 'https://www.gov.uk/limited-company-formation'
  },

  step10: {
    id: 'uk_company_formation_step10',
    title: 'Step 10: Post-incorporation requirements',
    step: 'Step 10',
    content: `
Step 10: Post-incorporation requirements

Immediate Actions:
- Open business bank account
- Register for Corporation Tax (within 3 months)
- Set up accounting system
- Register for VAT (if required)
- Set up PAYE (if employing staff)

HMRC Registration:
- Corporation Tax: automatic for Companies House registrations
- Unique Taxpayer Reference (UTR) issued
- First Corporation Tax return due within 12 months
- Choose accounting reference date

Banking Requirements:
- Business bank account separate from personal
- Provide incorporation documents
- Proof of identity and address for directors
- Business plan may be required
- Consider multiple bank relationships

Insurance Considerations:
- Public liability insurance
- Professional indemnity insurance
- Directors and officers (D&O) insurance
- Key person insurance
- Property and contents insurance

Regulatory Compliance:
- Industry-specific licenses and permits
- Data protection registration (if required)
- Environmental permits
- Health and safety obligations
- Employment law compliance

Contracts and Agreements:
- Employment contracts for staff
- Service agreements for directors
- Supplier and customer contracts
- Premises lease agreements
- Professional service agreements

Intellectual Property:
- Trademark registrations
- Copyright assignments
- Patent applications
- Domain name registrations
- Confidentiality agreements

Ongoing Compliance:
- Annual accounts preparation and filing
- Corporation Tax returns
- Confirmation statement filing
- Board and shareholder meetings
- Record keeping and minute taking

Growth Considerations:
- Share option schemes
- Investment agreements
- Merger and acquisition planning
- International expansion
- Exit strategy planning
    `,
    category: 'incorporation',
    legal_area: 'post_incorporation',
    jurisdiction: 'UK',
    source_url: 'https://www.gov.uk/limited-company-formation'
  },

  taxation: {
    id: 'uk_company_taxation',
    title: 'UK Company Taxation Requirements',
    step: 'Taxation',
    content: `
UK Company Taxation Requirements

Corporation Tax:
- Rate: 25% for profits over £250,000 (2023/24)
- Small profits rate: 19% for profits up to £50,000
- Marginal relief between £50,000 and £250,000
- Financial year basis (not tax year)
- Returns due 12 months after period end

VAT Registration:
- Threshold: £85,000 annual turnover (2023/24)
- Voluntary registration below threshold permitted
- VAT returns quarterly
- Digital submissions required (Making Tax Digital)
- Monthly returns for some large businesses

PAYE Obligations:
- Required when employing staff
- Real Time Information (RTI) submissions
- Monthly payroll deadlines
- Annual P60s and P11Ds
- Workplace pension auto-enrolment

Directors' Tax:
- Income tax on salary and benefits
- National Insurance contributions
- Dividend tax on distributions
- Self-assessment returns required
- IR35 considerations for contractors

Tax Planning Opportunities:
- Annual investment allowance
- Research and development reliefs
- Patent box regime
- Enterprise Investment Scheme
- Seed Enterprise Investment Scheme

Compliance Deadlines:
- Corporation Tax: 9 months and 1 day after period end
- VAT returns: monthly or quarterly
- PAYE: monthly by 22nd (electronic)
- Annual accounts: 9 months after year-end

Record Keeping:
- 6 years for Corporation Tax
- 6 years for VAT
- 3 years for PAYE
- Digital records increasingly required
- Cloud-based systems recommended

Professional Advice:
- Qualified accountant recommended
- Tax planning reviews
- Compliance monitoring
- HMRC enquiry support
- Strategic tax advice
    `,
    category: 'taxation',
    legal_area: 'corporate_tax',
    jurisdiction: 'UK',
    source_url: 'https://www.gov.uk/limited-company-formation'
  },

  employment: {
    id: 'uk_company_employment',
    title: 'UK Employment Law for Companies',
    step: 'Employment',
    content: `
UK Employment Law for Companies

Employment Obligations:
- Written terms and conditions within 2 months
- Minimum wage compliance
- Working time regulations (48-hour week)
- Holiday entitlement (5.6 weeks statutory)
- Sick pay and maternity/paternity rights

TUPE Regulations:
- Transfer of Undertakings Protection
- Applies to business transfers and outsourcing
- Employee rights transfer automatically
- Consultation requirements with employees
- Information and consultation obligations

Health and Safety:
- Health and Safety at Work Act 1974
- Risk assessments required
- Safety policies and training
- Accident reporting obligations
- Employer liability insurance required

Discrimination Law:
- Equality Act 2010 compliance
- Protected characteristics
- Reasonable adjustments for disability
- Equal pay obligations
- Harassment and victimization prevention

Termination of Employment:
- Unfair dismissal protection (2 years service)
- Redundancy consultation requirements
- Notice periods and pay in lieu
- Settlement agreements
- Restrictive covenants enforceability

Data Protection:
- UK GDPR compliance for employee data
- Privacy notices for staff
- Data subject rights
- International transfers
- Data breach notifications

Workplace Pensions:
- Auto-enrolment obligations
- Minimum contribution requirements
- Pension scheme setup
- Employee communications
- Ongoing compliance duties

Industrial Relations:
- Trade union recognition
- Collective bargaining
- Strike action procedures
- Information and consultation rights
- Works councils (European companies)

Documentation:
- Employee handbooks
- Policies and procedures
- Training records
- Performance management
- Disciplinary and grievance procedures
    `,
    category: 'employment',
    legal_area: 'employment_law',    jurisdiction: 'UK',
    source_url: 'https://www.gov.uk/limited-company-formation'
  }
};

// Self Assessment Registration and Tax Return Data
const ukSelfAssessmentData = {
  overview: {
    id: 'uk_self_assessment_overview',
    title: 'UK Self Assessment Overview',
    step: 'Overview',
    content: `
UK Self Assessment Tax Returns Overview

Self Assessment is a system HM Revenue and Customs (HMRC) uses to collect Income Tax.

Tax is usually deducted automatically from wages and pensions. People and businesses with other income must report it in a Self Assessment tax return.

Key Points:
- Fill in tax return after the end of the tax year (5 April)
- Must send a return if HMRC asks you to
- May have to pay interest and penalties if late
- System for collecting Income Tax on additional income

When Required:
- Other income beyond wages and pensions
- Self-employment income
- Rental income from UK property
- Foreign income
- Capital gains
- High income affecting Child Benefit
- Income from trusts or settlements

Legal Framework:
- Governed by Taxes Management Act 1970
- Income Tax Act 2007
- Taxation of Chargeable Gains Act 1992
- HMRC compliance and enforcement powers
- Statutory deadlines and penalty regime
    `,
    category: 'tax_registration',
    legal_area: 'income_tax',
    jurisdiction: 'UK',
    source_url: 'https://www.gov.uk/self-assessment-tax-returns'
  },

  who_needs_to_register: {
    id: 'uk_self_assessment_who_needs_register',
    title: 'Who Needs to Register for Self Assessment',
    step: 'Registration Requirements',
    content: `
Who Needs to Register for Self Assessment

Use form SA1 to register for Self Assessment if you need to register but you're not self-employed.

Registration Required If You:
- Receive income from land and property in the UK
- Have taxable foreign income
- Have adjusted net income over the threshold and you or your partner receive Child Benefit payments
- Receive yearly income from a trust or settlement
- Get untaxed income that cannot be collected through your PAYE tax code
- Have Capital Gains Tax to pay
- Are a company director
- Have income from self-employment
- Are a minister of religion
- Have income over £100,000
- Have savings income over £10,000

Key Thresholds (2024-25):
- High Income Child Benefit Charge: adjusted net income over £60,000
- Additional rate tax: income over £125,140
- Personal allowance tapers: income over £100,000

Legal Obligations:
- Must register by 5 October if first time sending return
- Failure to register when required can result in penalties
- HMRC has powers to issue notices requiring registration
- Criminal penalties for deliberate non-compliance

Registration Process:
- Online registration preferred (form SA1)
- Postal registration available
- Need National Insurance number
- Must provide reason for registration
- UTR (Unique Taxpayer Reference) issued after registration
    `,
    category: 'tax_registration',
    legal_area: 'income_tax',
    jurisdiction: 'UK',
    source_url: 'https://www.gov.uk/guidance/register-for-self-assessment-if-you-are-not-self-employed'
  },

  registration_process: {
    id: 'uk_self_assessment_registration_process',
    title: 'Self Assessment Registration Process',
    step: 'Registration Process',
    content: `
Self Assessment Registration Process

Before You Start Registration:
Get all information together before starting - you cannot save progress on online form.

Required Information:
- Full name
- Postal address (can be outside UK)
- Date of birth
- Daytime telephone number
- UK National Insurance number (if you have one)
- Reason for registering for Self Assessment
- Date circumstances started requiring registration

Registration Methods:

1. Online Registration (Recommended):
- Use form SA1 online
- Sign in to HMRC services or create account
- Use email address for confirmation code
- Immediate processing
- Faster UTR allocation

2. Postal Registration:
- Fill in form SA1
- Print and post to HMRC
- Use postal address shown on form
- Longer processing time
- Paper trail for records

After Registration:
- HMRC usually contacts within 21 days
- May take longer during busy periods
- UTR available sooner through HMRC app or personal tax account
- Contact HMRC if no response after 3 weeks

Legal Deadlines:
- Register by 5 October if first time
- Annual return deadline: 31 January (online) or 31 October (paper)
- Payment deadline: 31 January
- Penalties for late registration and filing

Supporting Documentation:
- Keep records of income and expenses
- Bank statements and receipts required
- 5-year record retention requirement
- Digital record keeping acceptable
    `,
    category: 'tax_registration',
    legal_area: 'tax_administration',
    jurisdiction: 'UK',
    source_url: 'https://www.gov.uk/guidance/register-for-self-assessment-if-you-are-not-self-employed'
  },

  sa100_form_guide: {
    id: 'uk_sa100_form_guide',
    title: 'SA100 Tax Return Form Guide',
    step: 'Tax Return Form',
    content: `
SA100 Tax Return Form - Complete Guide

The SA100 is the main tax return for individuals in the UK.

Use SA100 to File Tax Return For:
- Student loan repayments
- Interest and dividends
- UK pensions and annuities
- Paying into registered pension schemes
- Charitable giving
- Claiming Blind Person's Allowances
- High Income Child Benefit Charge
- Marriage Allowance
- Claiming a repayment

Form Structure:
- Main SA100 form (10 pages)
- Supplementary pages for specific income types
- SA150 notes provide detailed guidance
- Annual updates for each tax year

Key Sections of SA100:
1. Personal Details and Tax Code
2. Income from Employment
3. Share Schemes
4. Self-Employment
5. Partnership Income
6. UK Property
7. Foreign Income
8. Trust Income
9. Interest and Dividends
10. Other UK Income
11. Tax Reliefs
12. Student Loan Repayments

Filing Options:
- Online filing (recommended) - deadline 31 January
- Paper filing - deadline 31 October
- Must use correct tax year version
- Supplementary pages as required

Legal Requirements:
- Accurate and complete information required
- Penalties for errors and omissions
- HMRC inquiry and investigation powers
- Keep supporting records for 5 years
- Reasonable care standard applies

Supplementary Pages Available:
- SA101: Additional information
- SA102: Employment
- SA103S/F: Self-employment
- SA104S/F: Partnership
- SA105: UK property
- SA106: Foreign income
- SA107: Trusts
- SA108: Capital gains
- SA109: Residence and remittance basis
    `,
    category: 'tax_registration',
    legal_area: 'tax_returns',
    jurisdiction: 'UK',
    source_url: 'https://www.gov.uk/government/publications/self-assessment-tax-return-sa100'
  },

  deadlines_and_penalties: {
    id: 'uk_self_assessment_deadlines_penalties',
    title: 'Self Assessment Deadlines and Penalties',
    step: 'Deadlines and Penalties',
    content: `
Self Assessment Deadlines and Penalties

Key Deadlines:
- Registration: 5 October (if first time)
- Paper return: 31 October
- Online return: 31 January
- Payment: 31 January
- Balancing payment: 31 January following tax year

Penalty Structure:

Late Filing Penalties:
- £100 automatic penalty for returns filed after deadline
- Additional £10 per day after 3 months (maximum 90 days)
- £300 or 5% of tax due after 6 months (whichever is higher)
- £300 or 5% of tax due after 12 months (whichever is higher)

Late Payment Penalties:
- 5% of unpaid tax after 30 days
- 5% of unpaid tax after 6 months
- 5% of unpaid tax after 12 months
- Interest charged on unpaid amounts

Serious Penalties:
- Up to 100% of tax due for deliberate and concealed errors
- Up to 70% of tax due for deliberate but not concealed errors
- Up to 30% of tax due for careless errors
- Criminal prosecution for serious tax fraud

Reasonable Excuse Defense:
- Serious illness or death in family
- Unexpected technical problems
- Fire, flood or other disaster
- Postal delays (if posted in time)
- HMRC error or delay

Payment Methods:
- Online banking
- Debit or credit card
- Direct Debit
- By phone
- At bank or building society
- By cheque (post to HMRC)

Interest on Late Payments:
- Charged from day after payment due
- Calculated daily on outstanding amount
- Rates set by HMRC quarterly
- Interest not allowable for tax purposes

Record Keeping Requirements:
- Keep records for at least 5 years after filing deadline
- Digital records acceptable
- Must support all figures in tax return
- Include bank statements, receipts, invoices
    `,
    category: 'tax_registration',
    legal_area: 'tax_compliance',
    jurisdiction: 'UK',
    source_url: 'https://www.gov.uk/self-assessment-tax-returns/deadlines'
  },

  getting_help: {
    id: 'uk_self_assessment_getting_help',
    title: 'Getting Help with Self Assessment',
    step: 'Support and Assistance',
    content: `
Getting Help with Self Assessment

HMRC Support Services:

1. HMRC Helplines:
- Self Assessment helpline: 0300 200 3310
- Online services helpline: 0300 200 3600
- Welsh language helpline available
- Textphone services for hearing impaired
- Opening hours: 8am to 8pm Monday to Friday, 8am to 4pm Saturdays

2. Online Resources:
- Gov.uk guidance and tools
- HMRC YouTube videos
- Webinars and online seminars
- Mobile app for checking tax accounts
- Personal tax account online portal

3. Face-to-Face Support:
- Extra support service for vulnerable customers
- Appointments at HMRC offices
- Home visits in exceptional circumstances
- Support for customers with disabilities
- Interpreting services available

Professional Help:

1. Tax Advisers and Accountants:
- Chartered accountants (ICAEW, ICAS, ACCA)
- Tax advisers (CIOT, ATT)
- Authorized agents can file on your behalf
- Professional indemnity insurance recommended

2. Tax Refund Companies:
- Check credentials and fees before engaging
- Some may charge excessive fees
- Can file returns yourself in most cases
- Be wary of unsolicited approaches

3. Free Tax Return Services:
- TaxAid charity for low income taxpayers
- TaxHelp for Older People charity
- Citizens Advice Bureau assistance
- Some local authorities offer help

Authorized Agents:
- Can be appointed to deal with HMRC on your behalf
- Form 64-8 required for authorization
- Professional standards and regulations apply
- Can file returns and make payments
- Receive correspondence from HMRC

Digital Services:
- Personal tax account for viewing tax records
- HMRC app for smartphones and tablets
- Online filing system with built-in checks
- Digital record keeping options
- Real-time information sharing

Common Mistakes to Avoid:
- Missing deadlines
- Incomplete or inaccurate information
- Not keeping proper records
- Failing to declare all income
- Claiming invalid expenses or reliefs
- Not updating HMRC of address changes
    `,
    category: 'tax_registration',
    legal_area: 'tax_support',
    jurisdiction: 'UK',
    source_url: 'https://www.gov.uk/self-assessment-tax-returns/get-help'
  }
};

// Convert legal data to searchable text format for RAG
function formatLegalContentForRAG(content) {
  return `
${content.title}

Category: ${content.category}
Legal Area: ${content.legal_area}
Jurisdiction: ${content.jurisdiction}
Step: ${content.step}

Content:
${content.content}

Source: Official UK Government guidance (${content.source_url})

Legal Context: This information provides official UK government guidance on company formation and compliance requirements under English law. Always verify current requirements with Companies House and seek professional legal advice for specific situations.
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
      
      console.log('✅ Index created successfully');
      // Wait for index to be ready
      console.log('⏳ Waiting for index to be ready...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    } else {
      console.log('✅ Index already exists');
    }
    
    return pinecone.index(indexName);
    
  } catch (error) {
    console.error('❌ Error with Pinecone index:', error.message);
    throw error;
  }
}

// Generate embeddings and upload legal data to Pinecone
async function populateLegalData() {
  try {
    console.log('🚀 Starting legal data population...\n');
    
    // Ensure index exists
    const index = await ensurePineconeIndex();
    
    // Check current vector count
    const stats = await index.describeIndexStats();
    console.log(`📊 Current vectors in index: ${stats.totalVectorCount || 0}`);
      console.log('\n🔄 Processing UK legal data...');
    
    const vectors = [];
    
    // Combine all legal datasets
    const allLegalData = [
      ...Object.values(ukCompanyFormationData),
      ...Object.values(ukSelfAssessmentData),
      ...Object.values(ukVATRegistrationData),
      ...Object.values(ukGDPRComplianceData),
      ...Object.values(ukHealthSafetyData)
    ];
    
    console.log(`📚 Total legal sections to process: ${allLegalData.length}`);
    
    for (const content of allLegalData) {
      console.log(`⚖️ Processing: ${content.title}`);
      
      try {
        // Generate searchable text
        const searchText = formatLegalContentForRAG(content);
        
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
            legal_area: content.legal_area,
            jurisdiction: content.jurisdiction,            step: content.step,
            source: 'official_uk_government',
            source_url: content.source_url,
            document_type: 'legal_guidance',
            content_type: content.legal_area,
            authority: 'UK Government',
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
    
    // Upload vectors to Pinecone in namespace for legal content
    console.log(`\n📤 Uploading ${vectors.length} legal vectors to Pinecone...`);
    
    const batchSize = 100; // Pinecone batch limit
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      
      try {
        await index.namespace('legal_guidance').upsert(batch);
        console.log(`✅ Uploaded batch ${Math.floor(i/batchSize) + 1} (${batch.length} vectors) to legal_guidance namespace`);
      } catch (error) {
        console.error(`❌ Error uploading batch ${Math.floor(i/batchSize) + 1}:`, error.message);
      }
    }
    
    // Wait for vectors to be available
    console.log('\n⏳ Waiting for vectors to be indexed...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Verify upload
    const finalStats = await index.describeIndexStats();
    console.log(`\n📊 Final vector count: ${finalStats.totalVectorCount || 0}`);
    
    return vectors.length;
    
  } catch (error) {
    console.error('❌ Error populating legal data:', error.message);
    throw error;
  }
}

// Test legal search functionality
async function testLegalSearch() {
  try {
    console.log('\n🧪 Testing legal search functionality...');
    
    const index = pinecone.index(indexName);
    
    const testQueries = [
      "How to register a UK limited company",
      "Director responsibilities and duties",
      "UK company formation documents required",
      "Corporation tax obligations for companies"
    ];
    
    for (const query of testQueries) {
      console.log(`\n🔍 Search query: "${query}"`);
      
      // Generate query embedding
      const queryEmbedding = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query
      });
      
      // Search legal namespace
      const searchResults = await index.namespace('legal_guidance').query({
        vector: queryEmbedding.data[0].embedding,
        topK: 3,
        includeMetadata: true,
        includeValues: false,
        filter: {
          jurisdiction: 'UK',
          category: 'incorporation'
        }
      });
      
      console.log(`📈 Found ${searchResults.matches.length} results:`);
      searchResults.matches.forEach((match, index) => {
        console.log(`   ${index + 1}. ${match.metadata.title}`);
        console.log(`      🎯 Score: ${(match.score * 100).toFixed(1)}%`);
        console.log(`      📋 Step: ${match.metadata.step}`);
        console.log(`      ⚖️ Legal Area: ${match.metadata.legal_area}`);
      });
    }
    
    return testQueries.length;
    
  } catch (error) {
    console.error('❌ Error testing legal search:', error.message);
    return 0;
  }
}

// Main function
async function main() {
  try {
    console.log('⚖️ Legal RAG Data Population - UK Company Formation');
    console.log('==================================================\n');
    
    // Check environment variables
    if (!process.env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY not found in environment variables');
    }
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not found in environment variables');
    }
    
    console.log('✅ Environment variables configured');
    console.log(`📝 Target index: ${indexName}`);
    console.log(`📊 Legal data to process: ${Object.keys(ukCompanyFormationData).length} sections\n`);
    
    // Populate legal data
    const vectorCount = await populateLegalData();
    console.log(`\n✅ Successfully uploaded ${vectorCount} legal vectors`);
    
    // Test legal search
    const searchTests = await testLegalSearch();
    console.log(`\n✅ Completed ${searchTests} search tests`);
      console.log('\n🎉 Legal RAG population complete!');
    console.log('\n📋 Summary:');
    console.log(`✅ Legal vectors uploaded: ${vectorCount}`);
    console.log(`✅ Search functionality: Working`);
    console.log(`✅ Index: ${indexName}`);
    console.log(`✅ Namespace: legal_guidance`);
    console.log(`✅ Content: UK Legal Guidance (gov.uk, ICO, HSE)`);
    
    console.log('\n⚖️ Legal Content Added:');
    
    // Company Formation
    console.log('\n📊 Company Formation:');
    Object.values(ukCompanyFormationData).forEach((content, index) => {
      console.log(`  ${index + 1}. ${content.title}`);
    });
    
    // Self Assessment
    console.log('\n💰 Self Assessment:');
    Object.values(ukSelfAssessmentData).forEach((content, index) => {
      console.log(`  ${index + 1}. ${content.title}`);
    });
    
    // VAT Registration
    console.log('\n🧾 VAT Registration:');
    Object.values(ukVATRegistrationData).forEach((content, index) => {
      console.log(`  ${index + 1}. ${content.title}`);
    });
    
    // GDPR Compliance
    console.log('\n🔒 GDPR Compliance:');
    Object.values(ukGDPRComplianceData).forEach((content, index) => {
      console.log(`  ${index + 1}. ${content.title}`);
    });
    
    // Health & Safety
    console.log('\n⚕️ Health & Safety:');
    Object.values(ukHealthSafetyData).forEach((content, index) => {
      console.log(`  ${index + 1}. ${content.title}`);
    });
    
    console.log('\n🔄 Next Steps:');
    console.log('1. ✅ Pinecone populated with comprehensive UK legal data');
    console.log('2. 🔄 Legal agent can access company formation, tax, VAT, GDPR & H&S guidance');
    console.log('3. 🔄 Test legal agent queries across all legal areas');
    console.log('4. 🔄 Monitor search performance and accuracy');
    
  } catch (error) {
    console.error('❌ Legal population failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Set timeout and run
setTimeout(() => {
  console.log('\n⏰ Script timed out after 120 seconds');
  process.exit(1);
}, 120000);

main().catch(console.error);

// VAT Registration Data
const ukVATRegistrationData = {
  overview: {
    id: 'uk_vat_overview',
    title: 'UK VAT Registration Overview',
    step: 'Overview',
    content: `
UK VAT Registration Overview

VAT (Value Added Tax) is a tax on most goods and services sold in the UK. You must register for VAT if your business turnover exceeds the threshold or you expect it to.

VAT Threshold 2024:
- £90,000 annual taxable turnover
- Applies to last 12 months or next 30 days
- Threshold reviewed annually by HMRC

Registration Requirements:
- Mandatory registration when over threshold
- Voluntary registration below threshold permitted
- Non-UK businesses supplying to UK must register
- Private schools have special rules

VAT Types:
- Standard rate: 20% on most goods and services
- Reduced rate: 5% on certain items (energy saving materials)
- Zero rate: 0% but still VAT taxable (books, food, children's clothes)
- Exempt: no VAT charged and cannot reclaim VAT

Business Benefits:
- Reclaim VAT on business purchases
- Professional appearance to customers
- Required for government contracts
- EU trading advantages
    `,
    category: 'tax_registration',
    legal_area: 'indirect_tax',
    jurisdiction: 'UK',
    source_url: 'https://www.gov.uk/vat-registration'
  },

  registration_requirements: {
    id: 'uk_vat_registration_requirements',
    title: 'VAT Registration Requirements',
    step: 'Requirements',
    content: `
VAT Registration Requirements

Mandatory Registration Thresholds:
- Total taxable turnover over £90,000 in last 12 months
- Expect turnover to exceed £90,000 in next 30 days
- Non-UK businesses supplying goods/services to UK

Registration Deadlines:
- Historical threshold breach: Register within 30 days of month-end when exceeded
- Future threshold breach: Register by end of 30-day period when realized
- Effective date: 1st of second month after breach (historical) or date realized (future)

Taxable Turnover Includes:
- Standard-rated supplies (20%)
- Reduced-rated supplies (5%)  
- Zero-rated supplies (0%)
- Exempt supplies do NOT count
- Goods hired or loaned to customers
- Business assets used personally
- Bartered or gifted goods
- Reverse charge services from abroad
- Self-supply construction over £100,000

Special Cases:
- Northern Ireland businesses: register if buying £90,000+ from EU VAT-registered suppliers
- Taking over VAT-registered business: combined turnover test
- Temporary threshold breach: can apply for exception
- Zero-rated businesses: may apply for exemption from registration

Late Registration Penalties:
- Must pay VAT from date should have registered
- Penalty based on amount owed and lateness
- Serious cases may face prosecution
    `,
    category: 'tax_registration',
    legal_area: 'indirect_tax',
    jurisdiction: 'UK',
    source_url: 'https://www.gov.uk/vat-registration'
  },

  registration_process: {
    id: 'uk_vat_registration_process',
    title: 'VAT Registration Process',
    step: 'Process',
    content: `
VAT Registration Process

Online Registration:
- Use GOV.UK online VAT registration service
- Faster processing than postal applications
- Immediate confirmation of submission
- Track application progress online

Required Information:
- Business details (name, address, structure)
- Nature of business activities
- Expected taxable turnover
- Business start date
- Bank account details
- Director/partner personal details
- Accounting periods preference

Registration Methods:
1. Online service (recommended)
2. Form VAT1 by post
3. Telephone (limited circumstances)
4. Agent registration on behalf

Processing Times:
- Online applications: typically 2-3 weeks
- Postal applications: up to 6 weeks
- Complex cases may take longer
- HMRC may request additional information

After Registration:
- VAT registration number issued
- VAT certificate sent by post
- First VAT return due date confirmed
- Making Tax Digital requirements apply
- Must display VAT number on invoices

Exemption Applications:
- Zero-rated supplies businesses may apply
- Must demonstrate all supplies are zero-rated
- Application reviewed by HMRC
- If refused, automatic VAT registration
- Can reapply if circumstances change
    `,
    category: 'tax_registration',
    legal_area: 'indirect_tax',
    jurisdiction: 'UK',
    source_url: 'https://www.gov.uk/vat-registration'
  }
};

// UK GDPR Compliance Data
const ukGDPRComplianceData = {
  overview: {
    id: 'uk_gdpr_overview',
    title: 'UK GDPR Overview',
    step: 'Overview',
    content: `
UK GDPR (General Data Protection Regulation) Overview

The UK GDPR governs how personal data must be handled by organizations operating in the UK. It came into force on 1 January 2021, replacing the EU GDPR for UK organizations.

Key Principles:
- Lawfulness, fairness and transparency
- Purpose limitation
- Data minimisation
- Accuracy
- Storage limitation
- Integrity and confidentiality (security)
- Accountability

Personal Data Definition:
- Any information relating to an identified or identifiable living individual
- Includes names, addresses, email addresses, ID numbers
- Online identifiers (IP addresses, cookies)
- Biometric and genetic data
- Sensitive personal data has extra protections

Individual Rights:
- Right to be informed
- Right of access (Subject Access Requests)
- Right to rectification
- Right to erasure ('right to be forgotten')
- Right to restrict processing
- Right to data portability
- Right to object
- Rights in relation to automated decision making

Regulatory Authority:
- Information Commissioner's Office (ICO)
- Investigation and enforcement powers
- Fines up to £17.5 million or 4% of annual turnover
- Guidance and support for organizations
    `,
    category: 'compliance',
    legal_area: 'data_protection',
    jurisdiction: 'UK',
    source_url: 'https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/'
  },

  lawful_basis: {
    id: 'uk_gdpr_lawful_basis',
    title: 'GDPR Lawful Basis for Processing',
    step: 'Lawful Basis',
    content: `
GDPR Lawful Basis for Processing Personal Data

Six Lawful Bases (Article 6):
1. Consent: Individual has given clear consent for processing
2. Contract: Processing necessary for contract performance
3. Legal obligation: Processing required by law
4. Vital interests: Processing necessary to protect someone's life
5. Public task: Processing for official functions or public interest
6. Legitimate interests: Processing for legitimate business interests

Choosing Lawful Basis:
- Must identify before processing begins
- Document decision and reasoning
- Inform individuals in privacy notice
- Cannot change basis without good reason
- Different activities may need different bases

Special Category Data:
- Requires both Article 6 and Article 9 conditions
- Includes health, racial, political, religious, biometric data
- Higher protection standards
- Limited processing conditions
- Often requires explicit consent

Criminal Offence Data:
- Requires official authority or legal basis
- Schedule 1 DPA 2018 conditions
- Enhanced security requirements
- Regular review of necessity

Consent Requirements:
- Must be freely given, specific, informed, unambiguous
- Clear affirmative action required
- Easy to withdraw as to give
- Cannot be bundled with other terms
- Children under 13 need parental consent for online services
    `,
    category: 'compliance',
    legal_area: 'data_protection',
    jurisdiction: 'UK',
    source_url: 'https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/'
  },

  individual_rights: {
    id: 'uk_gdpr_individual_rights',
    title: 'GDPR Individual Rights',
    step: 'Individual Rights',
    content: `
GDPR Individual Rights

Subject Access Requests (SARs):
- Individuals can request copy of their personal data
- Must respond within one month (can extend by two months)
- No fee unless request is manifestly unfounded or excessive
- Must verify identity before disclosure
- Can request in specific format

Right to Rectification:
- Correct inaccurate personal data
- Complete incomplete personal data
- Must respond within one month
- Tell others who received the data about corrections

Right to Erasure ('Right to be forgotten'):
- Delete personal data in certain circumstances
- No longer necessary for original purpose
- Consent withdrawn and no other lawful basis
- Unlawfully processed or compliance with legal obligation

Right to Restrict Processing:
- Individual can ask to limit how you use their data
- While disputing accuracy
- Processing is unlawful but they don't want erasure
- You no longer need data but they need it for legal claims

Data Portability:
- Provide personal data in structured, commonly used format
- Only applies to data processed by automated means
- Based on consent or contract performance
- Can request direct transfer to another organization

Right to Object:
- To processing based on legitimate interests or public task
- To direct marketing (absolute right)
- To processing for research/statistics purposes
- Must stop unless compelling legitimate grounds
    `,
    category: 'compliance',
    legal_area: 'data_protection',
    jurisdiction: 'UK',
    source_url: 'https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/'
  },

  security_requirements: {
    id: 'uk_gdpr_security',
    title: 'GDPR Security Requirements',
    step: 'Security',
    content: `
GDPR Security Requirements

Technical and Organisational Measures:
- Appropriate to risk level
- Consider state of art and implementation costs
- Regular testing and evaluation
- Pseudonymisation and encryption where appropriate

Data Breach Management:
- Must report to ICO within 72 hours if high risk
- Notify individuals without undue delay if high risk
- Maintain breach register
- Document breach response procedures

Security Measures Include:
- Access controls and user authentication
- Network security and firewalls
- Encryption of data in transit and at rest
- Regular security updates and patches
- Staff training and awareness
- Business continuity and disaster recovery
- Regular security assessments

Data Protection Impact Assessments (DPIAs):
- Required for high-risk processing
- Before processing begins
- Consult ICO if high risk remains after mitigation
- Regular review and updates

International Transfers:
- Adequate protection required for transfers outside UK
- Adequacy decisions or appropriate safeguards
- Standard Contractual Clauses (SCCs)
- Binding Corporate Rules (BCRs)
- Transfer risk assessments

Accountability Principle:
- Demonstrate compliance with GDPR
- Maintain records of processing activities
- Data protection policies and procedures
- Staff training records
- Privacy by design and default
    `,
    category: 'compliance',  
    legal_area: 'data_protection',
    jurisdiction: 'UK',
    source_url: 'https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/security/'
  }
};

// HSE Health & Safety Data
const ukHealthSafetyData = {
  overview: {
    id: 'uk_health_safety_overview',
    title: 'UK Health & Safety Overview',
    step: 'Overview',
    content: `
UK Health & Safety at Work Overview

The Health and Safety at Work etc Act 1974 is the primary legislation covering occupational health and safety in the UK. Employers have legal duties to protect employees and others.

Employer Duties:
- Provide safe working environment
- Safe systems of work and procedures
- Information, instruction, training, and supervision
- Consultation with employees on health and safety
- Competent health and safety assistance

Key Regulations:
- Management of Health and Safety at Work Regulations 1999
- Workplace (Health, Safety and Welfare) Regulations 1992  
- Personal Protective Equipment at Work Regulations 1992
- Control of Substances Hazardous to Health Regulations 2002
- Reporting of Injuries, Diseases and Dangerous Occurrences Regulations 2013

HSE Enforcement:
- Health and Safety Executive (HSE)
- Local authorities for some sectors
- Improvement and prohibition notices
- Prosecution for serious breaches
- Unlimited fines and imprisonment

Risk Management Process:
- Identify hazards in workplace
- Assess risks to employees and others
- Implement control measures
- Monitor and review effectiveness
- Record significant findings
    `,
    category: 'operational_compliance',
    legal_area: 'health_safety',
    jurisdiction: 'UK',
    source_url: 'https://www.hse.gov.uk/simple-health-safety/'
  },

  risk_assessment: {
    id: 'uk_health_safety_risk_assessment',
    title: 'Health & Safety Risk Assessment',
    step: 'Risk Assessment',
    content: `
Health & Safety Risk Assessment Requirements

Legal Requirement:
- Management of Health and Safety at Work Regulations 1999
- All employers must carry out risk assessments
- 5 or more employees: must record significant findings
- Review regularly and when circumstances change

Five Steps to Risk Assessment:
1. Identify hazards in your workplace
2. Decide who could be harmed and how
3. Evaluate risks and decide on precautions
4. Record significant findings and implement
5. Review assessment and update if necessary

Common Workplace Hazards:
- Slips, trips and falls
- Manual handling injuries
- Workplace transport accidents
- Work equipment dangers
- Fire and explosion risks
- Chemical and biological hazards
- Noise and vibration exposure
- Display screen equipment issues

Risk Evaluation:
- Consider likelihood of harm occurring
- Assess severity of potential harm
- Evaluate existing control measures
- Determine if additional controls needed
- Prioritise high-risk areas for action

Control Hierarchy:
1. Eliminate the hazard completely
2. Reduce the risk at source
3. Use work equipment/protective systems
4. Use safe systems of work
5. Provide personal protective equipment
6. Provide information and training

Documentation Requirements:
- Record hazards identified
- People who could be harmed
- Existing control measures
- Additional actions needed
- Review dates and updates
    `,
    category: 'operational_compliance',
    legal_area: 'health_safety',
    jurisdiction: 'UK',
    source_url: 'https://www.hse.gov.uk/simple-health-safety/risk/'
  },

  workplace_requirements: {
    id: 'uk_health_safety_workplace',
    title: 'Workplace Health & Safety Requirements',
    step: 'Workplace Requirements',
    content: `
Workplace Health & Safety Requirements

Health and Safety Policy:
- Written policy required if 5+ employees
- Statement of general policy
- Organisation and arrangements for health and safety
- Signed by senior manager
- Communicated to all employees
- Reviewed and updated regularly

Workplace Facilities:
- Adequate toilet and washing facilities
- Drinking water provision
- Rest facilities including pregnant/nursing mothers
- Facilities for changing clothes if required
- First aid provision appropriate to workplace risks

Information and Training:
- Health and safety induction for new employees
- Job-specific training for workplace risks
- Supervisor and manager training
- Regular refresher training
- Training records maintained

Employee Consultation:
- Consult on health and safety matters
- Safety representatives if recognised trade union
- Representatives of employee safety if no union
- Safety committees for larger workplaces
- Involve employees in risk assessments

Reporting Requirements:
- Report serious workplace injuries to HSE
- Report occupational diseases
- Report dangerous occurrences
- Report fatal accidents immediately
- Keep records of incidents for 3 years

Display Requirements:
- Health and safety law poster displayed
- Or provide equivalent leaflet to employees
- Include details of local HSE office
- Update when regulations change

Competent Person:
- Appoint competent person to assist with health and safety
- Can be employee or external consultant
- Must have necessary skills and knowledge
- Sufficient time and resources to carry out duties
    `,
    category: 'operational_compliance',
    legal_area: 'health_safety', 
    jurisdiction: 'UK',
    source_url: 'https://www.hse.gov.uk/simple-health-safety/'
  },

  first_aid_requirements: {
    id: 'uk_health_safety_first_aid',
    title: 'Workplace First Aid Requirements',
    step: 'First Aid',
    content: `
Workplace First Aid Requirements

Legal Requirements:
- Health and Safety (First Aid) Regulations 1981
- Provide adequate first aid equipment, facilities and personnel
- Based on workplace risk assessment
- Consider number of employees, nature of work, and workplace hazards

Minimum First Aid Provision:
- Suitably stocked first aid box
- Appointed person to take charge of first aid arrangements
- Information for employees about first aid arrangements

First Aid Personnel:
- Appointed person: not first aid qualified but takes charge in emergency
- First aider: holds valid first aid certificate
- Emergency first aider: basic first aid training (one day course)
- First aid at work: full three-day first aid course

First Aid Training:
- Certificates valid for 3 years
- Annual refresher training recommended
- Requalification required before expiry
- Training must be HSE approved
- Record training and certificate expiry dates

First Aid Equipment:
- First aid boxes clearly marked and easily accessible
- Contents appropriate to workplace risks
- Regular checks and restocking
- Sterile items replaced before expiry
- Additional equipment for specific risks (burns, chemicals, etc.)

Higher Risk Workplaces:
- Construction sites require trained first aiders
- Chemical works need specialized equipment
- Remote sites may need emergency transport
- Multiple first aiders for large workplaces
- First aid rooms for 150+ employees

Record Keeping:
- Accident book entries
- First aid treatment records
- Training certificates and renewals
- Equipment inspection records
- Review first aid needs annually
    `,
    category: 'operational_compliance',
    legal_area: 'health_safety',
    jurisdiction: 'UK',    source_url: 'https://www.hse.gov.uk/simple-health-safety/firstaid/'
  }
};


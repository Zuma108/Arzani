Product Requirement Document (PRD)
Title: Seller Questionnaire Onboarding Page
Product: Azani – Marketplace for Buying & Selling Businesses
Version: 1.1
Date: April 1, 2025
Owner: [Your Name or Product Lead]

1. Objective
Design and implement a dynamic onboarding form for sellers who want to list their businesses on Azani. The goal is to capture detailed business information in a user-friendly, conversational flow that feels luxurious and intelligent. The form will leverage existing internal valuation tools and integrate seamlessly with the rest of the platform’s Node.js-based backend.

2. Goals & KPIs
Goal	KPI
Collect high-quality seller data	85% form completion rate
Pre-qualify listings using AI valuation	70% usage of valuation service
Improve buyer-to-seller matches	30% increase in listing-to-contact conversion
Streamline onboarding UX	Reduce drop-off rate below 10%
3. Key Features
3.1 Role-Specific Seller Form
Users identify as Sellers during onboarding

Form dynamically adapts based on answers

Sectioned into digestible parts with autosave capabilities

3.2 Seller-Specific Data Collection
Section	Sample Questions
Basic Details	Business Name, Industry, Operating Status
Financial Overview	Revenue, Profit Margins, Growth Trends
Valuation	Asking Price, Existing Valuation, Auto-Valuation (see 3.3)
Ownership & Team	Number of Employees, Will they remain?
Assets & Location	Office/Store/Remote, Equipment included?
Exit Intentions	Reason for selling, Urgency
Broker Engagement	Using a broker? Want a verified Azani broker?
Contact Info	Name, Email, Phone (optional)
Uploads (Optional)	P&L, Balance Sheets, Pitch Decks (PDF, DOCX)
3.3 Auto-Valuation via Existing Service
Use current valuation service at /valuationservice.js

When users provide key financial data, dynamically trigger valuation call

Output instant estimated valuation range based on:

Revenue

Profit margins

Industry

Location

Result shown as:

“Based on your details, your business could be worth approximately £225,000 – £275,000.”

Users can edit responses and re-calculate

3.4 Progress Tracker
Custom progress bar built in Vanilla JS

Visually tracks completion with % indicator

Autosaves each section for seamless UX

3.5 CTA Section
At end of form:

“List My Business Now”

“Talk to a Verified Broker”

“Download Summary as PDF”

“Save & Resume Later”

4. Technical Requirements
4.1 Frontend
Stack:

HTML5

Tailwind CSS

Vanilla JavaScript (no React or SPA frameworks)

Features:

Modular form logic with branching

JS-driven valuation calculator

File upload via HTML input

Email input validation

Mobile-first responsive UI

Styling & UX:

Inspired by Figma designs (Figma link to be included)

Smooth transitions and micro-interactions

Clear typography with luxury tone

4.2 Backend
Runtime: Node.js

Valuation Service:

Path: /valuationservice.js

Accepts JSON object with business details

Returns valuation range

Database: PostgreSQL

Tables Required:

sql
Copy
Edit
Table: sellers  
Columns: id, user_id, business_name, industry, revenue, profit_margin, asking_price, valuation_estimate_low, valuation_estimate_high, broker_involved, created_at
4.3 APIs
Endpoint	Method	Description
/api/seller/start	POST	Begin new seller questionnaire
/api/seller/answer	POST	Save individual response
/api/seller/valuation	POST	Calls /valuationservice.js and returns estimate
/api/seller/complete	POST	Submit and finalize form
Files Needed
1. views/sellerQuestionnaire.ejs
The HTML form UI using Tailwind and Vanilla JS

Includes progress bar, conditional sections, and valuation trigger

2. public/js/sellerQuestionnaire.js
Controls form flow, saving, valuation API integration

Handles dynamic logic for branching form flow

3. routes/sellerQuestionnaire.js
Express route to serve the form page and handle API calls (GET, POST)

4. controllers/sellerController.js
Logic for saving seller responses

Connects to /valuationservice.js to get estimates

Final submission logic

5. valuationservice.js (already exists)
Confirmed: Used to calculate and return valuation range

No changes required here unless you want to tweak calculation logic

🧩 Database Migration Needed
Add a new table to store seller questionnaire responses in schema.sql or via Sequelize/Knex if used.

🆕 SQL Migration Example:
sql
Copy
Edit
CREATE TABLE seller_questionnaires (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    business_name VARCHAR(255),
    industry VARCHAR(100),
    operating_status BOOLEAN,
    revenue NUMERIC,
    profit_margin NUMERIC,
    asking_price NUMERIC,
    valuation_estimate_low NUMERIC,
    valuation_estimate_high NUMERIC,
    employees_count INTEGER,
    assets_description TEXT,
    location_type VARCHAR(50), -- e.g. Remote, Physical
    reason_for_selling TEXT,
    broker_involved BOOLEAN,
    uploaded_documents TEXT[], -- array of file paths or URLs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
✅ This schema ensures integration with your existing user table and supports your valuation logic.

✅ Optional Supporting Files (If Not Present)
middleware/validateForm.js – Ensures valid entries before saving

helpers/valuationHelper.js – Optional wrapper around /valuationservice.js

uploads/ – Folder for storing document uploads, if not using cloud (e.g., AWS S3)


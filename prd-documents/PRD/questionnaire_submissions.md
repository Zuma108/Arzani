Table: questionnaire_submissions
This table is designed to collect detailed business data from users. Here's a summary of the fields:

Column Name	Description
id	Unique identifier (integer, primary key)
email	User email address
business_name	Name of the business
industry	Industry sector
description	Text description of the business
year_established	Year the business was founded
years_in_operation	Number of years running
contact_name	Name of the contact person
contact_phone	Phone number
revenue, revenue_prev_year, revenue_2_years_ago	Revenue over three years
ebitda, ebitda_prev_year, ebitda_2_years_ago	Earnings over three years
cash_on_cash	Cash-on-cash return metric
ffe_value	Value of furniture, fixtures & equipment
ffe_items	List of items
growth_rate	Numeric growth rate
growth_areas	Text description of growth areas
growth_challenges	Challenges faced in growth
scalability	Qualitative scalability input (e.g. "high")
total_debt_amount	Total business debt
debt_transferable	Whether debt can be transferred
debt_notes	Extra notes about debt
debt_items	Debt details (stored as JSON)
valuation_data	Valuation-related info (JSON)
created_at	Timestamp of submission
converted_to_business	Whether it was converted to a listing
business_id	Link to a business entity if converted
user_id	Associated user
anonymous_id	Anonymous session ID (if not logged in)
📥 Data Entries
There is 1 data entry block related to this table.

The data is imported using a COPY statement:

sql
Copy
Edit
COPY public.questionnaire_submissions (
    id, email, business_name, industry, description, year_established, 
    years_in_operation, contact_name, contact_phone, revenue, revenue_prev_year, 
    revenue_2_years_ago, ebitda, ebitda_prev_year, ebitda_2_years_ago, 
    cash_on_cash, ffe_value, ffe_items, growth_rate, growth_areas, 
    growth_challenges, scalability, total_debt_amount, debt_transferable, 
    debt_notes, debt_items, valuation_data, created_at, 
    converted_to_business, business_id, user_id, anonymous_id
) FROM stdin;
Would you like me to extract the actual submission data next? ​
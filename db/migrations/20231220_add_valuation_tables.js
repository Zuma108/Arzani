/**
 * Migration to add valuation-related tables and columns to the database
 */
exports.up = function(pgm) {
  // Add valuation fields to businesses table
  pgm.addColumns('businesses', {
    valuation_min: { type: 'numeric', default: null },
    valuation_max: { type: 'numeric', default: null },
    valuation_confidence: { type: 'integer', default: null },
    valuation_date: { type: 'timestamp with time zone', default: null },
    valuation_multiple: { type: 'numeric', default: null },
    valuation_multiple_type: { type: 'varchar(50)', default: null },
    valuation_summary: { type: 'text', default: null }
  });

  // Create a new valuations table for detailed valuation history
  pgm.createTable('business_valuations', {
    id: 'id',
    business_id: { type: 'integer', notNull: true, references: 'businesses(id)', onDelete: 'CASCADE' },
    valuation_min: { type: 'numeric', notNull: true },
    valuation_max: { type: 'numeric', notNull: true },
    estimated_value: { type: 'numeric', notNull: true },
    confidence: { type: 'integer', notNull: true },
    multiple: { type: 'numeric', notNull: true },
    multiple_type: { type: 'varchar(50)', notNull: true },
    summary: { type: 'text' },
    factors: { type: 'jsonb' },
    market_comparables: { type: 'jsonb' },
    recommendations: { type: 'jsonb' },
    data_used: { type: 'jsonb' },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    user_id: { type: 'integer', references: 'users(id)', onDelete: 'SET NULL' }
  });

  // Create indexes for better query performance
  pgm.createIndex('business_valuations', 'business_id');
  pgm.createIndex('business_valuations', 'user_id');
  pgm.createIndex('business_valuations', 'created_at');
  
  // Create a new table for storing questionnaire data
  pgm.createTable('questionnaire_submissions', {
    id: 'id',
    email: { type: 'varchar(255)' },
    business_name: { type: 'varchar(255)' },
    industry: { type: 'varchar(100)' },
    description: { type: 'text' },
    year_established: { type: 'integer' },
    years_in_operation: { type: 'integer' },
    contact_name: { type: 'varchar(255)' },
    contact_phone: { type: 'varchar(50)' },
    revenue: { type: 'numeric' },
    revenue_prev_year: { type: 'numeric' },
    revenue_2_years_ago: { type: 'numeric' },
    ebitda: { type: 'numeric' },
    ebitda_prev_year: { type: 'numeric' },
    ebitda_2_years_ago: { type: 'numeric' },
    cash_on_cash: { type: 'numeric' },
    ffe_value: { type: 'numeric' },
    ffe_items: { type: 'text' },
    growth_rate: { type: 'numeric' },
    growth_areas: { type: 'text' },
    growth_challenges: { type: 'text' },
    scalability: { type: 'varchar(50)' },
    total_debt_amount: { type: 'numeric' },
    debt_transferable: { type: 'varchar(50)' },
    debt_notes: { type: 'text' },
    debt_items: { type: 'jsonb' },
    valuation_data: { type: 'jsonb' },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    converted_to_business: { type: 'boolean', default: false },
    business_id: { type: 'integer', references: 'businesses(id)', onDelete: 'SET NULL' },
    user_id: { type: 'integer', references: 'users(id)', onDelete: 'SET NULL' }
  });
  
  // Create indexes for questionnaire submissions
  pgm.createIndex('questionnaire_submissions', 'email');
  pgm.createIndex('questionnaire_submissions', 'created_at');
  pgm.createIndex('questionnaire_submissions', 'business_id');
  pgm.createIndex('questionnaire_submissions', 'user_id');
  pgm.createIndex('questionnaire_submissions', 'converted_to_business');
};

exports.down = function(pgm) {
  // Remove the added columns from businesses table
  pgm.dropColumns('businesses', [
    'valuation_min',
    'valuation_max', 
    'valuation_confidence',
    'valuation_date',
    'valuation_multiple',
    'valuation_multiple_type',
    'valuation_summary'
  ]);
  
  // Drop the valuations table
  pgm.dropTable('business_valuations');
  
  // Drop the questionnaire submissions table
  pgm.dropTable('questionnaire_submissions');
};

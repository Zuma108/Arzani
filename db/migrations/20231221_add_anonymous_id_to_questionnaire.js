/**
 * Migration to add anonymous_id field to questionnaire_submissions table
 */
exports.up = function(pgm) {
  // Add anonymous_id column to questionnaire_submissions
  pgm.addColumns('questionnaire_submissions', {
    anonymous_id: { type: 'text', unique: true }
  });
  
  // Create index for faster lookups
  pgm.createIndex('questionnaire_submissions', 'anonymous_id');
};

exports.down = function(pgm) {
  // Drop the index
  pgm.dropIndex('questionnaire_submissions', 'anonymous_id');
  
  // Remove the column
  pgm.dropColumns('questionnaire_submissions', ['anonymous_id']);
};

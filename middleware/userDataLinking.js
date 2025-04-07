import { linkQuestionnaireData } from '../controllers/valuationController.js';

/**
 * Middleware to link anonymous questionnaire data to a user account
 * This should be called after a successful login or signup
 */
export const linkUserData = async (req, res, next) => {
  // Skip if no user or no email in the session
  if (!req.user?.userId || !req.user?.email) {
    return next();
  }
  
  try {
    // Check if there's a questionnaire submission ID in localStorage
    const submissionId = req.body.questionnaireSubmissionId || 
                         req.session?.questionnaireSubmissionId || 
                         req.cookies?.questionnaireSubmissionId;
    
    if (submissionId) {
      console.log(`Attempting to link questionnaire with submission ID: ${submissionId}`);
      
      // Link the specific submission by ID
      const linkResult = await linkQuestionnaireSubmissionById(req.user.userId, submissionId);
      if (linkResult) {
        console.log(`Successfully linked submission ${submissionId} to user ${req.user.userId}`);
        // Clear the submission ID from session
        if (req.session) {
          delete req.session.questionnaireSubmissionId;
          await new Promise(resolve => req.session.save(resolve));
        }
        // Clear the cookie if it exists
        res.clearCookie('questionnaireSubmissionId');
      }
    } else {
      // If no specific submission ID, try linking by email
      await linkQuestionnaireData(req.user.userId, req.user.email);
    }
  } catch (error) {
    console.error('Error linking user data:', error);
    // Don't block the user flow, just log the error
  }
  
  next();
};

/**
 * Link a specific questionnaire submission to a user
 */
async function linkQuestionnaireSubmissionById(userId, submissionId) {
  try {
    const query = `
      UPDATE questionnaire_submissions
      SET user_id = $1, is_linked = TRUE, updated_at = NOW(), status = 'linked'
      WHERE submission_id = $2 AND (user_id IS NULL OR is_linked = FALSE)
      RETURNING id
    `;
    
    const result = await pool.query(query, [userId, submissionId]);
    return result.rows.length > 0 ? result.rows[0].id : null;
  } catch (error) {
    console.error('Error linking questionnaire submission by ID:', error);
    return null;
  }
}

export default linkUserData;

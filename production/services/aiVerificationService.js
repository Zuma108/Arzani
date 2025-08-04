/**
 * AI-assisted Professional Verification Service
 * Integrates with OpenAI to provide automated verification of professional credentials
 */

import { callOpenAI } from '../utils/openai-helper.js';
import pool from '../db.js';

/**
 * Analyzes professional verification documents using AI
 * @param {number} requestId - The verification request ID
 * @param {Array} documents - Array of document objects with URLs and descriptions
 * @param {string} professionalType - Type of professional (broker, solicitor, etc.)
 * @returns {Object} AI analysis results including confidence score and recommendation
 */
export const analyzeVerificationWithAI = async (requestId, documents, professionalType) => {
  try {
    // Prepare document information for AI analysis
    const documentDescriptions = documents.map(doc => {
      return `Document: ${doc.description || 'Unnamed document'}\nURL: ${doc.url}`;
    }).join('\n\n');

    // Create prompt for OpenAI
    const prompt = `
      You are an expert in verifying professional credentials for ${professionalType}s in the business marketplace.
      
      Please analyze the following verification documents and provide:
      1. An assessment of the document authenticity (confidence score 0-100%)
      2. Verification of professional qualifications
      3. Any red flags or issues identified
      4. A final recommendation (Approve, Reject, or Request More Information)
      
      Document Information:
      ${documentDescriptions}
      
      Format your response as JSON with the following structure:
      {
        "confidenceScore": number,
        "qualificationsVerified": boolean,
        "issues": [string],
        "recommendation": "Approve" | "Reject" | "Request More Information",
        "reasoning": string
      }
    `;

    // Call OpenAI API
    const aiResponse = await callOpenAI(prompt);
    
    // Parse the response
    let analysisResult;
    try {
      // Try to extract JSON from the response if it's not already in JSON format
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse JSON from AI response");
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      // Provide a fallback response
      analysisResult = {
        confidenceScore: 0,
        qualificationsVerified: false,
        issues: ["AI could not properly analyze the documents"],
        recommendation: "Request More Information",
        reasoning: "The system could not automatically verify these documents. Manual review required."
      };
    }

    // Store AI analysis in database
    await storeAIAnalysisResult(requestId, analysisResult);
    
    return analysisResult;
  } catch (error) {
    console.error('Error in AI document analysis:', error);
    throw error;
  }
};

/**
 * Stores AI analysis results in the database
 * @param {number} requestId - The verification request ID
 * @param {Object} analysis - The AI analysis results
 */
async function storeAIAnalysisResult(requestId, analysis) {
  try {
    const query = `
      UPDATE professional_verification_requests
      SET 
        ai_analysis = $1,
        ai_analysis_date = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    
    await pool.query(query, [
      JSON.stringify(analysis),
      requestId
    ]);
    
    console.log(`AI analysis stored for verification request ${requestId}`);
  } catch (error) {
    console.error('Error storing AI analysis:', error);
    // We don't want to throw here, as it would disrupt the primary functionality
    // Just log the error and continue
  }
}

/**
 * Gets AI verification recommendation for a specific request
 * @param {number} requestId - The verification request ID
 * @returns {Object|null} The AI analysis or null if not found
 */
export const getAIVerificationRecommendation = async (requestId) => {
  try {
    const query = `
      SELECT ai_analysis, ai_analysis_date
      FROM professional_verification_requests
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [requestId]);
    
    if (result.rows.length === 0 || !result.rows[0].ai_analysis) {
      return null;
    }
    
    return {
      analysis: result.rows[0].ai_analysis,
      date: result.rows[0].ai_analysis_date
    };
  } catch (error) {
    console.error('Error retrieving AI analysis:', error);
    return null;
  }
};
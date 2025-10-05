/**
 * Onboarding Routes - Modern Business Marketplace 2025
 * Handles user onboarding flow with comprehensive validation and data persistence
 */

import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';
import fetch from 'node-fetch';

const router = express.Router();

// Rate limiting for onboarding completion
const onboardingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Maximum 5 attempts per window
  message: { 
    error: 'Too many onboarding attempts. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation schemas
const validationSchemas = {
  businessType: {
    allowedValues: ['seller', 'buyer', 'investor', 'advisor'],
    required: true
  },
  businessName: {
    minLength: 2,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9\s\-&.,']+$/,
    required: false // Made optional since onboarding saves progress incrementally
  },
  businessEmail: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    required: false // Made optional since onboarding saves progress incrementally
  },
  businessPhone: {
    pattern: /^[\+]?[1-9][\d]{0,15}$/,
    required: false // Made optional since onboarding saves progress incrementally
  },
  businessAddress: {
    minLength: 10,
    maxLength: 200,
    required: false // Made optional since onboarding saves progress incrementally
  },
  industry: {
    allowedValues: [
      'marketing_and_advertising',
      'technology_and_services', 
      'computer_software',
      'real_estate',
      'financial_services',
      'health_wellness_and_fitness',
      'education',
      'consulting',
      'retail',
      'technology', 'healthcare', 'finance', 'manufacturing',
      'hospitality', 'automotive', 'agriculture',
      'marketing', 'legal', 'construction', 'other'
    ],
    required: true
  },
  employees: {
    allowedValues: ['1-10', '11-50', '51-200', '201-500', '500+'],
    required: false // Made optional for progressive saving
  },
  companySize: {
    allowedValues: ['1-10', '11-50', '51-200', '201-500', '500+'],
    required: false // Alternative field name used in frontend
  }
};

// reCAPTCHA verification
async function verifyRecaptcha(token) {
  if (!token) {
    return { success: false, error: 'No reCAPTCHA token provided' };
  }

  const secretKey = process.env.RECAPTCHA_SECRET_KEY; // Add this to your .env file
  if (!secretKey) {
    console.error('RECAPTCHA_SECRET_KEY not configured');
    return { success: false, error: 'reCAPTCHA not properly configured' };
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    });

    const data = await response.json();
    
    if (data.success) {
      // Check score for v3 (optional, typically > 0.5 is considered human)
      if (data.score && data.score < 0.5) {
        return { 
          success: false, 
          error: 'reCAPTCHA verification failed - suspicious activity detected',
          score: data.score 
        };
      }
      return { success: true, score: data.score };
    } else {
      return { 
        success: false, 
        error: 'reCAPTCHA verification failed',
        errors: data['error-codes'] 
      };
    }
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return { success: false, error: 'reCAPTCHA verification service unavailable' };
  }
}

// Utility functions
function validateField(fieldName, value, schema = null) {
  const rules = schema || validationSchemas[fieldName];
  if (!rules) return { valid: true };

  // Required validation
  if (rules.required && (!value || value.trim() === '')) {
    return { valid: false, message: `${fieldName} is required` };
  }

  // Skip other validations if field is empty and not required
  if (!value && !rules.required) return { valid: true };

  const trimmedValue = typeof value === 'string' ? value.trim() : value;

  // Length validation
  if (rules.minLength && trimmedValue.length < rules.minLength) {
    return { valid: false, message: `${fieldName} must be at least ${rules.minLength} characters` };
  }

  if (rules.maxLength && trimmedValue.length > rules.maxLength) {
    return { valid: false, message: `${fieldName} must not exceed ${rules.maxLength} characters` };
  }

  // Pattern validation
  if (rules.pattern && !rules.pattern.test(trimmedValue)) {
    return { valid: false, message: `${fieldName} format is invalid` };
  }

  // Allowed values validation
  if (rules.allowedValues && !rules.allowedValues.includes(trimmedValue)) {
    return { valid: false, message: `${fieldName} contains an invalid value` };
  }

  return { valid: true };
}

function sanitizeFormData(data) {
  const sanitized = {};
  
  // Basic string fields
  const stringFields = ['businessType', 'businessName', 'businessEmail', 'businessPhone', 'businessAddress', 'industry', 'employees'];
  
  stringFields.forEach(field => {
    if (data[field]) {
      sanitized[field] = typeof data[field] === 'string' ? data[field].trim() : data[field];
    }
  });

  // Parse preferences
  if (data.preferences) {
    try {
      sanitized.preferences = typeof data.preferences === 'string' 
        ? JSON.parse(data.preferences) 
        : data.preferences;
    } catch (e) {
      sanitized.preferences = {};
    }
  }

  return sanitized;
}

function validateOnboardingData(data, isCompletion = false) {
  const errors = {};
  const warnings = [];

  // For completion validation, check required fields more strictly
  const requiredForCompletion = ['businessType', 'industry'];
  
  if (isCompletion) {
    // Strict validation for completion
    requiredForCompletion.forEach(fieldName => {
      if (!data[fieldName] || data[fieldName].trim() === '') {
        errors[fieldName] = `${fieldName} is required to complete onboarding`;
      }
    });
  }

  // Validate all fields that have values (including optional ones)
  Object.entries(validationSchemas).forEach(([fieldName, rules]) => {
    if (data[fieldName] !== undefined && data[fieldName] !== null && data[fieldName] !== '') {
      const validation = validateField(fieldName, data[fieldName], rules);
      if (!validation.valid) {
        errors[fieldName] = validation.message;
      }
    }
  });

  // Validate preferences
  if (data.preferences) {
    const preferences = data.preferences;
    let hasAnyPreference = false;

    Object.values(preferences).forEach(prefs => {
      if (Array.isArray(prefs) && prefs.length > 0) {
        hasAnyPreference = true;
      }
    });

    if (!hasAnyPreference) {
      warnings.push('No preferences selected. You can update these later in your profile.');
    }
  }

  // Business email domain validation
  if (data.businessEmail && !errors.businessEmail) {
    const domain = data.businessEmail.split('@')[1];
    const suspiciousDomains = ['tempmail.com', '10minutemail.com', 'guerrillamail.com'];
    
    if (suspiciousDomains.some(suspicious => domain.includes(suspicious))) {
      warnings.push('Please use a permanent business email address for better account security.');
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    warnings
  };
}

// Routes

/**
 * GET /onboarding
 * Render onboarding page
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    // Check if user has already completed onboarding
    const userQuery = 'SELECT onboarding_completed, user_type, business_name FROM users WHERE id = $1';
    const userResult = await pool.query(userQuery, [req.user.id]);
    
    if (userResult.rows.length === 0) {
      return res.redirect('/auth/login?error=user_not_found');
    }

    const user = userResult.rows[0];
    
    // If already completed, redirect to marketplace
    if (user.onboarding_completed) {
      console.log(`User ${req.user.id} redirected to marketplace2 - onboarding already completed`);
      return res.redirect('/marketplace2?onboarded=true');
    }

    console.log(`User ${req.user.id} loading onboarding page - not completed`);
    
    // Render onboarding page
    res.render('onboarding', {
      title: 'Complete Your Setup - Business Marketplace',
      user: req.user,
      csrfToken: req.csrfToken?.() || null
    });

  } catch (error) {
    console.error('Onboarding page error:', error);
    res.status(500).render('error', { 
      title: 'Setup Error',
      message: 'Unable to load setup page. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

/**
 * POST /onboarding/save-progress
 * Save onboarding progress (AJAX endpoint)
 */
router.post('/save-progress', requireAuth, async (req, res) => {
  try {
    const sanitizedData = sanitizeFormData(req.body);
    console.log(`Saving progress for user ${req.user.id}, step ${req.body.currentStep}:`, sanitizedData);
    
    // Store in onboarding_progress table for recovery
    const progressQuery = `
      INSERT INTO onboarding_progress (user_id, form_data, step, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        form_data = $2,
        step = $3,
        updated_at = NOW()
    `;
    
    await pool.query(progressQuery, [
      req.user.id,
      JSON.stringify(sanitizedData),
      parseInt(req.body.currentStep) || 1
    ]);

    console.log(`Progress saved successfully for user ${req.user.id}`);
    res.json({ success: true, message: 'Progress saved' });

  } catch (error) {
    console.error('Save progress error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save progress',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /onboarding/progress
 * Retrieve saved onboarding progress
 */
router.get('/progress', requireAuth, async (req, res) => {
  try {
    const progressQuery = 'SELECT form_data, step, updated_at FROM onboarding_progress WHERE user_id = $1';
    const result = await pool.query(progressQuery, [req.user.id]);
    
    if (result.rows.length === 0) {
      return res.json({ success: true, data: null });
    }

    const progress = result.rows[0];
    
    // Check if progress is not too old (7 days)
    const daysSinceUpdate = (Date.now() - new Date(progress.updated_at).getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceUpdate > 7) {
      // Clean up old progress
      await pool.query('DELETE FROM onboarding_progress WHERE user_id = $1', [req.user.id]);
      return res.json({ success: true, data: null });
    }

    res.json({
      success: true,
      data: {
        formData: progress.form_data,
        step: progress.step,
        updatedAt: progress.updated_at
      }
    });

  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve progress'
    });
  }
});

/**
 * POST /onboarding/complete
 * Complete onboarding process
 */
router.post('/complete', requireAuth, onboardingLimiter, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Verify reCAPTCHA first (with fallback support)
    if (req.body.recaptchaToken) {
      // Check if it's a manual verification token
      if (req.body.recaptchaToken.startsWith('manual_verification_')) {
        console.log(`Manual verification used for user ${req.user.id}`);
        // Allow manual verification as fallback
      } else {
        // Attempt proper reCAPTCHA verification
        const recaptchaResult = await verifyRecaptcha(req.body.recaptchaToken);
        if (!recaptchaResult.success) {
          console.warn(`reCAPTCHA verification failed for user ${req.user.id}, allowing fallback:`, recaptchaResult.error);
          // Don't block the user if reCAPTCHA fails - log and continue
        } else {
          console.log(`reCAPTCHA verified for user ${req.user.id}, score: ${recaptchaResult.score}`);
        }
      }
    } else {
      console.log(`No reCAPTCHA token provided for user ${req.user.id}, continuing without verification`);
    }

    const sanitizedData = sanitizeFormData(req.body);
    const validation = validateOnboardingData(sanitizedData, true); // Use strict validation for completion

    if (!validation.valid) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Please complete all required fields to finish onboarding',
        details: validation.errors,
        warnings: validation.warnings
      });
    }

    // Check if user exists and hasn't completed onboarding
    const userQuery = 'SELECT id, onboarding_completed FROM users WHERE id = $1';
    const userResult = await client.query(userQuery, [req.user.id]);
    
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (userResult.rows[0].onboarding_completed) {
      await client.query('ROLLBACK');
      return res.status(409).json({ 
        success: false, 
        error: 'Onboarding already completed',
        redirectUrl: '/marketplace2'
      });
    }

    // Update user profile
    const updateUserQuery = `
      UPDATE users SET 
        user_type = $1,
        business_name = $2,
        business_email = $3,
        business_phone = $4,
        business_address = $5,
        industry = $6,
        company_size = $7,
        onboarding_completed = true,
        profile_updated_at = NOW()
      WHERE id = $8
      RETURNING id, user_type, business_name
    `;

    const updateResult = await client.query(updateUserQuery, [
      sanitizedData.businessType,
      sanitizedData.businessName,
      sanitizedData.businessEmail,
      sanitizedData.businessPhone,
      sanitizedData.businessAddress,
      sanitizedData.industry,
      sanitizedData.employees,
      req.user.id
    ]);

    // Store user preferences
    if (sanitizedData.preferences && Object.keys(sanitizedData.preferences).length > 0) {
      const preferencesQuery = `
        INSERT INTO user_preferences (user_id, preferences, created_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET 
          preferences = $2,
          updated_at = NOW()
      `;
      
      await client.query(preferencesQuery, [
        req.user.id,
        JSON.stringify(sanitizedData.preferences)
      ]);
    }

    // Clean up onboarding progress
    await client.query('DELETE FROM onboarding_progress WHERE user_id = $1', [req.user.id]);

    // Log completion
    const logQuery = `
      INSERT INTO user_activity_logs (user_id, activity_type, activity_data, created_at)
      VALUES ($1, 'onboarding_completed', $2, NOW())
    `;
    
    await client.query(logQuery, [
      req.user.id,
      JSON.stringify({ 
        businessType: sanitizedData.businessType,
        industry: sanitizedData.industry,
        completedAt: new Date().toISOString()
      })
    ]);

    await client.query('COMMIT');

    // Determine redirect URL based on user type
    let redirectUrl = '/marketplace2';
    
    switch (sanitizedData.businessType) {
      case 'seller':
        redirectUrl = '/marketplace2?view=sell';
        break;
      case 'buyer':
        redirectUrl = '/marketplace2?view=buy';
        break;
      case 'investor':
        redirectUrl = '/marketplace2?view=invest';
        break;
      case 'advisor':
        redirectUrl = '/marketplace2?view=advise';
        break;
      default:
        redirectUrl = '/marketplace2';
    }

    res.json({
      success: true,
      message: 'Onboarding completed successfully!',
      redirectUrl,
      user: {
        id: req.user.id,
        businessName: sanitizedData.businessName,
        userType: sanitizedData.businessType
      },
      warnings: validation.warnings
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Onboarding completion error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to complete onboarding. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
});

/**
 * GET /onboarding/skip
 * Skip onboarding (sets minimal defaults)
 */
router.get('/skip', requireAuth, async (req, res) => {
  try {
    // Set minimal defaults and mark as completed
    const updateQuery = `
      UPDATE users SET 
        user_type = 'buyer',
        onboarding_completed = true,
        profile_updated_at = NOW()
      WHERE id = $1 AND onboarding_completed = false
      RETURNING id
    `;

    const result = await pool.query(updateQuery, [req.user.id]);

    if (result.rows.length === 0) {
      return res.redirect('/marketplace2');
    }

    // Log the skip
    await pool.query(
      'INSERT INTO user_activity_logs (user_id, activity_type, activity_data, created_at) VALUES ($1, $2, $3, NOW())',
      [req.user.id, 'onboarding_skipped', JSON.stringify({ skippedAt: new Date().toISOString() })]
    );

    res.redirect('/marketplace2?onboarded=skipped');

  } catch (error) {
    console.error('Onboarding skip error:', error);
    res.redirect('/marketplace2');
  }
});

export default router;
/**
 * Input validation middleware
 * Provides consistent validation and sanitization across the application
 */

import { body, param, query, validationResult } from 'express-validator';
import xss from 'xss';

/**
 * Validate and sanitize user registration data
 */
export const validateUserRegistration = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores and hyphens')
    .escape(),
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 8, max: 100 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  // General validation middleware
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    next();
  }
];

/**
 * Validate and sanitize business submission data
 */
export const validateBusinessSubmission = [
  body('business_name', 'Business name is required')
    .trim()
    .notEmpty()
    .isLength({ max: 200 })
    .withMessage('Business name cannot exceed 200 characters')
    .escape(),
  
  body('description')
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description cannot exceed 5000 characters')
    .customSanitizer(value => xss(value)),
  
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number')
    .toFloat(),
  
  body('industry')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Industry cannot exceed 100 characters')
    .escape(),
  
  body('location')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Location cannot exceed 200 characters')
    .escape(),
  
  body(['cash_flow', 'gross_revenue', 'ebitda', 'inventory', 'ffe'])
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Financial values must be positive numbers')
    .toFloat(),
  
  body(['employees', 'years_in_operation'])
    .optional()
    .isInt({ min: 0 })
    .withMessage('Must be a positive integer')
    .toInt(),
    
  // General validation middleware
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    next();
  }
];

/**
 * Validate and sanitize file uploads
 */
export const validateFileUpload = [
  body('file')
    .custom((_, { req }) => {
      if (!req.file) {
        throw new Error('File is required');
      }
      return true;
    }),
  
  (req, res, next) => {
    // Validate file type if present
    if (req.file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
      
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid file type. Allowed types: JPEG, PNG, GIF, PDF'
        });
      }
      
      // Validate file size (max 5MB)
      if (req.file.size > 5 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          error: 'File size exceeds limit (5MB)'
        });
      }
    }
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    next();
  }
];

/**
 * Sanitize query parameters
 */
export const sanitizeQueryParams = [
  query('*')
    .trim()
    .escape(),
  
  (req, res, next) => {
    next();
  }
];

/**
 * Validate and sanitize URL parameters
 */
export const validateParams = (paramName) => [
  param(paramName)
    .trim()
    .escape(),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    next();
  }
];

/**
 * Generic input sanitizer to prevent XSS attacks
 * @param {string} input - The input to sanitize
 * @returns {string} - Sanitized input
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return xss(input.trim());
}

/**
 * Apply express-validator and other validation middleware to routes
 * @param {object} app - Express app
 */
export function applyValidationMiddleware(app) {
  // Apply sanitization to all query params by default
  app.use(sanitizeQueryParams);
  
  // Add other global validation rules here
}

export default {
  validateUserRegistration,
  validateBusinessSubmission,
  validateFileUpload,
  sanitizeInput,
  sanitizeQueryParams,
  validateParams,
  applyValidationMiddleware
};
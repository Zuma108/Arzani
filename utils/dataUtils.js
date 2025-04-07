/**
 * Data Utilities
 * Provides helper functions for data validation, transformation and sanitization
 */

/**
 * Converts empty or invalid values to null for database storage
 * @param {any} value - The value to check
 * @return {any|null} The original value or null if empty/invalid
 */
export const toNullable = (value) => {
  if (value === undefined || value === '' || value === 'null' || value === 'undefined') {
    return null;
  }
  return value;
};

/**
 * Converts numeric values to numbers, or null if invalid
 * @param {any} value - The value to convert
 * @return {number|null} Parsed number or null if invalid
 */
export const toNumberOrNull = (value) => {
  if (value === undefined || value === '' || value === null || value === 'null' || value === 'undefined') {
    return null;
  }
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
};

/**
 * Formats a number as currency
 * @param {number} value - The number to format
 * @param {string} locale - The locale to use (default: 'en-GB')
 * @param {string} currency - The currency code (default: 'GBP')
 * @return {string} Formatted currency string
 */
export const formatCurrency = (value, locale = 'en-GB', currency = 'GBP') => {
  if (value === null || value === undefined || isNaN(value)) {
    return '£0';
  }
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

/**
 * Sanitizes an email address
 * @param {string} email - The email to sanitize
 * @return {string|null} Sanitized email or null if invalid
 */
export const sanitizeEmail = (email) => {
  if (!email) return null;
  
  // Basic sanitization: lowercase and trim
  email = email.toLowerCase().trim();
  
  // Simple regex check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return null;
  }
  
  return email;
};

/**
 * Validates whether an object has required fields
 * @param {Object} data - The data object to check
 * @param {Array<string>} requiredFields - List of required field names
 * @return {Array<string>} List of missing field names
 */
export const validateRequiredFields = (data, requiredFields) => {
  if (!data) return requiredFields;
  
  return requiredFields.filter(field => {
    const value = data[field];
    return value === undefined || value === null || value === '';
  });
};

export default {
  toNullable,
  toNumberOrNull,
  formatCurrency,
  sanitizeEmail,
  validateRequiredFields
};

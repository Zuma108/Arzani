/**
 * Content Processor Utility
 * Handles blog content processing tasks like generating slugs, excerpts, etc.
 */

/**
 * Generate a URL-friendly slug from a string
 * @param {string} text - The text to convert to a slug
 * @returns {string} A URL-friendly slug
 */
function generateSlug(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/&/g, '-and-') // Replace & with 'and'
    .replace(/[^\w\-]+/g, '') // Remove all non-word characters except hyphens
    .replace(/\-\-+/g, '-') // Replace multiple hyphens with a single hyphen
    .replace(/^-+/, '') // Remove hyphens from start
    .replace(/-+$/, ''); // Remove hyphens from end
}

/**
 * Generate an excerpt from HTML content
 * @param {string} html - The HTML content to generate excerpt from
 * @param {number} length - Maximum length of the excerpt
 * @returns {string} Plain text excerpt
 */
function generateExcerpt(html, length = 160) {
  if (!html) return '';
  
  // Remove HTML tags
  const text = html.replace(/<\/?[^>]+(>|$)/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Truncate to desired length
  if (text.length <= length) return text;
  
  // Find the last space before the length limit
  const truncated = text.substring(0, length);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace === -1) return truncated + '...';
  
  return truncated.substring(0, lastSpace) + '...';
}

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param {string} html - The HTML content to sanitize
 * @returns {string} Sanitized HTML
 */
function sanitizeHtml(html) {
  if (!html) return '';
  
  // This is a very basic sanitization. In a production environment,
  // you should use a proper HTML sanitization library like DOMPurify or sanitize-html
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/g, '')
    .replace(/on\w+='[^']*'/g, '')
    .replace(/on\w+=\w+/g, '');
}

/**
 * Convert Markdown to HTML
 * @param {string} markdown - The markdown content to convert
 * @returns {string} HTML content
 */
function markdownToHtml(markdown) {
  if (!markdown) return '';
  
  // This is a very basic markdown to HTML conversion
  // In a production environment, you should use a proper markdown library like marked
  return markdown
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
    .replace(/^##### (.*$)/gm, '<h5>$1</h5>')
    .replace(/^###### (.*$)/gm, '<h6>$1</h6>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
    .replace(/\n/g, '<br>');
}

/**
 * Calculate reading time for content
 * @param {string} content - The content to calculate reading time for
 * @param {number} wordsPerMinute - Reading speed in words per minute
 * @returns {number} Reading time in minutes
 */
function calculateReadingTime(content, wordsPerMinute = 200) {
  if (!content) return 1;
  
  // Remove HTML tags and count words
  const text = content.replace(/<\/?[^>]+(>|$)/g, ' ');
  const words = text.split(/\s+/).filter(Boolean).length;
  
  // Calculate reading time
  const minutes = Math.ceil(words / wordsPerMinute);
  
  // Return at least 1 minute
  return Math.max(1, minutes);
}

export default {
  generateSlug,
  generateExcerpt,
  sanitizeHtml,
  markdownToHtml,
  calculateReadingTime
};
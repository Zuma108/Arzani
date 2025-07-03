/**
 * Markdown Stripper Utility
 * 
 * Removes markdown formatting (## headers and **bold**) from text content
 * for use in A2A agent responses
 */

/**
 * Strip markdown formatting from text
 * @param {string} text - Text containing markdown
 * @returns {string} - Text with markdown formatting removed
 */
export function stripMarkdown(text) {
  if (!text || typeof text !== 'string') {
    return text;
  }

  let cleanText = text;

  // Remove ## headers - convert to plain text with uppercase
  cleanText = cleanText.replace(/^##\s+(.+)$/gm, (match, heading) => {
    return heading.toUpperCase();
  });

  // Remove ### subheaders - convert to plain text with title case
  cleanText = cleanText.replace(/^###\s+(.+)$/gm, (match, heading) => {
    return toTitleCase(heading);
  });

  // Remove **bold** formatting
  cleanText = cleanText.replace(/\*\*([^*]+)\*\*/g, '$1');

  // Remove _italic_ formatting if any
  cleanText = cleanText.replace(/_([^_]+)_/g, '$1');

  return cleanText;
}

/**
 * Convert text to title case
 * @param {string} text - Input text
 * @returns {string} - Title case text
 */
function toTitleCase(text) {
  return text.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

/**
 * Strip markdown from a text part in A2A message
 * @param {object} part - Text part object
 * @returns {object} - Text part with markdown stripped
 */
export function stripMarkdownFromTextPart(part) {
  if (part && part.type === 'text' && part.text) {
    return {
      ...part,
      text: stripMarkdown(part.text)
    };
  }
  return part;
}

/**
 * Strip markdown from all text parts in a message
 * @param {object} message - A2A message object
 * @returns {object} - Message with markdown stripped from text parts
 */
export function stripMarkdownFromMessage(message) {
  if (!message || !message.parts || !Array.isArray(message.parts)) {
    return message;
  }

  return {
    ...message,
    parts: message.parts.map(part => stripMarkdownFromTextPart(part))
  };
}

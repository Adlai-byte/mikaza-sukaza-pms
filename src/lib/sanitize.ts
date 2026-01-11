/**
 * HTML Sanitization utilities using DOMPurify
 * Provides XSS protection for user-generated content
 */
import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content allowing only safe formatting tags
 * Use for rich text content that needs basic formatting
 */
export const sanitizeHTML = (dirty: string | null | undefined): string => {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    // Force links to open safely
    ADD_ATTR: ['target', 'rel'],
    FORBID_ATTR: ['onclick', 'onerror', 'onload', 'onmouseover'],
  });
};

/**
 * Sanitize to plain text only - strips ALL HTML tags
 * Use for user-generated content that should be text-only
 */
export const sanitizeText = (dirty: string | null | undefined): string => {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
};

/**
 * Escape HTML entities without using DOMPurify
 * Faster alternative for simple text escaping
 */
export const escapeHtml = (text: string | null | undefined): string => {
  if (!text) return '';
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
};

/**
 * Check if a string contains potentially dangerous HTML
 * Returns true if the string contains script tags, event handlers, etc.
 */
export const containsDangerousHTML = (text: string | null | undefined): boolean => {
  if (!text) return false;
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick, onerror, etc.
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /data:/i,
    /vbscript:/i,
  ];
  return dangerousPatterns.some((pattern) => pattern.test(text));
};

/**
 * Strips HTML tags, entities, and rich-text markup from notifications, titles, and preview texts.
 * Ensures clean, real, human-readable text for notifications, alerts, and toasts.
 */
export const cleanNotificationText = (text) => {
  if (!text) return '';
  if (typeof text !== 'string') return String(text);
  if (!text.includes('<') && !text.includes('&')) return text.trim();

  return text
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|tr|li|h[1-6]|section|article)>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, '/')
    .replace(/\s+/g, ' ')
    .trim();
};

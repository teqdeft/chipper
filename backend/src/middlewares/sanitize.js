/**
 * Input sanitisation.
 *
 * Strips HTML from every string in the request body by default. Fields listed in
 * `richTextFields` keep a small, safe subset of tags so forum posts and news
 * bodies can still be formatted. Also removes Mongo/SQL-ish operator keys
 * ($ and .) that have no business in a JSON body.
 */
const sanitizeHtml = require('sanitize-html');

const RICH_TEXT_OPTIONS = {
  allowedTags: [
    'p', 'br', 'strong', 'em', 'u', 's', 'blockquote', 'code', 'pre',
    'ul', 'ol', 'li', 'a', 'h2', 'h3', 'h4', 'hr', 'img', 'table', 'thead',
    'tbody', 'tr', 'th', 'td',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    // Outbound link hardening: never leak the opener, never pass SEO value.
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer nofollow', target: '_blank' }),
  },
};

const PLAIN_OPTIONS = { allowedTags: [], allowedAttributes: {}, disallowedTagsMode: 'recursiveEscape' };

function clean(value, rich) {
  if (typeof value !== 'string') return value;
  return sanitizeHtml(value, rich ? RICH_TEXT_OPTIONS : PLAIN_OPTIONS).trim();
}

function walk(node, richFields, depth = 0) {
  if (depth > 8 || node === null || node === undefined) return node;

  if (Array.isArray(node)) return node.map((item) => walk(item, richFields, depth + 1));

  if (typeof node === 'object') {
    const out = {};
    for (const [key, value] of Object.entries(node)) {
      // Drop prototype-pollution and operator-injection vectors outright.
      if (key === '__proto__' || key === 'constructor' || key.startsWith('$')) continue;
      const safeKey = key.replace(/\./g, '_');
      out[safeKey] = typeof value === 'string' ? clean(value, richFields.has(key)) : walk(value, richFields, depth + 1);
    }
    return out;
  }

  return node;
}

/**
 * @param {string[]} richTextFields body keys allowed to keep formatting HTML
 */
function sanitizeBody(richTextFields = []) {
  const richFields = new Set(richTextFields);
  return (req, res, next) => {
    if (req.body && typeof req.body === 'object') req.body = walk(req.body, richFields);
    next();
  };
}

/** Default instance: the rich-text fields used by forum, comments, news and pages. */
const sanitizeRequest = sanitizeBody(['body', 'content', 'description', 'summary', 'bio', 'excerpt']);

module.exports = { sanitizeRequest, sanitizeBody, cleanHtml: (v) => clean(v, true), cleanText: (v) => clean(v, false) };

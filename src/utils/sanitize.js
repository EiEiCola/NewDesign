const sanitizeHtml = require('sanitize-html');

/**
 * Clean HTML coming from the content editor before it is stored.
 * Only formatting tags are kept; scripts, event handlers and foreign images are removed.
 */
function sanitizeBody(html) {
    if (!html) return null;
    return sanitizeHtml(html, {
        allowedTags: [
            'p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'h2', 'h3', 'h4',
            'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'hr', 'div', 'span',
            'table', 'thead', 'tbody', 'tr', 'th', 'td',
        ],
        allowedAttributes: {
            a: ['href', 'target', 'rel'],
            img: ['src', 'alt'],
            '*': ['style'],
        },
        allowedStyles: {
            '*': { 'text-align': [/^(left|right|center|justify)$/] },
        },
        allowedSchemes: ['http', 'https', 'mailto'],
        allowedSchemesByTag: { img: [] }, // images: only relative /uploads/... paths
        exclusiveFilter: (frame) => frame.tag === 'img' && !String(frame.attribs.src || '').startsWith('/uploads/'),
        transformTags: {
            a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }),
        },
    });
}

/** Plain-text excerpt for cards and the carousel. */
function excerpt(html, max = 160) {
    const text = sanitizeHtml(html || '', { allowedTags: [], allowedAttributes: {} })
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return text.length > max ? `${text.slice(0, max)}…` : text;
}

module.exports = { sanitizeBody, excerpt };

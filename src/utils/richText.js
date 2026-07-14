/**
 * Rich-text (HTML) helpers for questions.
 *
 * The server is the source of truth for sanitisation — never trust HTML that was
 * only cleaned in the browser.
 *
 * Every write path stores the sanitized HTML *and* regenerates the plain-text
 * sibling from it (see htmlToPlain). The plain columns must stay tag-free because
 * consumers that cannot render HTML read them directly:
 *   - src/services/quizPdfService.js (pdf-lib draws text primitives only)
 *   - src/controllers/liveController.js (question text is serialised into the
 *     live-quiz session payload)
 */
const sanitizeHtmlLib = require('sanitize-html');

/** Tags a question body may contain (formatting, lists, tables, images, math). */
const ALLOWED_TAGS = [
  'p', 'br', 'span', 'div',
  'strong', 'b', 'em', 'i', 'u', 's', 'sup', 'sub',
  'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'img', 'figure', 'figcaption',
  'blockquote', 'code', 'pre',
  // KaTeX renders into these; keep them so pre-rendered math survives.
  'math', 'semantics', 'mrow', 'mi', 'mn', 'mo', 'msup', 'msub', 'mfrac',
  'msqrt', 'annotation',
];

const ALLOWED_ATTRS = {
  '*': ['class', 'style'],
  img: ['src', 'alt', 'width', 'height'],
  td: ['colspan', 'rowspan'],
  th: ['colspan', 'rowspan'],
  // TipTap/KaTeX round-trip: keep the source LaTeX so the editor can reopen it.
  span: ['class', 'style', 'data-latex', 'data-type'],
};

/**
 * Sanitize question/solution HTML.
 * Drops <script>/<style> entirely (content included) and all on* handlers —
 * sanitize-html strips any attribute not on the allowlist, so onerror/onload go too.
 * @param {string} html
 * @returns {string} safe HTML ('' when input is empty/not a string)
 */
function sanitizeQuestionHtml(html) {
  if (html == null || typeof html !== 'string' || !html.trim()) return '';
  return sanitizeHtmlLib(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRS,
    // Relative uploads/... paths plus http(s). `data:` is intentionally NOT allowed:
    // images are uploaded and referenced by URL to keep rows small.
    allowedSchemes: ['http', 'https'],
    allowedSchemesByTag: { img: ['http', 'https'] },
    allowProtocolRelative: false,
    // Remove the tag AND its contents for these.
    nonTextTags: ['script', 'style', 'textarea', 'noscript', 'iframe'],
  }).trim();
}

/** Decode the handful of entities sanitize-html/browsers emit. */
function decodeEntities(str) {
  return str
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&'); // must be last
}

/**
 * Convert question HTML to the plain-text mirror stored in `questions.question`.
 * Block boundaries become newlines, table cells are space separated, and images
 * become a marker so the text still reads sensibly in the pdf-lib PDF.
 * @param {string} html
 * @returns {string} tag-free plain text
 */
function htmlToPlain(html) {
  if (html == null || typeof html !== 'string' || !html.trim()) return '';

  let out = html;
  // Drop these tags and everything inside them.
  out = out.replace(/<(script|style|noscript|iframe)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  // Images carry no text — leave a marker rather than dropping them silently.
  out = out.replace(/<img\b[^>]*>/gi, ' [image] ');
  // Cell boundaries -> space so "a|b" doesn't become "ab".
  out = out.replace(/<\/(td|th)>/gi, ' ');
  // Block boundaries -> newline.
  out = out.replace(/<br\s*\/?>/gi, '\n');
  out = out.replace(/<\/(p|div|li|tr|h[1-6]|blockquote|pre)>/gi, '\n');
  // Everything else: strip the tag, keep the text.
  out = out.replace(/<[^>]+>/g, '');

  out = decodeEntities(out);

  // Collapse runs of spaces/newlines produced by the substitutions above.
  out = out
    .replace(/[ \t ]+/g, ' ')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return out;
}

/**
 * Sanitize an array of option HTML fragments.
 * @param {string[]|string} value array (or JSON string) of HTML fragments
 * @returns {string[]|null} sanitized fragments, or null when absent/unparseable
 */
function sanitizeOptionsHtml(value) {
  if (value == null || value === '') return null;
  let arr = value;
  if (typeof arr === 'string') {
    try {
      arr = JSON.parse(arr);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(arr)) return null;
  return arr.map((frag) => sanitizeQuestionHtml(String(frag ?? '')));
}

/**
 * Plain-text mirror of the option fragments — must stay a flat array of strings,
 * index-aligned with options_html. quizPdfService prints [object Object] otherwise.
 * @param {string[]} optionsHtml
 * @returns {string[]}
 */
function optionsHtmlToPlain(optionsHtml) {
  if (!Array.isArray(optionsHtml)) return [];
  return optionsHtml.map((frag) => htmlToPlain(String(frag ?? '')));
}

module.exports = {
  sanitizeQuestionHtml,
  sanitizeOptionsHtml,
  htmlToPlain,
  optionsHtmlToPlain,
};

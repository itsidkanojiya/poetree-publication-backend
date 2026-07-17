const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const LINE_HEIGHT = 14;
const TITLE_SIZE = 16;
const BODY_SIZE = 11;
const OPTION_SIZE = 10;

// Project root (two levels up from src/services) — composite paths are relative to it.
const ROOT_DIR = path.resolve(__dirname, '..', '..');

/** True when the bytes start with the JPEG SOI marker (composites are normally PNG). */
function isJpeg(bytes) {
  return bytes.length > 2 && bytes[0] === 0xff && bytes[1] === 0xd8;
}

/** Placement/alignment as stored on the question, normalized with safe defaults. */
function compositePlacement(question) {
  const p = String((question && question.image_placement) || 'below').toLowerCase();
  // pdf-lib has no text wrapping, so floats/inline degrade to a block below the text.
  return p === 'above' ? 'above' : 'below';
}

function compositeAlign(question) {
  const a = String((question && question.image_align) || 'center').toLowerCase();
  return a === 'left' || a === 'right' ? a : 'center';
}

/**
 * Embed a question's composite image (relative path) and return { image, width, height }
 * scaled to fit within maxWidth AND maxHeight points, or null when absent/unreadable.
 * Handles both PNG and JPEG so a non-PNG composite doesn't silently vanish.
 */
async function embedCompositeImage(pdfDoc, question, maxWidth, maxHeight) {
  const rel = question && question.composite_image_url;
  if (!rel) return null;
  try {
    const abs = path.join(ROOT_DIR, rel);
    if (!fs.existsSync(abs)) return null;
    const bytes = fs.readFileSync(abs);
    const image = isJpeg(bytes)
      ? await pdfDoc.embedJpg(bytes)
      : await pdfDoc.embedPng(bytes);
    // Clamp on BOTH axes so a tall composite can never overflow the page.
    const scale = Math.min(
      1,
      maxWidth / image.width,
      maxHeight > 0 ? maxHeight / image.height : 1
    );
    return { image, width: image.width * scale, height: image.height * scale };
  } catch (e) {
    console.warn('[quizPdf] failed to embed composite image:', e.message);
    return null;
  }
}

/** X coordinate for a composite of `width` given its alignment within the content column. */
function compositeX(align, width, contentWidth) {
  const left = MARGIN + 18;
  const usable = contentWidth - 18;
  if (align === 'right') return left + Math.max(0, usable - width);
  if (align === 'center') return left + Math.max(0, (usable - width) / 2);
  return left;
}

/**
 * Characters that rich-text authoring commonly introduces but StandardFonts.Helvetica
 * (WinAnsi) cannot encode — drawText() THROWS on these, which would fail the whole PDF.
 * Map them to safe ASCII equivalents.
 */
const TRANSLITERATE = [
  [/[‘’‚‛]/g, "'"],   // smart single quotes
  [/[“”„‟]/g, '"'],   // smart double quotes
  [/[‐-―]/g, '-'],              // hyphens / en / em dashes
  [/…/g, '...'],                     // ellipsis
  [/[  -​]/g, ' '],        // nbsp + exotic spaces
  [/×/g, 'x'],                       // ×
  [/÷/g, '/'],                       // ÷
  [/−/g, '-'],                       // minus sign
  [/≤/g, '<='],                      // ≤
  [/≥/g, '>='],                      // ≥
  [/≠/g, '!='],                      // ≠
  [/°/g, ' deg'],                    // °
  [/√/g, 'sqrt'],                    // √
  [/π/g, 'pi'],                      // π
  [/•/g, '-'],                       // bullet
];

/**
 * Sanitize text for PDF: strip control chars, transliterate to WinAnsi-safe ASCII,
 * drop anything still unencodable, and cap the length.
 */
function sanitize(text) {
  if (text == null || typeof text !== 'string') return '';
  let out = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  for (const [re, rep] of TRANSLITERATE) out = out.replace(re, rep);
  // Anything left outside Latin-1 would throw in Helvetica — drop it rather than crash.
  out = out.replace(/[^\x20-\x7E¡-ÿ\n]/g, '');
  return out.slice(0, 2000).trim();
}

/** Wrap text into lines that fit within maxWidth (approx char width = fontSize * 0.5). */
function wrapText(font, text, fontSize, maxWidth) {
  const str = sanitize(text);
  if (!str) return [];
  const approxChar = fontSize * 0.5;
  const maxChars = Math.floor(maxWidth / approxChar);
  const lines = [];
  let remaining = str;
  while (remaining.length > 0) {
    if (remaining.length <= maxChars) {
      lines.push(remaining);
      break;
    }
    let breakAt = remaining.slice(0, maxChars + 1).lastIndexOf(' ');
    if (breakAt <= 0) breakAt = maxChars;
    lines.push(remaining.slice(0, breakAt).trim());
    remaining = remaining.slice(breakAt).trim();
  }
  return lines;
}

/** Parse options from question (JSON string or array). Returns array of strings. */
function getOptionsList(question) {
  let opts = question.options;
  if (!opts) return ['A', 'B', 'C', 'D'];
  if (typeof opts === 'string') {
    try {
      opts = JSON.parse(opts);
    } catch {
      return ['A', 'B', 'C', 'D'];
    }
  }
  if (!Array.isArray(opts)) return ['A', 'B', 'C', 'D'];
  return opts.map((o) => String(o)).slice(0, 10);
}

/** Get correct answer label (A/B/C/D or 1-based index). */
function getAnswerLabel(question) {
  const ans = question.answer;
  if (ans == null || ans === '') return null;
  const s = String(ans).trim();
  if (/^[A-Da-d]$/.test(s)) return s.toUpperCase();
  const n = parseInt(s, 10);
  if (!isNaN(n) && n >= 1) {
    const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    return labels[n - 1] || String(n);
  }
  return s;
}

/**
 * Generate student quiz PDF (questions with options; no answers).
 * @param {object} paper - Paper model instance or plain object (paper_title, school_name, address, etc.)
 * @param {array} questions - Array of question objects (question, options, marks, etc.)
 * @param {{ schoolName?, address? }} branding - Optional override for header
 * @returns {Promise<Buffer>}
 */
async function generateQuizPaperPdf(paper, questions, branding = {}) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const black = rgb(0, 0, 0);
  const gray = rgb(0.35, 0.35, 0.4);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const contentWidth = PAGE_WIDTH - MARGIN * 2;
  let y = PAGE_HEIGHT - MARGIN;

  const schoolName = sanitize(branding.schoolName || paper.school_name || 'School');
  const address = sanitize(branding.address || paper.address || '');
  const title = sanitize(paper.paper_title || 'Quiz');

  // Header
  page.drawText(schoolName.toUpperCase(), {
    x: MARGIN,
    y,
    size: TITLE_SIZE,
    font: bold,
    color: black,
  });
  y -= LINE_HEIGHT;
  if (address) {
    const addrLines = wrapText(font, address, 9, contentWidth);
    for (const line of addrLines) {
      page.drawText(line, { x: MARGIN, y, size: 9, font, color: gray });
      y -= 12;
    }
  }
  page.drawText(title, {
    x: MARGIN,
    y,
    size: TITLE_SIZE,
    font: bold,
    color: black,
  });
  y -= LINE_HEIGHT * 1.5;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const qNum = i + 1;
    const qText = q.question || '';
    const opts = getOptionsList(q);

    const qLines = wrapText(font, qText, BODY_SIZE, contentWidth - 20);
    const optLines = opts.map((o, j) => `  ${String.fromCharCode(65 + j)}. ${sanitize(o)}`);

    // Composite image. Scaled to fit the content column and clamped to the usable page
    // height; its exact height is added to the page-break budget so a question is never
    // split across the page boundary. Honours image_placement (above/below) and image_align.
    const maxImageHeight = PAGE_HEIGHT - MARGIN * 2 - LINE_HEIGHT * 2;
    const composite = await embedCompositeImage(pdfDoc, q, contentWidth - 18, maxImageHeight);
    const placement = compositePlacement(q);
    const align = compositeAlign(q);

    const totalLines = 1 + qLines.length + optLines.length;
    const needed = totalLines * LINE_HEIGHT + 10 + (composite ? composite.height + 8 : 0);

    if (y - needed < MARGIN) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }

    const drawComposite = () => {
      if (!composite) return;
      y -= composite.height;
      page.drawImage(composite.image, {
        x: compositeX(align, composite.width, contentWidth),
        y,
        width: composite.width,
        height: composite.height,
      });
      y -= 8;
    };

    page.drawText(`${qNum}.`, {
      x: MARGIN,
      y,
      size: BODY_SIZE,
      font: bold,
      color: black,
    });
    y -= LINE_HEIGHT;

    if (placement === 'above') drawComposite();

    for (const line of qLines) {
      page.drawText(line, { x: MARGIN + 18, y, size: BODY_SIZE, font, color: black });
      y -= LINE_HEIGHT;
    }

    if (placement === 'below') drawComposite();

    for (const line of optLines) {
      page.drawText(line, { x: MARGIN + 18, y, size: OPTION_SIZE, font, color: black });
      y -= LINE_HEIGHT;
    }
    y -= 8;
  }

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

/**
 * Generate answer key PDF (questions with correct answer indicated).
 * @param {object} paper
 * @param {array} questions
 * @param {{ schoolName?, address? }} branding
 * @returns {Promise<Buffer>}
 */
async function generateAnswerKeyPdf(paper, questions, branding = {}) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const black = rgb(0, 0, 0);
  const gray = rgb(0.35, 0.35, 0.4);
  const green = rgb(0, 0.5, 0);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const contentWidth = PAGE_WIDTH - MARGIN * 2;
  let y = PAGE_HEIGHT - MARGIN;

  const schoolName = sanitize(branding.schoolName || paper.school_name || 'School');
  const title = sanitize(paper.paper_title || 'Quiz') + ' — Answer Key';

  page.drawText(schoolName.toUpperCase(), {
    x: MARGIN,
    y,
    size: TITLE_SIZE,
    font: bold,
    color: black,
  });
  y -= LINE_HEIGHT;
  page.drawText(title, {
    x: MARGIN,
    y,
    size: TITLE_SIZE,
    font: bold,
    color: black,
  });
  y -= LINE_HEIGHT * 1.5;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const ans = getAnswerLabel(q);
    const line = `${i + 1}. ${sanitize((q.question || '').slice(0, 80))}${q.question && q.question.length > 80 ? '...' : ''}  →  Answer: ${ans != null ? ans : '—'}`;
    const lines = wrapText(font, line, BODY_SIZE, contentWidth);
    const needed = lines.length * LINE_HEIGHT + 4;
    if (y - needed < MARGIN) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
    for (const l of lines) {
      page.drawText(l, { x: MARGIN, y, size: BODY_SIZE, font, color: black });
      y -= LINE_HEIGHT;
    }
    if (ans != null) {
      page.drawText(`Answer: ${ans}`, {
        x: PAGE_WIDTH - MARGIN - 80,
        y: y + LINE_HEIGHT,
        size: OPTION_SIZE,
        font: bold,
        color: green,
      });
    }
    y -= 4;
  }

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

/**
 * Generate an "Answers & Solutions" PDF: each question with its options, the
 * correct answer, and the full solution/explanation text. Lines paginate
 * individually so a long solution flows across pages instead of overflowing.
 * @param {object} paper
 * @param {array} questions
 * @param {{ schoolName?, address? }} branding
 * @returns {Promise<Buffer>}
 */
async function generateAnswerSolutionPdf(paper, questions, branding = {}) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const black = rgb(0, 0, 0);
  const gray = rgb(0.35, 0.35, 0.4);
  const green = rgb(0, 0.5, 0);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const contentWidth = PAGE_WIDTH - MARGIN * 2;
  let y = PAGE_HEIGHT - MARGIN;

  // Draw one line, adding a page first when there is no room left.
  const draw = (text, { x = MARGIN, size = BODY_SIZE, f = font, color = black } = {}) => {
    if (y - LINE_HEIGHT < MARGIN) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
    page.drawText(text, { x, y, size, font: f, color });
    y -= LINE_HEIGHT;
  };

  const schoolName = sanitize(branding.schoolName || paper.school_name || 'School');
  const title = sanitize(paper.paper_title || 'Quiz') + ' — Answers & Solutions';
  draw(schoolName.toUpperCase(), { size: TITLE_SIZE, f: bold });
  draw(title, { size: TITLE_SIZE, f: bold });
  y -= LINE_HEIGHT * 0.5;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const ans = getAnswerLabel(q);
    const opts = getOptionsList(q);

    // Question
    for (const l of wrapText(font, `${i + 1}. ${q.question || ''}`, BODY_SIZE, contentWidth)) {
      draw(l, { f: bold });
    }
    // Options
    opts.forEach((o, j) => {
      for (const l of wrapText(font, `${String.fromCharCode(65 + j)}. ${sanitize(o)}`, OPTION_SIZE, contentWidth - 16)) {
        draw(l, { x: MARGIN + 12, size: OPTION_SIZE });
      }
    });
    // Answer
    draw(`Answer: ${ans != null ? ans : '—'}`, { x: MARGIN + 12, size: OPTION_SIZE, f: bold, color: green });
    // Solution
    const solution = sanitize(q.solution || '');
    if (solution) {
      for (const l of wrapText(font, `Solution: ${solution}`, OPTION_SIZE, contentWidth - 16)) {
        draw(l, { x: MARGIN + 12, size: OPTION_SIZE, color: gray });
      }
    }
    y -= 8;
  }

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

/**
 * Generate OMR-style sheet PDF (bubbles for each question × option).
 * @param {object} paper
 * @param {array} questions
 * @param {{ schoolName?, address? }} branding
 * @returns {Promise<Buffer>}
 */
async function generateOmrSheetPdf(paper, questions, branding = {}) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const black = rgb(0, 0, 0);
  const gray = rgb(0.4, 0.4, 0.4);

  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const contentWidth = PAGE_WIDTH - MARGIN * 2;
  let y = PAGE_HEIGHT - MARGIN;

  const schoolName = sanitize(branding.schoolName || paper.school_name || 'School');
  const title = sanitize(paper.paper_title || 'Quiz') + ' — OMR Answer Sheet';

  page.drawText(schoolName.toUpperCase(), {
    x: MARGIN,
    y,
    size: TITLE_SIZE,
    font: bold,
    color: black,
  });
  y -= LINE_HEIGHT;
  page.drawText(title, {
    x: MARGIN,
    y,
    size: 14,
    font: bold,
    color: black,
  });
  y -= LINE_HEIGHT * 1.5;

  const bubbleRadius = 6;
  const colGap = 28;
  const rowHeight = 22;
  const labelA = MARGIN + 30;
  const bubbleStartX = MARGIN + 55;

  // Header row: Q.No | A | B | C | D
  page.drawText('Q.No', { x: MARGIN, y, size: 10, font: bold, color: black });
  ['A', 'B', 'C', 'D'].forEach((letter, j) => {
    page.drawText(letter, {
      x: bubbleStartX + j * colGap + bubbleRadius - 3,
      y,
      size: 10,
      font: bold,
      color: black,
    });
  });
  y -= rowHeight;

  for (let i = 0; i < questions.length; i++) {
    if (y < MARGIN + 40) break; // One page only for simplicity; could add pages
    const qNum = i + 1;
    page.drawText(String(qNum), { x: MARGIN + 5, y, size: 10, font, color: black });
    for (let j = 0; j < 4; j++) {
      const cx = bubbleStartX + j * colGap + bubbleRadius;
      page.drawCircle({
        x: cx,
        y: y - bubbleRadius,
        size: bubbleRadius,
        borderColor: black,
        borderWidth: 1,
      });
    }
    y -= rowHeight;
  }

  page.drawText('Instructions: Darken the circle for your chosen option.', {
    x: MARGIN,
    y: MARGIN + 20,
    size: 9,
    font,
    color: gray,
  });

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

module.exports = {
  generateQuizPaperPdf,
  generateAnswerKeyPdf,
  generateAnswerSolutionPdf,
  generateOmrSheetPdf,
};

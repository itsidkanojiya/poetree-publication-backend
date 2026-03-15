const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const LINE_HEIGHT = 14;
const TITLE_SIZE = 16;
const BODY_SIZE = 11;
const OPTION_SIZE = 10;

/** Sanitize text for PDF (remove control chars, limit length). */
function sanitize(text) {
  if (text == null || typeof text !== 'string') return '';
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').slice(0, 2000).trim();
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

  let page = pdfDoc.addPage(PAGE_WIDTH, PAGE_HEIGHT);
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
    const totalLines = 1 + qLines.length + optLines.length;
    const needed = totalLines * LINE_HEIGHT + 10;

    if (y - needed < MARGIN) {
      page = pdfDoc.addPage(PAGE_WIDTH, PAGE_HEIGHT);
      y = PAGE_HEIGHT - MARGIN;
    }

    page.drawText(`${qNum}.`, {
      x: MARGIN,
      y,
      size: BODY_SIZE,
      font: bold,
      color: black,
    });
    y -= LINE_HEIGHT;

    for (const line of qLines) {
      page.drawText(line, { x: MARGIN + 18, y, size: BODY_SIZE, font, color: black });
      y -= LINE_HEIGHT;
    }
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

  let page = pdfDoc.addPage(PAGE_WIDTH, PAGE_HEIGHT);
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
      page = pdfDoc.addPage(PAGE_WIDTH, PAGE_HEIGHT);
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

  const page = pdfDoc.addPage(PAGE_WIDTH, PAGE_HEIGHT);
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
  generateOmrSheetPdf,
};

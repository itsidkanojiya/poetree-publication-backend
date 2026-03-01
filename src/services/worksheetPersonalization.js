const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts, degrees } = require('pdf-lib');
const personalizationConfig = require('../config/worksheetPersonalization');

const MM_TO_POINTS = 2.834645669;

// Indian-style header colors (saffron accent, navy border, cream background)
const BORDER_COLOR = rgb(0.07, 0.23, 0.37);       // navy #12345e
const ACCENT_COLOR = rgb(1, 0.6, 0.2);            // saffron/orange
const HEADER_BG = rgb(1, 0.973, 0.906);           // light cream #FFF8E7
const TEXT_COLOR = rgb(0.1, 0.1, 0.15);
const BORDER_PT = 1.5;
const ACCENT_LINE_PT = 2;

/**
 * Personalize a canonical worksheet PDF with an Indian-style header and watermark.
 * Does not modify the original file.
 * @param {string} canonicalPdfPath - Absolute path to the worksheet PDF file
 * @param {{ schoolName?: string | null, logoPathOrUrl?: string | null, watermarkOpacity?: number }} branding
 * @returns {Promise<Buffer>} Personalized PDF as buffer
 */
async function personalizeWorksheetPdf(canonicalPdfPath, branding) {
  const headerHeightMm = personalizationConfig.headerHeightMm;
  const logoMaxHeightMm = personalizationConfig.logoMaxHeightMm;
  const maxPages = personalizationConfig.maxPagesToPersonalize;

  const headerHeightPoints = headerHeightMm * MM_TO_POINTS;
  const logoMaxHeightPoints = logoMaxHeightMm * MM_TO_POINTS;

  const watermarkOpacity = typeof branding.watermarkOpacity === 'number' &&
    branding.watermarkOpacity >= 0 && branding.watermarkOpacity <= 1
    ? branding.watermarkOpacity
    : 0.3;

  const pdfBytes = fs.readFileSync(canonicalPdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  if (pages.length === 0) {
    return Buffer.from(await pdfDoc.save());
  }

  const pagesToProcess = Math.min(pages.length, maxPages);
  const schoolName = branding.schoolName && branding.schoolName.trim()
    ? branding.schoolName.trim()
    : personalizationConfig.defaultSchoolName;

  let logoImage = null;
  if (branding.logoPathOrUrl) {
    try {
      logoImage = await embedImageFromPath(pdfDoc, branding.logoPathOrUrl, logoMaxHeightPoints);
    } catch (err) {
      console.warn('[worksheetPersonalization] Logo embed failed:', err.message);
    }
  }

  for (let i = 0; i < pagesToProcess; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();
    const headerTop = height;
    const headerBottom = height - headerHeightPoints;
    const padding = 16;
    const innerLeft = padding;
    const innerRight = width - padding;
    const innerBottom = headerBottom + padding;
    const innerTop = headerTop - padding;

    // 1) Header background (cream)
    page.drawRectangle({
      x: 0,
      y: headerBottom,
      width,
      height: headerHeightPoints,
      color: HEADER_BG,
    });

    // 2) Outer border (navy) - top, left, right, bottom
    page.drawRectangle({
      x: 0,
      y: headerTop - BORDER_PT,
      width,
      height: BORDER_PT,
      color: BORDER_COLOR,
    });
    page.drawRectangle({
      x: 0,
      y: headerBottom,
      width: BORDER_PT,
      height: headerHeightPoints,
      color: BORDER_COLOR,
    });
    page.drawRectangle({
      x: width - BORDER_PT,
      y: headerBottom,
      width: BORDER_PT,
      height: headerHeightPoints,
      color: BORDER_COLOR,
    });
    page.drawRectangle({
      x: 0,
      y: headerBottom,
      width,
      height: BORDER_PT,
      color: BORDER_COLOR,
    });

    // 3) Accent line (saffron) below header border - Indian style
    page.drawRectangle({
      x: 0,
      y: headerBottom - ACCENT_LINE_PT,
      width,
      height: ACCENT_LINE_PT,
      color: ACCENT_COLOR,
    });

    // 4) Logo on the left inside padding
    let xCursor = innerLeft + 8;
    if (logoImage) {
      const logoDims = logoImage.scaleToFit(logoMaxHeightPoints * 2, logoMaxHeightPoints);
      const logoY = innerBottom + (headerHeightPoints - padding * 2 - logoDims.height) / 2;
      page.drawImage(logoImage, {
        x: xCursor,
        y: logoY,
        width: logoDims.width,
        height: logoDims.height,
      });
      xCursor += logoDims.width + 20;
    }

    // 5) School name - prominent, Indian letterhead style (centered in remaining space or after logo)
    const schoolFontSize = 18;
    const schoolY = innerBottom + (headerHeightPoints - padding * 2 - schoolFontSize) / 2;
    const textWidth = width - xCursor - innerRight + innerLeft;
    // Draw school name (left-aligned after logo, or centered if no logo)
    page.drawText(schoolName, {
      x: logoImage ? xCursor : (width / 2) - (schoolName.length * schoolFontSize * 0.28) / 2,
      y: schoolY,
      size: schoolFontSize,
      color: TEXT_COLOR,
    });

    // 6) Thin divider line inside header (above bottom border)
    const lineY = headerBottom + 8;
    page.drawRectangle({
      x: logoImage ? xCursor : padding,
      y: lineY,
      width: logoImage ? width - xCursor - padding : width - padding * 2,
      height: 0.5,
      color: rgb(0.7, 0.7, 0.75),
    });

    // 7) Watermark (diagonal school name, user-controlled opacity)
    const watermarkText = schoolName;
    const watermarkFontSize = 42;
    const centerX = width / 2;
    const centerY = headerBottom / 2;
    const approxTextWidth = watermarkText.length * watermarkFontSize * 0.5;
    const wx = centerX - approxTextWidth / 2;
    const wy = centerY - watermarkFontSize / 2;
    page.drawText(watermarkText, {
      x: wx,
      y: wy,
      size: watermarkFontSize,
      font: helvetica,
      color: rgb(0.75, 0.75, 0.78),
      opacity: watermarkOpacity,
      rotate: degrees(-35),
    });
  }

  const outBytes = await pdfDoc.save();
  return Buffer.from(outBytes);
}

/**
 * Embed image from filesystem path. Supports PNG and JPEG.
 */
async function embedImageFromPath(pdfDoc, filePath, maxHeightPoints) {
  const ext = path.extname(filePath).toLowerCase();
  const bytes = fs.readFileSync(filePath);

  if (ext === '.png') {
    return pdfDoc.embedPng(bytes);
  }
  if (ext === '.jpg' || ext === '.jpeg') {
    return pdfDoc.embedJpg(bytes);
  }
  try {
    return pdfDoc.embedPng(bytes);
  } catch {
    return pdfDoc.embedJpg(bytes);
  }
}

module.exports = {
  personalizeWorksheetPdf,
};

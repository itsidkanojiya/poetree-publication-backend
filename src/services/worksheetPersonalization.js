const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts, degrees } = require('pdf-lib');
const personalizationConfig = require('../config/worksheetPersonalization');

const MM_TO_POINTS = 2.834645669;

// Header: image-2 style — white box, thin black border
const HEADER_BG = rgb(1, 1, 1);
const HEADER_BORDER_COLOR = rgb(0, 0, 0);
const HEADER_BORDER_PT = 1;
// Use pure white behind the header so there is no cream background
const HEADER_BEIGE = HEADER_BG;
const TEXT_COLOR = rgb(0.1, 0.1, 0.15);
const ADDRESS_COLOR = rgb(0.35, 0.35, 0.4);

/** Sanitize text for safe PDF drawing (same idea as school name). */
function sanitizeTextForPdf(text) {
  if (text == null || typeof text !== 'string') return '';
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .slice(0, 300)
    .trim();
}

/** Split long address into lines that fit roughly in maxChars per line (by word). */
function wrapAddress(address, maxChars = 55) {
  if (!address || !address.trim()) return [];
  const words = address.trim().split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    if (line.length + w.length + 1 <= maxChars) {
      line += (line ? ' ' : '') + w;
    } else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

const VALID_WATERMARK_TYPES = ['none', 'text', 'image', 'text_and_image'];

function getWatermarkType(branding) {
  const t = branding.watermark_type;
  if (t && typeof t === 'string' && VALID_WATERMARK_TYPES.includes(t.toLowerCase())) {
    return t.toLowerCase();
  }
  return 'text';
}

/**
 * Personalize a canonical worksheet PDF with header (page 1 only) and watermark (every page).
 * Header: image-2 style — light beige band, white box with thin black border; logo left, school name + address right.
 * Does not modify the original file.
 * @param {string} canonicalPdfPath - Absolute path to the worksheet PDF file
 * @param {{ schoolName?, logoPathOrUrl?, address?, watermarkOpacity?, watermark_type?, watermark_text?, watermark_image_path_or_url? }} branding
 * @returns {Promise<Buffer>} Personalized PDF as buffer
 */
async function personalizeWorksheetPdf(canonicalPdfPath, branding) {
  const headerHeightMm = personalizationConfig.headerHeightMm;
  // Add extra vertical padding below the header box so the page content starts lower
  const extraHeaderPaddingMm = 6;
  const logoMaxHeightMm = personalizationConfig.logoMaxHeightMm;
  const maxPages = personalizationConfig.maxPagesToPersonalize;
  const watermarkImageMaxHeightPt = personalizationConfig.watermarkImageMaxHeightPt || 50;

  const headerHeightPoints = (headerHeightMm + extraHeaderPaddingMm) * MM_TO_POINTS;
  const logoMaxHeightPoints = logoMaxHeightMm * MM_TO_POINTS;

  const watermarkOpacity = typeof branding.watermarkOpacity === 'number' &&
    branding.watermarkOpacity >= 0 && branding.watermarkOpacity <= 1
    ? branding.watermarkOpacity
    : 0.3;
  const watermarkType = getWatermarkType(branding);
  const watermarkText = (branding.watermark_text && String(branding.watermark_text).trim())
    ? sanitizeTextForPdf(branding.watermark_text).slice(0, 200)
    : '';
  const watermarkImagePath = (watermarkType === 'image' || watermarkType === 'text_and_image') && branding.watermark_image_path_or_url
    ? branding.watermark_image_path_or_url
    : null;

  const textSizeScale = typeof branding.watermark_text_size === 'number' && branding.watermark_text_size >= 0.5 && branding.watermark_text_size <= 2
    ? branding.watermark_text_size
    : 1.0;
  const logoSizeScale = typeof branding.watermark_logo_size === 'number' && branding.watermark_logo_size >= 0.5 && branding.watermark_logo_size <= 2
    ? branding.watermark_logo_size
    : 1.0;
  const textBendDeg = typeof branding.watermark_text_bend === 'number' && branding.watermark_text_bend >= -90 && branding.watermark_text_bend <= 90
    ? branding.watermark_text_bend
    : -35;
  const effectiveWatermarkImageMaxHeightPt = watermarkImageMaxHeightPt * logoSizeScale;
  const baseWatermarkFontSize = 42;
  const effectiveWatermarkFontSize = Math.round(baseWatermarkFontSize * textSizeScale);

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

  let watermarkImage = null;
  if (watermarkImagePath && (watermarkType === 'image' || watermarkType === 'text_and_image')) {
    try {
      watermarkImage = await embedImageFromPath(pdfDoc, watermarkImagePath, effectiveWatermarkImageMaxHeightPt);
    } catch (err) {
      console.warn('[worksheetPersonalization] Watermark image embed failed:', err.message);
    }
  }

  for (let i = 0; i < pagesToProcess; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();
    const isFirstPage = i === 0;
    const headerTop = height;
    const headerBottom = height - headerHeightPoints;
    const padding = 16;
    const boxInset = 10;   // distance from page edge to white box
    const contentInset = 14; // inner padding between box border and content (logo/text)
    const innerLeft = boxInset + contentInset;
    const innerBottom = headerBottom + boxInset + contentInset;

    // ----- Header only on page 1 (image-2 style: beige band + white box with thin black border) -----
    if (isFirstPage) {
      // 1) Beige/cream band for full header width (outside the white box)
      page.drawRectangle({
        x: 0,
        y: headerBottom,
        width,
        height: headerHeightPoints,
        color: HEADER_BEIGE,
      });

      // 2) White box with thin black border (no navy, no orange)
      const boxX = boxInset;
      const boxY = headerBottom + boxInset;
      const boxW = width - boxInset * 2;
      const boxH = headerHeightPoints - boxInset * 2;
      page.drawRectangle({
        x: boxX,
        y: boxY,
        width: boxW,
        height: boxH,
        color: HEADER_BG,
        borderColor: HEADER_BORDER_COLOR,
        borderWidth: HEADER_BORDER_PT,
      });

      // 3) Logo on the left inside the white box
      let xCursor = innerLeft;
      if (logoImage) {
        const logoDims = logoImage.scaleToFit(logoMaxHeightPoints * 2, logoMaxHeightPoints);
        const logoY = innerBottom + (boxH - contentInset * 2 - logoDims.height) / 2;
        page.drawImage(logoImage, {
          x: xCursor,
          y: logoY,
          width: logoDims.width,
          height: logoDims.height,
        });
        xCursor += logoDims.width + 20;
      }

      // 4) School name (uppercase) and address — centered in the header box
      const schoolFontSize = 18;
      const addressFontSize = 10;
      const lineGap = 4;
      const schoolNameDisplay = schoolName.toUpperCase();
      const hasAddress = branding.address && String(branding.address).trim().length > 0;
      const addressLines = hasAddress ? wrapAddress(sanitizeTextForPdf(branding.address)) : [];
      const addressLineHeight = addressFontSize + 2;
      const blockHeight = schoolFontSize + (addressLines.length ? lineGap + addressLines.length * addressLineHeight : 0);
      const blockTop = innerBottom + (boxH - contentInset * 2 - blockHeight) / 2 + blockHeight;

      const centerX = boxX + boxW / 2;
      const schoolY = blockTop - schoolFontSize;
      const approxCharWidthSchool = schoolFontSize * 0.28;
      const approxCharWidthAddr = addressFontSize * 0.28;

      page.drawText(schoolNameDisplay, {
        x: centerX - (schoolNameDisplay.length * approxCharWidthSchool) / 2,
        y: schoolY,
        size: schoolFontSize,
        font: helvetica,
        color: TEXT_COLOR,
      });

      addressLines.forEach((line, idx) => {
        page.drawText(line, {
          x: centerX - (line.length * approxCharWidthAddr) / 2,
          y: schoolY - schoolFontSize - lineGap - idx * addressLineHeight,
          size: addressFontSize,
          font: helvetica,
          color: ADDRESS_COLOR,
        });
      });
    }

    // Watermark on every page (none / text / image / text_and_image)
    const displayWatermarkText = watermarkText || schoolName;
    const centerX = width / 2;
    const centerY = isFirstPage ? headerBottom / 2 : height / 2;

    if (watermarkType !== 'none') {
      if ((watermarkType === 'text' || watermarkType === 'text_and_image') && displayWatermarkText) {
        const approxTextWidth = displayWatermarkText.length * effectiveWatermarkFontSize * 0.5;
        const wx = centerX - approxTextWidth / 2;
        const wy = centerY - effectiveWatermarkFontSize / 2;
        page.drawText(displayWatermarkText, {
          x: wx,
          y: wy,
          size: effectiveWatermarkFontSize,
          font: helvetica,
          color: rgb(0.75, 0.75, 0.78),
          opacity: watermarkOpacity,
          rotate: degrees(textBendDeg),
        });
      }
      if ((watermarkType === 'image' || watermarkType === 'text_and_image') && watermarkImage) {
        const wImgDims = watermarkImage.scaleToFit(effectiveWatermarkImageMaxHeightPt * 2, effectiveWatermarkImageMaxHeightPt);
        const offsetY = watermarkType === 'text_and_image' && displayWatermarkText
          ? -wImgDims.height - 20
          : 0;
        const imgX = centerX - wImgDims.width / 2;
        const imgY = centerY - wImgDims.height / 2 + offsetY;
        page.save();
        page.translate(imgX + wImgDims.width / 2, imgY + wImgDims.height / 2);
        page.rotate(degrees(textBendDeg));
        page.translate(-(imgX + wImgDims.width / 2), -(imgY + wImgDims.height / 2));
        page.drawImage(watermarkImage, {
          x: imgX,
          y: imgY,
          width: wImgDims.width,
          height: wImgDims.height,
          opacity: watermarkOpacity,
        });
        page.restore();
      }
    }
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

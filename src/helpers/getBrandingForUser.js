const path = require('path');
const fs = require('fs');
const User = require('../models/User');

const VALID_WATERMARK_TYPES = ['none', 'text', 'image', 'text_and_image'];

function normalizeWatermarkType(value) {
  if (value == null || typeof value !== 'string') return 'text';
  const v = value.trim().toLowerCase();
  return VALID_WATERMARK_TYPES.includes(v) ? v : 'text';
}

/**
 * Resolves branding (school name, logo path, address, watermark options) for a user.
 * Uses user profile fields. Logo must be a server-controlled path.
 * @param {number} userId - User ID
 * @returns {Promise<{ schoolName, logoPathOrUrl, address, watermarkOpacity, watermark_type, watermark_text, watermark_image_path_or_url, watermark_text_size, watermark_logo_size, watermark_text_bend }>}
 */
async function getBrandingForUser(userId) {
  const defaults = {
    schoolName: null,
    logoPathOrUrl: null,
    address: null,
    watermarkOpacity: 0.3,
    watermark_type: 'text',
    watermark_text: '',
    watermark_image_path_or_url: null,
    watermark_text_size: 1.0,
    watermark_logo_size: 1.0,
    watermark_text_bend: -35,
  };
  if (!userId) return defaults;

  const user = await User.findByPk(userId, {
    attributes: [
      'id', 'school_name', 'logo', 'logo_url', 'worksheet_watermark_opacity',
      'worksheet_watermark_type', 'worksheet_watermark_text',
      'worksheet_watermark_text_size', 'worksheet_watermark_logo_size', 'worksheet_watermark_text_bend',
      'address', 'school_address_city', 'school_address_state', 'school_address_pincode',
    ],
  });

  if (!user) return defaults;

  const schoolName = sanitizeSchoolName(user.school_name) || null;
  const logoPathOrUrl = resolveTrustedLogoPath(user.logo, user.logo_url);
  const opacity = user.worksheet_watermark_opacity;
  const watermarkOpacity = typeof opacity === 'number' && opacity >= 0 && opacity <= 1 ? opacity : 0.3;
  const watermark_type = normalizeWatermarkType(user.worksheet_watermark_type);
  const customText = user.worksheet_watermark_text != null ? String(user.worksheet_watermark_text).trim().slice(0, 200) : '';
  const watermark_text = customText || schoolName || 'Your School';
  const watermark_image_path_or_url = (watermark_type === 'image' || watermark_type === 'text_and_image') ? logoPathOrUrl : null;

  const textSize = user.worksheet_watermark_text_size;
  const watermark_text_size = typeof textSize === 'number' && textSize >= 0.5 && textSize <= 2 ? textSize : 1.0;
  const logoSize = user.worksheet_watermark_logo_size;
  const watermark_logo_size = typeof logoSize === 'number' && logoSize >= 0.5 && logoSize <= 2 ? logoSize : 1.0;
  const bend = user.worksheet_watermark_text_bend;
  const watermark_text_bend = typeof bend === 'number' && bend >= -90 && bend <= 90 ? bend : -35;

  const rawAddress = user.address
    ? String(user.address).trim()
    : [user.school_address_city, user.school_address_state, user.school_address_pincode]
        .filter(Boolean)
        .map(s => String(s).trim())
        .join(', ');
  const address = rawAddress ? sanitizeSchoolName(rawAddress) : null;

  return {
    schoolName: schoolName || null,
    logoPathOrUrl,
    address: address || null,
    watermarkOpacity,
    watermark_type,
    watermark_text,
    watermark_image_path_or_url,
    watermark_text_size,
    watermark_logo_size,
    watermark_text_bend,
  };
}

/**
 * Sanitize school name for safe PDF rendering (prevent injection / broken rendering).
 * Restrict to safe character set.
 */
function sanitizeSchoolName(name) {
  if (name == null || typeof name !== 'string') return '';
  return name
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .slice(0, 200)
    .trim();
}

/**
 * Resolve logo to a trusted filesystem path. Only paths under project uploads are allowed.
 * Handles relative paths (uploads/...) and full URLs that point to our uploads (e.g. http://host/uploads/...).
 * @param {string|null} logo - Relative path or full URL (e.g. uploads/papers/logo/xxx.png or http://localhost:4000/uploads/...)
 * @param {string|null} logoUrl - Full URL or path (we only use if it's our own path)
 * @returns {string|null} Absolute path to logo file, or null
 */
function resolveTrustedLogoPath(logo, logoUrl) {
  const rootDir = path.resolve(__dirname, '..', '..');
  const uploadsDir = path.join(rootDir, 'uploads');

  const tryPath = (input) => {
    if (!input || typeof input !== 'string') return null;
    let normalized = input.trim().replace(/\\/g, '/');
    // If it's a full URL to our uploads, strip origin and keep path (e.g. /uploads/papers/logo/x.png)
    try {
      if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
        const u = new URL(normalized);
        normalized = u.pathname.replace(/^\/+/, '');
      }
    } catch (_) { /* ignore */ }
    normalized = normalized.replace(/^\/+/, '');
    if (normalized.startsWith('uploads/')) {
      const absolute = path.join(rootDir, normalized);
      if (absolute.startsWith(uploadsDir) && fs.existsSync(absolute)) {
        return absolute;
      }
    }
    const base = path.basename(normalized);
    const absolute = path.join(uploadsDir, 'papers', 'logo', base);
    if (fs.existsSync(absolute)) return absolute;
    const absolute2 = path.join(uploadsDir, base);
    if (fs.existsSync(absolute2)) return absolute2;
    return null;
  };

  return tryPath(logo) || tryPath(logoUrl) || null;
}

module.exports = {
  getBrandingForUser,
  sanitizeSchoolName,
  resolveTrustedLogoPath,
};

const path = require('path');
const fs = require('fs');
const User = require('../models/User');

/**
 * Resolves branding (school name and logo path) for a user.
 * Uses user profile fields (school_name, logo). Logo must be a server-controlled path.
 * @param {number} userId - User ID
 * @returns {Promise<{ schoolName: string, logoPathOrUrl: string | null }>}
 */
async function getBrandingForUser(userId) {
  if (!userId) {
    return { schoolName: null, logoPathOrUrl: null };
  }

  const user = await User.findByPk(userId, {
    attributes: ['id', 'school_name', 'logo', 'logo_url', 'worksheet_watermark_opacity'],
  });

  if (!user) {
    return { schoolName: null, logoPathOrUrl: null, watermarkOpacity: 0.3 };
  }

  const schoolName = sanitizeSchoolName(user.school_name) || null;
  const logoPathOrUrl = resolveTrustedLogoPath(user.logo, user.logo_url);
  const opacity = user.worksheet_watermark_opacity;
  const watermarkOpacity = typeof opacity === 'number' && opacity >= 0 && opacity <= 1 ? opacity : 0.3;

  return {
    schoolName: schoolName || null,
    logoPathOrUrl,
    watermarkOpacity,
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

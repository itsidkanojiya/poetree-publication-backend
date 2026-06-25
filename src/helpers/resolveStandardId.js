const Standard = require('../models/Standard');

/**
 * Resolve a standard value (which may be a standard_id OR a display name) to the
 * canonical standard_id from the `standards` table.
 *
 * The `questions.standard` column historically stored a mix of values: the
 * standard_id (e.g. 26) and the display name / grade number (e.g. "6"). The rest
 * of the app (context selector, smart paper) filters by standard_id, so every
 * write must be normalized to the standard_id.
 *
 * Rules:
 * - If the value is already a valid standard_id, keep it (canonical).
 * - Else if it matches a standard's display name (e.g. "6" -> standard_id 26),
 *   return that standard_id.
 * - Else return the parsed integer if numeric, otherwise null.
 *
 * @param {string|number} value
 * @returns {Promise<number|null>}
 */
async function resolveStandardId(value) {
  if (value === undefined || value === null || value === '') return null;

  const raw = String(value).trim();
  const asInt = parseInt(raw, 10);

  // Already a valid standard_id? Treat it as canonical.
  if (!isNaN(asInt)) {
    const byId = await Standard.findByPk(asInt);
    if (byId) return byId.standard_id;
  }

  // Otherwise resolve by display name (e.g. "6" -> 26).
  const byName = await Standard.findOne({ where: { name: raw } });
  if (byName) return byName.standard_id;

  // Fallback: keep the numeric value, or null if not a number.
  return isNaN(asInt) ? null : asInt;
}

module.exports = { resolveStandardId };

/**
 * Configuration for personalized worksheet PDF generation.
 * Values can be overridden via environment variables.
 */
module.exports = {
  /** Header band height in mm (top of each page) */
  headerHeightMm: Number(process.env.WORKSHEET_HEADER_HEIGHT_MM) || 28,
  /** Maximum logo height in mm */
  logoMaxHeightMm: Number(process.env.WORKSHEET_LOGO_MAX_HEIGHT_MM) || 20,
  /** Cache TTL in seconds (0 = disable cache) */
  cacheTtlSeconds: Number(process.env.WORKSHEET_PERSONALIZATION_CACHE_TTL) || 600,
  /** Timeout for personalization in seconds */
  personalizationTimeoutSeconds: Number(process.env.WORKSHEET_PERSONALIZATION_TIMEOUT) || 15,
  /** Max pages to personalize (beyond this, return original or first-page only) */
  maxPagesToPersonalize: Number(process.env.WORKSHEET_MAX_PAGES_PERSONALIZE) || 50,
  /** Default school name when none provided */
  defaultSchoolName: process.env.WORKSHEET_DEFAULT_SCHOOL_NAME || 'Your School',
};

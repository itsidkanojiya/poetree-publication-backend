/**
 * QUESTION TYPE CONSTANTS — backend single source of truth.
 *
 * Mirrors the frontend registry (poetree-publication frontend:
 * src/utils/questionTypes.js). Type allow-lists used to be copy-pasted into the
 * controllers and the upload middleware, which meant a new type silently failed in
 * one place while working in another (notably upload.js, which rejects unknown types
 * BEFORE the controller runs and so breaks image upload).
 *
 * `questions.type` is STRING(50) (not an ENUM), so adding a value here needs no DB
 * migration.
 */

/** Canonical section keys (frontend/API spelling, `true_false`). */
const SECTION_WEIGHT_KEYS = [
  'mcq',
  'blank',
  'true_false',
  'onetwo',
  'short',
  'long',
  'passage',
  'match',
  // Language-specific (Gujarati / Hindi / Sanskrit subjects only)
  'complete_lines',
  'synonyms',
  'antonyms',
  'translate',
];

/**
 * Values actually stored in `questions.type`. Identical to the canonical keys except
 * true_false, which the DB/API spells `truefalse`.
 */
const DB_QUESTION_TYPES = SECTION_WEIGHT_KEYS.map((k) =>
  k === 'true_false' ? 'truefalse' : k
);

/** Passage sub-question types (unchanged — sub-questions stay simple). */
const PASSAGE_SUB_TYPES = ['mcq', 'short', 'blank', 'truefalse'];

/**
 * Paper languages each type is allowed in. null = every subject.
 * Kept in sync with the frontend registry's `languages`.
 */
const TYPE_LANGUAGES = {
  complete_lines: ['gujarati', 'hindi', 'sanskrit'],
  synonyms: ['gujarati', 'hindi', 'sanskrit'],
  antonyms: ['gujarati', 'hindi', 'sanskrit'],
  translate: ['sanskrit'],
};

module.exports = {
  SECTION_WEIGHT_KEYS,
  DB_QUESTION_TYPES,
  PASSAGE_SUB_TYPES,
  TYPE_LANGUAGES,
};

/**
 * Smart paper proposal: balances section (type), chapter, and difficulty targets by marks.
 * - Section targets: marks per question type vs section_weights × total_marks.
 * - Chapter mix: marks per chapter vs chapter_weights (normalized to 100 if needed).
 * - Difficulty mix: marks per difficulty vs difficulty_weights (marks-based; actual_percent is % of total paper marks).
 *
 * @see docs/PROMPT_BACKEND_SMART_PAPER.md (canonical section keys; DB `truefalse` → `true_false`).
 */

const DIFFICULTIES = ['easy', 'medium', 'hard'];

/** Canonical section keys — request must include all eight; sum === 100. */
const SECTION_WEIGHT_KEYS = [
  'mcq',
  'blank',
  'true_false',
  'onetwo',
  'short',
  'long',
  'passage',
  'match',
];

/**
 * Map DB/API type to canonical key (align with frontend normalizeQuestionType).
 * @returns {string|null}
 */
function normalizeQuestionType(type) {
  if (!type) return null;
  const t = String(type).toLowerCase();
  if (t === 'truefalse') return 'true_false';
  return t;
}

/** Canonical key → DB `questions.type` value */
function canonicalToDbType(canonical) {
  if (canonical === 'true_false') return 'truefalse';
  return canonical;
}

/**
 * Validate section_weights: all keys present, sum === 100, non-negative; unknown keys → error.
 * @returns {{ ok: boolean, errors: string[] }}
 */
function validateSectionWeights(section_weights) {
  const errors = [];
  if (!section_weights || typeof section_weights !== 'object') {
    return { ok: false, errors: ['section_weights must be an object'] };
  }
  const extra = Object.keys(section_weights).filter((k) => !SECTION_WEIGHT_KEYS.includes(k));
  if (extra.length) {
    errors.push(`Unknown section_weights keys: ${extra.join(', ')}`);
  }
  let sum = 0;
  for (const k of SECTION_WEIGHT_KEYS) {
    if (section_weights[k] == null) {
      errors.push(`Missing section_weights.${k}`);
      continue;
    }
    const v = Number(section_weights[k]);
    if (Number.isNaN(v) || v < 0) {
      errors.push(`Invalid section_weights.${k}`);
    } else {
      sum += v;
    }
  }
  if (Math.abs(sum - 100) > 0.001) {
    errors.push(`section_weights must sum to 100 (got ${sum})`);
  }
  return { ok: errors.length === 0, errors };
}

function normalizeDifficulty(d) {
  if (d == null || d === '') return 'medium';
  const x = String(d).toLowerCase();
  return DIFFICULTIES.includes(x) ? x : 'medium';
}

function sumValues(obj) {
  return Object.values(obj).reduce((a, b) => a + (Number(b) || 0), 0);
}

/**
 * Largest-remainder allocation so integer targets sum to totalMarks.
 * @param {Record<string, number>} weights - non-negative numbers (should sum to 100)
 * @param {number} totalMarks
 */
function allocateIntegerMarksFromPercents(weights, totalMarks) {
  const keys = Object.keys(weights);
  if (keys.length === 0 || totalMarks <= 0) return {};
  const sumW = sumValues(weights);
  if (sumW <= 0) {
    const eq = Math.floor(totalMarks / keys.length);
    let rem = totalMarks - eq * keys.length;
    const out = {};
    keys.forEach((k, i) => {
      out[k] = eq + (i < rem ? 1 : 0);
    });
    return out;
  }
  const entries = keys.map((k) => {
    const exact = (weights[k] / sumW) * totalMarks;
    return { k, exact, floor: Math.floor(exact) };
  });
  let s = entries.reduce((a, e) => a + e.floor, 0);
  let rem = totalMarks - s;
  const order = [...entries].sort((a, b) => b.exact - a.floor - (a.exact - a.floor));
  const targets = {};
  entries.forEach((e) => {
    targets[e.k] = e.floor;
  });
  for (let i = 0; i < rem; i++) {
    targets[order[i % order.length].k]++;
  }
  return targets;
}

function pickBestQuestion(available, gap, chapterTarget, chapterCur, diffTarget, diffCur) {
  if (!available.length) return null;
  let best = null;
  let bestScore = -Infinity;
  for (const q of available) {
    const ch = q.chapter_id;
    const d = normalizeDifficulty(q.difficulty);
    const chNeed = Math.max(0, (chapterTarget[ch] || 0) - (chapterCur[ch] || 0));
    const dNeed = Math.max(0, (diffTarget[d] || 0) - (diffCur[d] || 0));
    const overshoot = Math.max(0, q.marks - gap);
    const fits = q.marks <= gap ? 1 : 0;
    const score = chNeed * 3 + dNeed * 3 + fits * 50 - overshoot * 2 - q.marks * 0.01;
    if (score > bestScore) {
      bestScore = score;
      best = q;
    }
  }
  return best;
}

/**
 * @param {object} params
 * @param {Array<{question_id:number,type:string,marks:number,chapter_id:number|null,difficulty?:string}>} params.pool
 * @param {number} params.total_marks
 * @param {Record<string, number>} params.section_weights - keys = types, sum 100
 * @param {Array<{chapter_id:number,percent:number}>} params.chapter_weights - normalized to sum 100
 * @param {Record<string, number>} params.difficulty_weights - easy/medium/hard sum 100
 * @param {string[]} params.warnings - mutated
 */
function buildProposal({ pool, total_marks, section_weights, chapter_weights, difficulty_weights, warnings }) {
  const used = new Set();
  const selected = [];

  const sectionTargets = allocateIntegerMarksFromPercents(section_weights, total_marks);

  const chapterPercents = {};
  chapter_weights.forEach((c) => {
    chapterPercents[c.chapter_id] = c.percent;
  });
  const chapterTarget = allocateIntegerMarksFromPercents(chapterPercents, total_marks);

  const diffTarget = allocateIntegerMarksFromPercents(difficulty_weights, total_marks);

  const chapterCur = {};
  const diffCur = { easy: 0, medium: 0, hard: 0 };
  const sectionCur = {};

  const positiveCanonical = SECTION_WEIGHT_KEYS.filter((k) => (section_weights[k] || 0) > 0);
  const sectionOrder = [...positiveCanonical].sort(
    (a, b) => (sectionTargets[b] || 0) - (sectionTargets[a] || 0)
  );

  for (const type of sectionOrder) {
    let need = sectionTargets[type] || 0;
    while (need > 0) {
      const available = pool.filter(
        (q) =>
          normalizeQuestionType(q.type) === type &&
          !used.has(q.question_id) &&
          q.marks > 0
      );
      if (!available.length) {
        warnings.push(`section:${type}:insufficient_pool:need_${need}_marks`);
        break;
      }
      const q = pickBestQuestion(available, need, chapterTarget, chapterCur, diffTarget, diffCur);
      if (!q) break;
      used.add(q.question_id);
      const ch = q.chapter_id;
      const d = normalizeDifficulty(q.difficulty);
      const canon = normalizeQuestionType(q.type);
      chapterCur[ch] = (chapterCur[ch] || 0) + q.marks;
      diffCur[d] = (diffCur[d] || 0) + q.marks;
      if (canon) sectionCur[canon] = (sectionCur[canon] || 0) + q.marks;
      need -= q.marks;
      selected.push(q);
      if (need <= 0) break;
    }
    if (need > 0) {
      warnings.push(`section:${type}:underfilled:remaining_${need}_marks`);
    }
  }

  let total = selected.reduce((s, q) => s + q.marks, 0);

  const allowedCanonical = new Set(positiveCanonical);
  if (total < total_marks) {
    let gap = total_marks - total;
    const rest = pool.filter(
      (q) =>
        !used.has(q.question_id) &&
        allowedCanonical.has(normalizeQuestionType(q.type))
    );
    while (gap > 0 && rest.length) {
      const candidates = rest.filter((q) => q.marks <= gap);
      const pickFrom = candidates.length ? candidates : rest;
      const q = pickBestQuestion(pickFrom, gap, chapterTarget, chapterCur, diffTarget, diffCur);
      if (!q) break;
      used.add(q.question_id);
      const d = normalizeDifficulty(q.difficulty);
      const ch = q.chapter_id;
      const canon = normalizeQuestionType(q.type);
      chapterCur[ch] = (chapterCur[ch] || 0) + q.marks;
      diffCur[d] = (diffCur[d] || 0) + q.marks;
      if (canon) sectionCur[canon] = (sectionCur[canon] || 0) + q.marks;
      selected.push(q);
      total += q.marks;
      gap = total_marks - total;
      const idx = rest.findIndex((x) => x.question_id === q.question_id);
      if (idx >= 0) rest.splice(idx, 1);
    }
    if (total < total_marks) {
      warnings.push(`total_marks:underfilled:got_${total}_target_${total_marks}`);
    }
  }

  if (total > total_marks) {
    warnings.push(`total_marks:overshoot:got_${total}_target_${total_marks}`);
  }

  return {
    selected,
    sectionTargets,
    chapterTarget,
    diffTarget,
    chapterCur,
    diffCur,
    sectionCur,
    total,
  };
}

function computeAggregatesFromSelection(selected) {
  const sectionCur = {};
  const chapterCur = {};
  const diffCur = { easy: 0, medium: 0, hard: 0 };
  let total = 0;
  for (const q of selected) {
    total += q.marks;
    const canon = normalizeQuestionType(q.type);
    if (canon) sectionCur[canon] = (sectionCur[canon] || 0) + q.marks;
    const ch = q.chapter_id;
    if (ch != null) chapterCur[ch] = (chapterCur[ch] || 0) + q.marks;
    const d = normalizeDifficulty(q.difficulty);
    diffCur[d] = (diffCur[d] || 0) + q.marks;
  }
  return { total, sectionCur, chapterCur, diffCur };
}

function buildTotals({
  section_weights,
  chapter_weights,
  difficulty_weights,
  selected,
}) {
  const { total, sectionCur, chapterCur, diffCur } = computeAggregatesFromSelection(selected);

  const by_section = {};
  for (const t of SECTION_WEIGHT_KEYS) {
    const actual_marks = sectionCur[t] || 0;
    const actual_percent = total > 0 ? (actual_marks / total) * 100 : 0;
    by_section[t] = {
      target_percent: section_weights[t] ?? 0,
      actual_marks,
      actual_percent: Math.round(actual_percent * 100) / 100,
    };
  }

  const by_chapter = chapter_weights.map((c) => {
    const actual_marks = chapterCur[c.chapter_id] || 0;
    const actual_percent = total > 0 ? (actual_marks / total) * 100 : 0;
    return {
      chapter_id: c.chapter_id,
      target_percent: c.percent,
      actual_marks,
      actual_percent: Math.round(actual_percent * 100) / 100,
    };
  });

  const by_difficulty = {};
  DIFFICULTIES.forEach((d) => {
    const actual_marks = diffCur[d] || 0;
    const actual_percent = total > 0 ? (actual_marks / total) * 100 : 0;
    by_difficulty[d] = {
      target_percent: difficulty_weights[d] ?? 0,
      actual_percent: Math.round(actual_percent * 100) / 100,
    };
  });

  return {
    total_marks: total,
    by_section,
    by_chapter,
    by_difficulty,
  };
}

function buildSuggestions(warnings, chapter_weights, pool) {
  const suggestions = [];
  if (warnings.some((w) => w.includes('insufficient_pool'))) {
    suggestions.push(
      'Add more questions to the bank for the sections that are underfilled, or relax section weights.'
    );
  }
  if (warnings.some((w) => w.includes('underfilled'))) {
    suggestions.push(
      'Lower total marks or widen chapter/difficulty distribution if the bank cannot reach the target.'
    );
  }
  const lowHard = pool.filter((q) => normalizeDifficulty(q.difficulty) === 'hard').length;
  if (lowHard === 0) {
    suggestions.push('No hard questions in the pool for this filter; add hard items or reduce hard percentage.');
  }
  return suggestions;
}

module.exports = {
  DIFFICULTIES,
  SECTION_WEIGHT_KEYS,
  normalizeDifficulty,
  normalizeQuestionType,
  canonicalToDbType,
  validateSectionWeights,
  allocateIntegerMarksFromPercents,
  buildProposal,
  buildTotals,
  buildSuggestions,
  computeAggregatesFromSelection,
};

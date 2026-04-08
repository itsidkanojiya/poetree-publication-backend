# Backend: Question Difficulty + Smart Paper Generation

This document is the **backend-only** contract for:

1. Storing **difficulty** (`easy`, `medium`, `hard`) on every question.
2. Exposing **filters** on question list APIs so the app can build balanced papers.
3. A **smart paper proposal** endpoint that balances **chapters**, **difficulty**, and **section (question type)** targets, avoids **duplicate** questions, and returns **marks** totals plus **warnings/suggestions** when the question bank cannot satisfy the targets.

The frontend (React) will call these APIs after this backend work is deployed.

---

## 1. Database: `difficulty` on questions

### 1.1 Column

| Column       | Type                                                                      | Notes                                        |
| ------------ | ------------------------------------------------------------------------- | -------------------------------------------- |
| `difficulty` | `ENUM('easy','medium','hard')` **or** `VARCHAR(10)` with check constraint | Required for **new** inserts; see migration. |

### 1.2 Migration for existing rows

- Set all existing questions to `medium` (recommended), **or** allow `NULL` and treat `NULL` as `medium` in all queries and in the smart generator.

### 1.3 Validation on write

- **POST** `/api/question/add` and **PUT** `/api/question/edit/:id` (multipart): accept field `difficulty` with value `easy` | `medium` | `hard`.
- Reject invalid values with **400** and a clear message.
- If the product requires difficulty on every new question, enforce it for `add`; for `edit`, allow omit only if you keep DB default.

---

## 2. Question APIs: response shape and filters

### 2.1 Every question object in list/detail responses should include (minimum)

| Field                                           | Type             | Description                                                                                   |
| ----------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------- |
| `question_id` (or `id` per existing convention) | number           | Primary key                                                                                   |
| `type`                                          | string           | e.g. `mcq`, `short`, `long`, `blank`, `truefalse`, `passage`, `match`, … (match existing app) |
| `marks`                                         | number           | Marks for that question                                                                       |
| `chapter_id`                                    | number \| null   | Already used by frontend                                                                      |
| `subject_id`                                    | number           |                                                                                               |
| `subject_title_id`                              | number           |                                                                                               |
| `board_id`                                      | number           |                                                                                               |
| `standard`                                      | number \| string | Match existing schema                                                                         |
| `difficulty`                                    | string           | `easy` \| `medium` \| `hard`                                                                  |

### 2.2 Extend `GET /api/question` (or equivalent list endpoint)

Support **query parameters** (ignore unknown params for backward compatibility):

| Parameter          | Description                                                |
| ------------------ | ---------------------------------------------------------- |
| `type`             | Existing: question type                                    |
| `chapter_id`       | Existing: single id or comma-separated list                |
| `difficulty`       | **New:** `easy`, `medium`, `hard`, or comma-separated list |
| `subject_title_id` | **Recommended:** filter pool to one syllabus               |
| `board_id`         | **Recommended:** filter pool                               |
| `standard`         | **Recommended:** filter pool                               |

**Behaviour:** Return only questions matching **all** supplied filters (AND). Empty result is valid.

---

## 3. New endpoint: Smart paper proposal

### 3.1 Purpose

Given targets for **total marks**, **chapter mix**, **difficulty mix**, and **section (type) mix**, return a **proposed ordered list of question IDs** (no duplicates) that the client can then pass into the existing paper/template creation flow. The backend should compute **actual** marks and mix percentages and emit **warnings** and **human-readable suggestions** when targets cannot be met.

### 3.2 Method and path (suggested)

**POST** `/api/papers/smart-propose`

- Auth: same as other teacher/admin paper APIs (Bearer token).
- Content-Type: `application/json`

(If routing prefers `POST /api/question/smart-paper`, use that consistently; the frontend will be updated to match.)

### 3.3 Request body (JSON)

| Field                  | Type     | Required | Description                                                     |
| ---------------------- | -------- | -------- | --------------------------------------------------------------- |
| `subject_title_id`     | number   | yes      | Syllabus / book scope                                           |
| `board_id`             | number   | yes      |                                                                 |
| `standard`             | number   | yes      | Class/standard                                                  |
| `total_marks`          | number   | yes      | e.g. `80`                                                       |
| `chapter_weights`      | array    | yes      | See below                                                       |
| `difficulty_weights`   | object   | yes      | Percentages for `easy`, `medium`, `hard` (sum must be **100**)  |
| `section_weights`      | object   | yes      | Percentages of **total marks** per section; see mapping below   |
| `exclude_question_ids` | number[] | no       | Questions to never include (e.g. already used in another paper) |

**`chapter_weights` item:**

```json
{ "chapter_id": 1, "percent": 20 }
```

- Sum of `percent` across items should be **100**. If not, backend may **normalize** to 100 or return **400** with message (choose one behaviour and document it in the error).

**`difficulty_weights` example:**

```json
{ "easy": 30, "medium": 40, "hard": 30 }
```

- Keys: `easy`, `medium`, `hard`. Values: non-negative integers summing to **100**.

**`section_weights` (canonical keys — all eight):**

| Key            | Description                          |
| -------------- | ------------------------------------ |
| `mcq`          | Multiple choice                      |
| `blank`        | Fill in the blanks                   |
| `true_false`   | True / false (`truefalse` in DB → normalize) |
| `onetwo`       | One–two sentence answers             |
| `short`        | Short answer                         |
| `long`         | Long answer                          |
| `passage`      | Passage-based                        |
| `match`        | Match the following                  |

**Rules:**

- Every key listed above **must** be present in the JSON object (value may be `0`).
- Values are non-negative numbers (integers recommended). **Sum of all eight values must equal 100.**
- Semantics: **percent of total paper marks** allocated to that question type.
- Types with **weight `0`**: do not select any question of that type; you may omit fetching that pool.
- **Unknown keys** in `section_weights`: reject with **400** and a clear message (recommended), or ignore unknown keys (document which behaviour you implement).

**Example (all types):**

```json
{
  "mcq": 20,
  "blank": 5,
  "true_false": 5,
  "onetwo": 5,
  "short": 20,
  "long": 40,
  "passage": 0,
  "match": 5
}
```

**Full example:**

```json
{
  "subject_title_id": 12,
  "board_id": 1,
  "standard": 10,
  "total_marks": 80,
  "chapter_weights": [
    { "chapter_id": 1, "percent": 20 },
    { "chapter_id": 2, "percent": 30 },
    { "chapter_id": 3, "percent": 50 }
  ],
  "difficulty_weights": {
    "easy": 30,
    "medium": 40,
    "hard": 30
  },
  "section_weights": {
    "mcq": 20,
    "blank": 5,
    "true_false": 5,
    "onetwo": 5,
    "short": 20,
    "long": 40,
    "passage": 0,
    "match": 5
  },
  "exclude_question_ids": []
}
```

### 3.4 Algorithm expectations (implementation detail — backend choice)

The implementation is **backend-defined**, but behaviour should satisfy:

1. **Pool:** All questions matching `subject_title_id`, `board_id`, `standard`, excluding `exclude_question_ids`. Only include types with **positive** `section_weights` (weight `0` → exclude that type from the pool).
2. **No repetition:** Each `question_id` at most once in the proposal.
3. **Section marks:** Selected questions’ marks per `type` should approximate `section_weights` × `total_marks` / 100 (integer marks — exact match may be impossible; see tolerance below).
4. **Chapter mix:** The **distribution of marks or question count** across chapters should approximate `chapter_weights` (document whether you balance by **marks** or **count**; **marks** is preferred for board-style papers).
5. **Difficulty mix:** Across the whole paper, the **count** or **marks** share per difficulty should approximate `difficulty_weights` (document whether count-based or marks-based; be consistent in responses).

**Tolerance:** If exact totals are impossible, get as close as possible and report in `warnings`.

Suggested approaches: multi-phase greedy, integer partitioning, or small constraint solvers — **not** prescribed here.

### 3.5 Response body (JSON) — 200 OK

| Field         | Type     | Description                                                    |
| ------------- | -------- | -------------------------------------------------------------- |
| `success`     | boolean  | `true` if at least one question returned                       |
| `questions`   | array    | Ordered list of selected questions (see item shape below)      |
| `totals`      | object   | Actual aggregates vs targets (see below)                       |
| `warnings`    | string[] | Machine-oriented short messages                                |
| `suggestions` | string[] | User-facing hints, e.g. “Add more hard questions in Chapter 2” |

**`questions[]` item (minimum):**

```json
{
  "question_id": 101,
  "type": "mcq",
  "marks": 2,
  "chapter_id": 1,
  "difficulty": "easy",
  "order": 1
}
```

- `order` is 1-based sequence in the final paper.

**`totals` (example structure — adjust to match your style):**

Include **`by_section`** entries for **every** canonical type in `section_weights` (including zeros if you want a fixed shape), or only non-zero types — be consistent in your API docs.

```json
{
  "total_marks": 80,
  "by_section": {
    "mcq": { "target_percent": 20, "actual_marks": 16, "actual_percent": 20 },
    "blank": { "target_percent": 5, "actual_marks": 4, "actual_percent": 5 },
    "true_false": { "target_percent": 5, "actual_marks": 4, "actual_percent": 5 },
    "onetwo": { "target_percent": 5, "actual_marks": 4, "actual_percent": 5 },
    "short": {
      "target_percent": 20,
      "actual_marks": 18,
      "actual_percent": 22.5
    },
    "long": { "target_percent": 40, "actual_marks": 46, "actual_percent": 57.5 },
    "passage": { "target_percent": 0, "actual_marks": 0, "actual_percent": 0 },
    "match": { "target_percent": 5, "actual_marks": 4, "actual_percent": 5 }
  },
  "by_chapter": [
    {
      "chapter_id": 1,
      "target_percent": 20,
      "actual_marks": 14,
      "actual_percent": 17.5
    }
  ],
  "by_difficulty": {
    "easy": { "target_percent": 30, "actual_percent": 28 },
    "medium": { "target_percent": 40, "actual_percent": 45 },
    "hard": { "target_percent": 30, "actual_percent": 27 }
  }
}
```

Use **consistent** percent basis (marks vs count) in `by_difficulty` and document in this README for the frontend.

### 3.6 Error responses

| Code    | When                                                                                                                          |
| ------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 400     | Invalid body (sums ≠ 100, missing fields, unknown chapter_id)                                                                 |
| 401/403 | Auth failure                                                                                                                  |
| 404     | No questions in pool for given filters                                                                                        |
| 422     | Pool non-empty but **cannot** build any paper (optional; or return 200 with empty `questions` and explanations in `warnings`) |

---

## 4. Optional: Question bank statistics

**GET** `/api/question/stats`

Query: `subject_title_id`, `board_id`, `standard` (required combination as per your auth rules).

**Response (example):**

```json
{
  "by_difficulty": { "easy": 120, "medium": 200, "hard": 15 },
  "by_type": {
    "mcq": 150,
    "blank": 40,
    "true_false": 35,
    "onetwo": 60,
    "short": 100,
    "long": 85,
    "passage": 12,
    "match": 20
  },
  "by_chapter": [
    { "chapter_id": 1, "count": 40 },
    { "chapter_id": 2, "count": 35 }
  ]
}
```

Used by the admin UI for “Smart suggestions” before generating a paper.

---

## 5. Integration with existing paper/template save

- The app already creates templates via **POST** `/api/papers/templates/create` with `body` (JSON string of question structure) and mark fields.
- **Smart-propose** does **not** replace that endpoint; it only returns **which `question_id`s** to include and in what order. The client will build `body` / metadata the same way as manual selection.

---

## 6. Acceptance checklist (backend)

- [ ] `difficulty` column migrated; add/edit validate enum.
- [ ] List/detail questions include `difficulty`.
- [ ] `GET /question` supports `difficulty` and scoped filters (`subject_title_id`, `board_id`, `standard`) as agreed.
- [ ] `POST /papers/smart-propose` implements pool filtering, no duplicates, section/chapter/difficulty balancing, `totals`, `warnings`, `suggestions`.
- [ ] Errors documented and JSON-shaped consistently with the rest of the API.

---

## 7. Version note

Frontend will add: difficulty fields on upload forms, extended `getQuestionsByType` query params, and a “Smart paper” step that calls `POST /papers/smart-propose` then applies the result to template creation **after** this backend is available.

---

## 8. Implementation (this repository)

This section documents behaviour **in this codebase** (`poetree-publication-backend-main`).

| Area | Details |
| ---- | ------- |
| **Difficulty column** | Migration `migrations/20260403000000-add-question-difficulty.js`; optional auto-`ALTER` on startup in `src/config/db.js` (`ensureQuestionDifficultyColumn`) if the column is missing. |
| **Model** | `src/models/Question.js` — `difficulty` enum, default `medium`. |
| **Write** | `POST /api/question/add` requires `difficulty`; `PUT /api/question/edit/:id` validates when provided. |
| **List** | `GET /api/question` — includes `difficulty`; `difficulty` query param (comma-separated); AND filters with `subject_title_id`, `board_id`, `standard`. |
| **Smart propose** | `POST /api/papers/smart-propose` — `authMiddleware` via `verifyToken` in `src/routes/paperRoutes.js`. Handler: `paperController.smartPropose`. Logic: `src/services/smartPaperPropose.js`. |
| **section_weights** | All **eight** keys required; sum **100**; **unknown keys → 400** with `errors` array. `true_false` in JSON maps to DB `truefalse` for queries. |
| **chapter_weights** | If sum ≠ 100, **normalized** and a **warning** is appended. |
| **Balancing** | Section, chapter, and difficulty targets use **marks**; `totals.by_difficulty.actual_percent` is **% of total paper marks** (marks-based). `totals.by_section` keys are **canonical** (eight keys). |
| **questions[]** | `type` is the **stored DB** value (e.g. `truefalse`). |
| **Stats** | `GET /api/question/stats` — `verifyToken`; `by_type` uses **canonical** keys (same eight). |
| **SQL script** | `scripts/add-question-difficulty.sql` — manual migration if the app cannot alter DB. |

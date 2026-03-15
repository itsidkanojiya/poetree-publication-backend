# Frontend: Chapter API and Usage

This document describes all API changes for **Chapter** support so the frontend can implement worksheet, answer sheet, paper (custom), template, and question flows with chapters.

---

## 1. Chapter entity

- Chapters are **per Subject Title** (each subject title has its own list of chapters).
- **Table**: `chapters` with `chapter_id`, `chapter_name`, `subject_title_id`.

---

## 2. Chapter APIs

### 2.1 List chapters by subject title

**GET** `/api/chapters?subject_title_id=:id`

**Query**

| Param              | Type   | Required | Description                    |
|--------------------|--------|----------|--------------------------------|
| `subject_title_id` | number | Yes      | Subject title ID (e.g. from dropdown). |

**Response (200)**

```json
{
  "success": true,
  "chapters": [
    { "chapter_id": 1, "chapter_name": "Linear Equations", "subject_title_id": 5 },
    { "chapter_id": 2, "chapter_name": "Quadratic Equations", "subject_title_id": 5 }
  ]
}
```

**Usage:** Call after user selects a subject title; use `chapters` for a chapter dropdown (add question, add worksheet, add answer sheet, add paper).

---

### 2.2 Create chapter

**POST** `/api/chapters`

**Body (JSON)**

| Field              | Type   | Required | Description                    |
|--------------------|--------|----------|--------------------------------|
| `chapter_name`     | string | Yes      | Display name (max 200 chars).  |
| `subject_title_id` | number | Yes      | Subject title this chapter belongs to. |

**Response (201)**

```json
{
  "success": true,
  "message": "Chapter created successfully",
  "chapter": {
    "chapter_id": 3,
    "chapter_name": "New Chapter",
    "subject_title_id": 5
  }
}
```

**Usage:** “Add chapter” when no suitable chapter exists for the selected subject title; then use returned `chapter_id` in add question / worksheet / answer sheet / paper.

---

## 3. Questions

### 3.1 Add question

**POST** `/api/question` (or your existing add-question endpoint)

**Body**

- **Required (existing):** `subject_title_id`, `subject_id`, `standard`, `board_id`, `question`, `type`, `marks`.
- **Required (new):** `chapter_id` (number). Must be a chapter that belongs to the selected `subject_title_id`.

**Validation:** If `chapter_id` is missing or invalid or does not belong to the chosen subject title, backend returns 400/404.

**Response:** Question object includes `chapter_id` and (in list/get) `chapter: { chapter_id, chapter_name }`.

---

### 3.2 Get all questions (chapter filter is optional)

**GET** `/api/question` (or your existing get-questions endpoint)

**Chapter behaviour**

- **All chapters:** Omit the `chapter_id` query parameter. You get questions from every chapter (and any with `chapter_id` null). No chapter filter is applied.
- **One chapter:** Send `chapter_id=5` to get only questions in that chapter.
- **Multiple chapters:** Send `chapter_id=1,2,3` (comma-separated) to get questions in any of those chapters.

**Query (optional filters)**

| Param           | Type   | Required | Description |
|----------------|--------|----------|-------------|
| `subject_id`   | number | No       | Filter by subject ID |
| `subject_title_id` | number | No  | Filter by subject title ID |
| `standard`     | number | No       | Filter by standard |
| `board_id`     | number or comma-separated | No | Filter by board ID(s) |
| `chapter_id`   | number or comma-separated | No | Filter by one or more chapter IDs. **Omit to get questions from all chapters.** |
| `type`         | string or comma-separated | No | Filter by type (e.g. mcq, short, long) |
| `marks`        | number or comma-separated | No | Filter by marks |

**Response (200)**

```json
{
  "success": true,
  "count": 2,
  "questions": [
    {
      "question_id": 1,
      "subject_id": 1,
      "subject_title_id": 5,
      "standard": 10,
      "chapter_id": 1,
      "question": "What is the value of x in 2x + 3 = 7?",
      "answer": "A",
      "solution": "2x = 4, so x = 2.",
      "type": "mcq",
      "options": ["2", "3", "4", "5"],
      "marks": 1,
      "board_id": 1,
      "subject": {
        "subject_id": 1,
        "subject_name": "Mathematics"
      },
      "subject_title": {
        "subject_title_id": 5,
        "title_name": "Algebra"
      },
      "board": {
        "board_id": 1,
        "board_name": "CBSE"
      },
      "chapter": {
        "chapter_id": 1,
        "chapter_name": "Linear Equations"
      },
      "image_url": "http://localhost:3000/uploads/question-1.png"
    },
    {
      "question_id": 2,
      "subject_id": 1,
      "subject_title_id": 5,
      "standard": 10,
      "chapter_id": null,
      "question": "Solve for y...",
      "answer": "B",
      "solution": null,
      "type": "mcq",
      "options": ["1", "2", "3", "4"],
      "marks": 1,
      "board_id": 1,
      "subject": { "subject_id": 1, "subject_name": "Mathematics" },
      "subject_title": { "subject_title_id": 5, "title_name": "Algebra" },
      "board": { "board_id": 1, "board_name": "CBSE" },
      "chapter": null,
      "image_url": null
    }
  ]
}
```

- `chapter_id`: number or null (for older questions without a chapter).
- `chapter`: `{ chapter_id, chapter_name }` or `null`.
- For `type === "passage"`, `answer` may be a parsed object instead of a string.
- `image_url`: full URL when present; otherwise `null`.

---

### 3.3 Edit question

**PUT** `/api/question/:id`

**Body:** Can include `chapter_id` (number or null). If provided, must exist and belong to the question’s subject title (or the updated `subject_title_id`).

---

## 4. Papers (custom)

### 4.1 Add paper (custom)

**POST** `/api/papers/add` (or your existing add-paper endpoint)

**Body**

- **Optional (single chapter):** `chapter_id` (number). If provided, must exist and belong to the paper’s `subject_title_id`.
- **Optional (multiple chapters):** `chapter_ids` (array of numbers, e.g. `[1, 2, 3]`). If provided, each ID must exist and belong to the paper’s `subject_title_id`. You can send either `chapter_id` or `chapter_ids` (or both; `chapter_ids` takes precedence if both present).

**Response:** Paper object includes `chapter_id` (first chapter, for backward compatibility) and `chapter_ids` (array of chapter IDs, e.g. `[1, 2, 3]`).

**CURL example (create paper with chapter_ids):**

```bash
curl -X POST "http://localhost:3000/api/papers/add" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "user_id": 5,
    "type": "custom",
    "standard": 10,
    "date": "2025-03-15",
    "subject": "Mathematics",
    "subject_title_id": 3,
    "board": "CBSE",
    "paper_title": "Unit Test",
    "body": "[10,11,12]",
    "chapter_ids": [1, 2, 3]
  }'
```

### 4.2 Update paper

**PUT** `/api/papers/:id`

**Body:** May include `chapter_id` (single number) or `chapter_ids` (array). To clear chapters, send `chapter_ids: []`. Same validation as add.

**Response:** Paper includes `chapter_id` and `chapter_ids` (array).

---

## 5. Templates

### 5.1 Create template

**POST** `/api/papers/templates/create` (admin)

**Body**

- **Optional:** `chapter_id` (number) or `chapter_ids` (array of numbers). Same validation as paper; each must belong to the template’s `subject_title_id`.

**Response:** Template includes `chapter_id` and `chapter_ids` (array).

---

## 6. Worksheets

### 6.1 Add worksheet

**POST** `/api/worksheets` (with multipart/form-data for files)

**Body (form fields)**

- **New (optional):** `chapter_id` (number). If provided, must exist and belong to the selected `subject_title_id`.

**Response:** Worksheet object includes `chapter_id` (and in list, `chapter`).

---

### 6.2 Get all worksheets

**GET** `/api/worksheets`

**Query (additional)**

| Param         | Type   | Required | Description           |
|--------------|--------|----------|-----------------------|
| `chapter_id` | number | No       | Filter by chapter ID. |

**Response:** Each worksheet includes:

- `chapter_id` (number or null).
- `chapter`: `{ chapter_id, chapter_name }` or `null`.

---

## 7. Answer sheets

### 7.1 Add answer sheet

**POST** `/api/answersheets` (with multipart/form-data for files)

**Body (form fields)**

- **New (optional):** `chapter_id` (number). If provided, must exist and belong to the selected `subject_title_id`.

**Response:** Answer sheet object includes `chapter_id`.

---

### 7.2 Get all answer sheets

**GET** `/api/answersheets`

**Query (additional)**

| Param         | Type   | Required | Description           |
|--------------|--------|----------|-----------------------|
| `chapter_id` | number | No       | Filter by chapter ID. |

**Response:** Each answer sheet includes:

- `chapter_id` (number or null).
- `chapter`: `{ chapter_id, chapter_name }` or `null`.

---

## 8. Animations

Animations (admin-only) support an optional **chapter**. When adding or editing an animation, the selected chapter must belong to the animation’s subject title.

### 8.1 Add animation

**POST** `/api/animations` (admin, body JSON)

**Body (additional optional)**

| Field        | Type   | Required | Description                                                |
|-------------|--------|----------|------------------------------------------------------------|
| `chapter_id`| number | No       | If provided, must exist and belong to `subject_title_id`. |

**Response:** Animation object includes `chapter_id` and `chapter: { chapter_id, chapter_name, subject_title_id }` when present.

### 8.2 Update animation

**PUT** `/api/animations/:id` (admin)

**Body:** May include `chapter_id` (number or omit to leave unchanged; send `null` or empty to clear).

### 8.3 Get all animations

**GET** `/api/animations`

**Query (optional)**

| Param         | Type   | Required | Description           |
|--------------|--------|----------|------------------------|
| `chapter_id`| number | No       | Filter by chapter ID. |

**Response:** Each animation includes `chapter_id` and `chapter` (when present).

---

## 9. Summary for frontend

| Feature            | Chapter required? | Filter by chapter?     | Notes                                      |
|--------------------|-------------------|------------------------|--------------------------------------------|
| Add question       | Yes               | Yes (get questions)    | Use GET /api/chapters?subject_title_id=X   |
| Add paper (custom) | No (optional)     | —                      | Same chapters API for dropdown             |
| Create template    | No (optional/null)| —                      | Same chapters API for dropdown             |
| Add worksheet      | No (optional)     | Yes (get worksheets)   | Same chapters API for dropdown             |
| Add answer sheet   | No (optional)     | Yes (get answersheets) | Same chapters API for dropdown             |
| Add / edit animation | No (optional)   | Yes (GET /api/animations?chapter_id=) | Admin only; chapter must match subject title |

**Recommended flow**

1. When user selects **Subject** then **Subject Title**, call **GET /api/chapters?subject_title_id=:id** and show a chapter dropdown (and optional “Add chapter” that calls POST /api/chapters).
2. **Add question:** Require user to select a chapter (from that dropdown); send `chapter_id` in body.
3. **Add worksheet / answer sheet / paper / template:** Optionally show chapter dropdown and send `chapter_id` when selected.
4. **Add / edit animation (admin):** Optionally show chapter dropdown after subject title; send `chapter_id` when selected; chapter must belong to the animation’s subject title.
5. **List questions / worksheets / answer sheets / animations:** Optionally add a chapter filter (query param `chapter_id`) and show `chapter_id` / `chapter.chapter_name` in each row.

---

## 10. Database migration

Backend adds:

- Table `chapters` (`chapter_id`, `chapter_name`, `subject_title_id`).
- Column `chapter_id` (nullable, FK to `chapters`) on: `questions`, `papers`, `worksheets`, `answersheets`, `animations`.
- Column `chapter_ids` (TEXT, nullable) on: `papers` — stores a JSON array of chapter IDs for multiple chapters.

Run migrations (or one-off scripts if needed):

```bash
npx sequelize-cli db:migrate
# or
node scripts/run-chapters-migration.js
# For animations.chapter_id (after chapters exist):
node scripts/add-animations-chapter-id.js
# For papers.chapter_ids (single or multiple chapters):
node scripts/add-papers-chapter-ids.js
```

If your backend provides a one-off script path, use that when Sequelize CLI is not used.

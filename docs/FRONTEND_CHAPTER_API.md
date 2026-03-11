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

### 3.2 Get all questions (filter by chapter)

**GET** `/api/question` (or your existing get-questions endpoint)

**Query (additional)**

| Param        | Type   | Required | Description                          |
|-------------|--------|----------|--------------------------------------|
| `chapter_id`| number or comma-separated | No | Filter by one or more chapter IDs.   |

**Response:** Each question includes:

- `chapter_id` (number or null for old data).
- `chapter`: `{ chapter_id, chapter_name }` or `null`.

---

### 3.3 Edit question

**PUT** `/api/question/:id`

**Body:** Can include `chapter_id` (number or null). If provided, must exist and belong to the question’s subject title (or the updated `subject_title_id`).

---

## 4. Papers (custom)

### 4.1 Add paper (custom)

**POST** `/api/papers` (your existing add-paper endpoint)

**Body**

- **New (optional):** `chapter_id` (number). If provided, must exist and match the paper’s subject title when `subject_title_id` is set.

**Response:** Paper object includes `chapter_id` (null if not sent).

---

## 5. Templates

### 5.1 Create template

**POST** `/api/papers` (or your template-creation endpoint)

**Body**

- **New (optional):** `chapter_id` (number or null). Same validation as paper; can be omitted or null for “no chapter” / multiple chapters later.

**Response:** Template includes `chapter_id`.

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

## 8. Summary for frontend

| Feature            | Chapter required? | Filter by chapter?     | Notes                                      |
|--------------------|-------------------|------------------------|--------------------------------------------|
| Add question       | Yes               | Yes (get questions)    | Use GET /api/chapters?subject_title_id=X   |
| Add paper (custom) | No (optional)     | —                      | Same chapters API for dropdown             |
| Create template    | No (optional/null)| —                      | Same chapters API for dropdown             |
| Add worksheet      | No (optional)     | Yes (get worksheets)   | Same chapters API for dropdown             |
| Add answer sheet   | No (optional)     | Yes (get answersheets) | Same chapters API for dropdown             |

**Recommended flow**

1. When user selects **Subject** then **Subject Title**, call **GET /api/chapters?subject_title_id=:id** and show a chapter dropdown (and optional “Add chapter” that calls POST /api/chapters).
2. **Add question:** Require user to select a chapter (from that dropdown); send `chapter_id` in body.
3. **Add worksheet / answer sheet / paper / template:** Optionally show chapter dropdown and send `chapter_id` when selected.
4. **List questions / worksheets / answer sheets:** Optionally add a chapter filter (query param `chapter_id`) and show `chapter_id` / `chapter.chapter_name` in each row.

---

## 9. Database migration

Backend adds:

- Table `chapters` (`chapter_id`, `chapter_name`, `subject_title_id`).
- Column `chapter_id` (nullable, FK to `chapters`) on: `questions`, `papers`, `worksheets`, `answersheets`.

Run migrations (or the one-off script if needed):

```bash
npx sequelize-cli db:migrate
# or
node scripts/run-chapters-migration.js
```

If your backend provides a one-off script path, use that when Sequelize CLI is not used.

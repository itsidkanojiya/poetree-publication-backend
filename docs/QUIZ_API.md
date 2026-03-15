# Quiz API (Model 1 – Printable Quiz)

All quiz endpoints are under **`/api/quiz`** and require **Bearer token** authentication. Quiz is **teacher-only** in the UI: do not show the Quiz section to admin. Teachers can access only their own quizzes.

---

## Endpoints

### GET /api/quiz/suggest-mcq

Returns MCQ questions from the bank matching the given filters (for the teacher to pick when creating a quiz).

**Query parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| subject_id | number | No | Filter by subject ID |
| subject_title_id | number | No | Filter by subject title ID |
| chapter_id | number or comma-separated | No | Filter by one or more chapter IDs. **Omit to get questions from all chapters.** |
| standard | number | No | Filter by standard |
| board_id | number | No | Filter by board ID |
| count | number | No | Max number of questions to return (default 20, max 100) |

**Response (200)**

```json
{
  "success": true,
  "count": 10,
  "questions": [
    {
      "question_id": 1,
      "subject_id": 1,
      "subject_title_id": 1,
      "standard": 10,
      "board_id": 1,
      "chapter_id": 1,
      "question": "What is...",
      "answer": "A",
      "type": "mcq",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "marks": 1,
      "image_url": "http://..."
    }
  ]
}
```

---

### GET /api/quiz/:paperId

Returns the quiz (paper) with type `quiz` and its resolved questions in body order. **403** if the user is not the owner and not admin.

**Response (200)**

```json
{
  "success": true,
  "paper": {
    "id": 1,
    "user_id": 5,
    "type": "quiz",
    "paper_title": "Math Quiz 1",
    "standard": 10,
    "subject": "Mathematics",
    "board": "CBSE",
    "date": "2025-02-28",
    "school_name": "...",
    "address": "...",
    "logo": "..."
  },
  "questions": [
    {
      "question_id": 1,
      "question": "...",
      "answer": "A",
      "type": "mcq",
      "options": ["A", "B", "C", "D"],
      "marks": 1,
      "image_url": null
    }
  ]
}
```

---

### GET /api/quiz/:paperId/paper-pdf

Returns the **student quiz PDF** (questions + options; no answers). **Content-Type:** application/pdf. **403** if not allowed to access this quiz.

---

### GET /api/quiz/:paperId/answer-key

Returns the **answer key PDF**. **403** if not allowed to access this quiz.

---

### GET /api/quiz/:paperId/omr-sheet

Returns the **OMR bubble sheet PDF** (one row per question, A/B/C/D circles). **403** if not allowed to access this quiz.

---

## Creating a quiz (paper)

Create a quiz by creating a **paper** with `type: 'quiz'`:

- **POST** `/api/papers/add` (with auth as needed by your app)
- **Body (JSON):**  
  `user_id`, `type: 'quiz'`, `standard`, `date`, `subject`, `board`, `body`, `paper_title`, and optionally `subject_title_id`, `chapter_id` (single) or `chapter_ids` (array).  
  `body` = JSON string of an array of question IDs, e.g. `"[1,2,3,4,5]"`.

**CURL example – create quiz (no chapters):**

```bash
curl -X POST "http://localhost:3000/api/papers/add" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "user_id": 5,
    "type": "quiz",
    "standard": 10,
    "date": "2025-03-15",
    "subject": "Mathematics",
    "board": "CBSE",
    "paper_title": "Math Quiz 1",
    "body": "[1,2,3,4,5]"
  }'
```

**CURL example – create quiz with single chapter (`chapter_id`):**

```bash
curl -X POST "http://localhost:3000/api/papers/add" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "user_id": 5,
    "type": "quiz",
    "standard": 10,
    "date": "2025-03-15",
    "subject": "Mathematics",
    "subject_title_id": 3,
    "board": "CBSE",
    "paper_title": "Math Quiz 1",
    "body": "[1,2,3,4,5]",
    "chapter_id": 1
  }'
```

**CURL example – create quiz with multiple chapters (`chapter_ids`):**

```bash
curl -X POST "http://localhost:3000/api/papers/add" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "user_id": 5,
    "type": "quiz",
    "standard": 10,
    "date": "2025-03-15",
    "subject": "Mathematics",
    "subject_title_id": 3,
    "board": "CBSE",
    "paper_title": "Math Quiz 1",
    "body": "[1,2,3,4,5]",
    "chapter_ids": [1, 2, 3]
  }'
```

**CURL example – create custom paper with `chapter_ids`:**

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
    "paper_title": "Unit Test Ch 1–3",
    "body": "[10,11,12,13,14]",
    "chapter_ids": [1, 2, 3]
  }'
```

Notes:
- Use either `chapter_id` (single number) or `chapter_ids` (array of numbers). If both are sent, `chapter_ids` takes precedence.
- When sending `chapter_id` or `chapter_ids`, `subject_title_id` should be set; each chapter must belong to that subject title.
- Omit `chapter_id` and `chapter_ids` if the paper is not tied to specific chapters.

See [FRONTEND_QUIZ_MODEL1_UI_GUIDE.md](FRONTEND_QUIZ_MODEL1_UI_GUIDE.md) for full UI and flow.

---

## Listing quizzes

- **GET** `/api/papers/user/:userId?type=quiz` with `userId` = logged-in teacher’s ID. (Quiz is teacher-only; do not expose quiz listing to admin.)

Papers with `type: 'quiz'` are quizzes.

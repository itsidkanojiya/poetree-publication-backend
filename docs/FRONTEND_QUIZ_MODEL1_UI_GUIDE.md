# Frontend UI Guide: Model 1 – Printable Quiz

This guide describes the **screens, user flow, and API usage** for the Quiz Creation Engine (Model 1). **Quiz is for teachers only:** do not show the Quiz section (list, create, edit, export) to admin. Use it alongside the backend plan and API docs. All API calls require **Bearer token** authentication.

---

## 1. Who sees Quiz (teacher only)

- **Teacher (user):** Show the full Quiz flow: “My Quizzes” list, Create quiz, Edit quiz, Quiz detail, and PDF downloads. Use `user_id` from token (or profile) in list and create requests. Teacher can only access their own quizzes.
- **Admin:** Do **not** show the Quiz section at all. No quiz list, no create quiz, no view/edit/delete/export for admin. Admins use the rest of the app (user management, subject requests, etc.) but do not see or use Quiz.

**Auth**

- Backend identifies role via JWT (e.g. `user_type === 'admin'` vs `'user'`). Frontend should store role after login and **only show Quiz menu/pages when the user is a teacher** (e.g. `user_type === 'user'`). Do not render Quiz routes or links for admin.

---

## 2. Screens / Pages

| Screen | Purpose |
|--------|--------|
| **Quiz list** | My quizzes (papers with `type: 'quiz'`). Show title, subject, date, question count. Actions: Open, Delete, Export (dropdown). |
| **Create quiz** | Wizard or single form: set filters, get suggested MCQs, pick questions, set quiz metadata, save. |
| **Edit quiz** | Same as create but pre-filled; allow add/remove questions and change metadata. |
| **Quiz detail / Preview** | Show quiz metadata and full list of questions (with options). Buttons: Download Student PDF, Answer Key, OMR Sheet. |

You can combine **Create** and **Edit** into one "Quiz form" page with create vs edit mode.

---

## 3. User flow (step-by-step)

1. **Teacher goes to "Create Quiz"** (or "Quizzes" → "New Quiz").
2. **Set filters:** Subject, Subject title, Chapter (optional), Standard, Board. Optionally "Number of MCQs" (e.g. 10).
3. **Get suggested MCQs:** Click **"Suggest MCQs"** or **"Auto-fill"**. Frontend calls **GET /api/quiz/suggest-mcq** with current filters + `count`. Show returned questions in a list (question text + options; **hide answer**).
4. **Select questions:** Teacher checks/unchecks which questions to include. Optionally reorder (drag or up/down). Store selected `question_id`s in state.
5. **Set quiz metadata:** Quiz title, date, timing (optional). Use logged-in user for school_name/logo if backend expects it.
6. **Save quiz:** **POST /api/papers** with `type: 'quiz'`, `body: JSON.stringify(selectedQuestionIds)`, plus standard, subject, board, date, paper_title, etc. On success, redirect to Quiz detail or Quiz list.
7. **Export:** On Quiz detail (or from list row actions), offer three actions:
   - **Download Student PDF** → GET /api/quiz/:paperId/paper-pdf (Accept: application/pdf), open in new tab or trigger download.
   - **Download Answer Key** → GET /api/quiz/:paperId/answer-key, same.
   - **Download OMR Sheet** → GET /api/quiz/:paperId/omr-sheet, same.

---

## 4. API → UI mapping

| UI action | Method | Endpoint | Request | Response / use |
|-----------|--------|----------|---------|----------------|
| Suggest MCQs | GET | /api/quiz/suggest-mcq | Query: subject_id, subject_title_id, chapter_id, standard, board_id, count | List of questions; show in picker. |
| Save new quiz | POST | /api/papers | Body: type='quiz', body=[...questionIds], standard, subject, board, date, paper_title, user_id, ... | 201 + paper; navigate to quiz detail. |
| Update quiz | PUT | /api/papers/:id | Body: same as create (partial ok) | 200; refresh quiz detail. |
| List my quizzes | GET | /api/papers/user/:userId?type=quiz | Use logged-in user’s id as userId | List of papers; show in table/cards. |
| Get quiz with questions | GET | /api/quiz/:paperId or /api/papers/:id/with-questions | - | Paper + questions[]; use for preview and before export. |
| Download student PDF | GET | /api/quiz/:paperId/paper-pdf | - | PDF file; Content-Disposition may be inline or attachment. |
| Download answer key | GET | /api/quiz/:paperId/answer-key | Optional: ?format=json | PDF (or JSON if format=json). |
| Download OMR sheet | GET | /api/quiz/:paperId/omr-sheet | - | PDF file. |

Use **Authorization: Bearer &lt;token&gt;** for all requests. For PDF endpoints, open URL in new window with same auth or use fetch with blob and create object URL for download.

---

## 5. UI components checklist

- **Filters block:** Dropdowns (or async selects) for Subject, Subject title, Chapter, Standard, Board. Load options from existing APIs (subjects, subject titles, chapters, standards, boards).
- **"Suggest MCQs" button:** Calls suggest-mcq; shows loading state; then displays result list.
- **Question picker:** List of questions with checkbox (and optional reorder). Show question text and options (A/B/C/D); **do not show correct answer**. Store `question_id` array for body.
- **Quiz metadata form:** Quiz title (paper_title), Date, optional Timing. Pre-fill from user profile for school name if needed.
- **Save / Update button:** Submit to POST /api/papers or PUT /api/papers/:id. Show success toast and redirect or refresh.
- **Quiz list:** Rows/cards with quiz title, subject, date, number of questions. Actions: View/Edit, Delete, Export (menu: Student PDF, Answer Key, OMR Sheet).
- **Quiz detail / Preview:** Display all questions in order (from GET quiz with questions). Three buttons: "Download Student PDF", "Download Answer Key", "Download OMR Sheet".

---

## 6. Downloading PDFs with auth

- **Option A:** Use the PDF URL with token in query (if backend supports): `GET /api/quiz/123/paper-pdf?token=...`. Then use `<a href="..." download>` or `window.open(...)`.
- **Option B:** Fetch with credentials, get blob, create object URL, trigger download (e.g. `<a download>` with blob URL). Ensure request includes Authorization header.

---

## 7. Error handling (frontend)

- **400:** Show validation message (e.g. "Select at least one question", "Fill required fields").
- **401:** Redirect to login.
- **403:** Show "Not allowed".
- **404:** "Quiz not found" or "Paper not found".
- **500:** Show generic error and optionally retry.

---

## 8. Optional enhancements (UI)

- **Preview before save:** Show how many questions selected and total marks; optional live preview of first few questions.
- **Duplicate quiz:** Copy existing quiz (GET paper with questions, then POST new paper with same body and metadata).
- **Print all:** One button that opens all three PDFs in new tabs so teacher can print together.

---

## 9. Reference: backend endpoints (once implemented)

- GET /api/quiz/suggest-mcq?subject_id=&subject_title_id=&chapter_id=&standard=&board_id=&count=
- GET /api/quiz/:paperId (or /api/papers/:id/with-questions) → paper + questions
- GET /api/quiz/:paperId/paper-pdf → student quiz PDF
- GET /api/quiz/:paperId/answer-key → answer key PDF (?format=json optional)
- GET /api/quiz/:paperId/omr-sheet → OMR sheet PDF  
- POST /api/papers (body: type='quiz', body=[...], ...)
- PUT /api/papers/:id
- GET /api/papers/user/:userId?type=quiz (teacher: use own userId)

All require authentication. **Do not show Quiz to admin.** Use this guide together with the backend plan (Model 1: Printable Quiz) for full implementation.

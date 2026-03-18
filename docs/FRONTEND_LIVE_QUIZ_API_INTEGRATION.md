# Live Quiz (Model 2) – Frontend Integration Guide

Use this document to implement the **Teacher-Led Live Quiz** feature. It includes the flow, screens, and full API reference. Base URL for all APIs: your backend host (e.g. `http://localhost:4000`). **Quiz and Live Quiz are for teachers only** — do not show to admin.

---

## 1. Flow overview

- Teacher has a **quiz** (Model 1 paper with `type: 'quiz'`). From Quiz list or Quiz detail, they click **“Start live quiz”**.
- Backend creates a **live session** and returns `sessionId` (and optionally `sessionCode`). Teacher is taken to the **Control view**.
- **Control view** (teacher, authenticated): shows current question, **Previous** / **Next**, **Reveal answer**, **End session**. Option to open **Projector view** in a new tab.
- **Projector view** and **Student view**: show the same current question and options; when teacher reveals, show the answer. **No login** for projector/student; they use a **public** API with `sessionId` or `sessionCode`. Poll every 2–3 seconds.
- When teacher clicks **End session**, all views show “Quiz ended”.

---

## 2. Screens and routes (suggested)

| Screen | Route (example) | Who | Auth |
|--------|------------------|-----|------|
| Quiz list / Quiz detail | (existing Model 1) | Teacher | JWT |
| **Start live quiz** | Button on list or detail | Teacher | JWT |
| Control view | `/live/session/:sessionId` or `/live/:sessionId/control` | Teacher | JWT |
| Projector view | `/live/:sessionId/projector` or `?view=projector` | Teacher opens; class watches | None (public) |
| Student view | `/live/:sessionCode` or `/live/public/:sessionId` | Students | None (public) |
| Session ended | Same routes; show “Quiz ended” when `status === 'ended'` | All | - |

---

## 3. API reference

All teacher control endpoints (except public) require **Bearer token** in header:

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

Public endpoints (projector/student view) do **not** send any auth.

---

### 3.1 Start live session

**Request**

```http
POST /api/live/start
Content-Type: application/json
Authorization: Bearer <token>
```

**Body**

```json
{
  "paperId": 123
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| paperId | number | Yes | Quiz paper ID (Model 1 paper with `type: 'quiz'`). Teacher must own this quiz. |

**Success response** `201 Created`

```json
{
  "sessionId": "uuid-or-numeric-id",
  "sessionCode": "ABC12X"
}
```

| Field | Description |
|-------|-------------|
| sessionId | Use in control view URL and in all session APIs. |
| sessionCode | Optional. Short code for student URL (e.g. `/live/ABC12X`). |

**Errors**

- `400` – Invalid or missing `paperId`.
- `403` – Not allowed (not owner of quiz or not teacher).
- `404` – Quiz not found or not a quiz paper.

**Frontend:** On 201, navigate to Control view: e.g. `/live/session/${response.sessionId}`.

---

### 3.2 Get session state (teacher / control view)

**Request**

```http
GET /api/live/session/:sessionId
Authorization: Bearer <token>
```

**Success response** `200 OK`

```json
{
  "status": "active",
  "sessionId": "uuid-or-numeric-id",
  "sessionCode": "ABC12X",
  "paper_title": "Math Quiz 1",
  "currentQuestionIndex": 0,
  "questions": [
    {
      "question_id": 1,
      "question": "What is 2 + 2?",
      "answer": "A",
      "type": "mcq",
      "options": { "A": "4", "B": "3", "C": "5", "D": "2" },
      "marks": 1,
      "image_url": null
    }
  ],
  "revealedQuestionIndices": [0, 2]
}
```

| Field | Description |
|-------|-------------|
| status | `"active"` or `"ended"`. When `"ended"`, show “Quiz ended” and optionally hide controls. |
| sessionId, sessionCode | Echo for UI (e.g. show session code for students). |
| paper_title | Quiz title. |
| currentQuestionIndex | 0-based index of the current question. |
| questions | Full list of questions (in order). Same shape as Model 1 quiz questions. |
| revealedQuestionIndices | Array of 0-based indices for which the answer has been revealed. For each question at index `i`, if `revealedQuestionIndices.includes(i)` then show the correct answer. |

**Frontend:** Use for Control view: show `questions[currentQuestionIndex]`, and for each question show answer only if its index is in `revealedQuestionIndices`. Poll this every 2–3 s if you want live sync, or after each teacher action.

**Errors**

- `403` – Not the session owner.
- `404` – Session not found.

---

### 3.3 Set current question (Previous / Next)

**Request**

```http
PATCH /api/live/session/:sessionId/current
Content-Type: application/json
Authorization: Bearer <token>
```

**Body**

```json
{
  "questionIndex": 2
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| questionIndex | number | Yes | 0-based index. Must be between 0 and questions.length - 1. |

**Success response** `200 OK`

- Body can be empty or echo updated state. Frontend can then GET session state again or use optimistic update.

**Errors**

- `400` – Invalid or out-of-range `questionIndex`.
- `403` – Not the session owner.
- `404` – Session not found.

**Frontend:** Call this when teacher clicks **Next** or **Previous** (e.g. `currentQuestionIndex + 1` or `- 1`).

---

### 3.4 Reveal answer

**Request**

```http
POST /api/live/session/:sessionId/reveal
Content-Type: application/json
Authorization: Bearer <token>
```

**Body**

```json
{
  "questionIndex": 1
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| questionIndex | number | No | 0-based index. If omitted, backend uses current question index. |

**Success response** `200 OK`

- Backend adds this index to `revealedQuestionIndices`. Projector/student view will see it on next poll.

**Errors**

- `400` – Invalid index (if provided).
- `403` – Not the session owner.
- `404` – Session not found.

**Frontend:** Call when teacher clicks **Reveal answer** (optionally pass current question index or omit to use current).

---

### 3.5 End session

**Request**

```http
POST /api/live/session/:sessionId/end
Authorization: Bearer <token>
```

**Body:** None.

**Success response** `200 OK`

- Session `status` becomes `"ended"`. All views (control, projector, student) should show “Quiz ended” when they next get session state.

**Errors**

- `403` – Not the session owner.
- `404` – Session not found.

**Frontend:** Call when teacher clicks **End session**; then show “Quiz ended” and link back to quiz list/detail.

---

### 3.6 Get public session state (projector / student view, no auth)

Use these so projector and student views can show the same content **without** sending the teacher’s token. Poll every 2–3 seconds.

**Option A – by session ID**

```http
GET /api/live/public/:sessionId
```

**Option B – by session code (if backend supports it)**

```http
GET /api/live/public/code/:sessionCode
```

Example: `GET /api/live/public/ABC12X` if backend uses `sessionCode` in the path.

**Success response** `200 OK`

Same shape as **Get session state** (see 3.2), e.g.:

```json
{
  "status": "active",
  "sessionId": "...",
  "sessionCode": "ABC12X",
  "paper_title": "Math Quiz 1",
  "currentQuestionIndex": 1,
  "questions": [ ... ],
  "revealedQuestionIndices": [0]
}
```

- When `status === "ended"`, show “Quiz ended” / “Thank you” and optionally stop polling.

**Errors**

- `404` – Session not found (or invalid code). Show “Session not found” or “Quiz ended”.

**Frontend:**  
- **Projector view:** Open in new tab with URL like `/live/:sessionId/projector`. Page calls `GET /api/live/public/:sessionId` (or `/public/code/:sessionCode`) on load and every 2–3 s.  
- **Student view:** Same; URL can be `/live/:sessionCode` so students type a short code. Page uses `GET /api/live/public/code/:sessionCode`.

---

## 4. Quick API summary

| Action | Method | Endpoint | Auth | Body |
|--------|--------|----------|------|------|
| Start session | POST | `/api/live/start` | Bearer | `{ "paperId": number }` |
| Get state (control) | GET | `/api/live/session/:sessionId` | Bearer | - |
| Set current question | PATCH | `/api/live/session/:sessionId/current` | Bearer | `{ "questionIndex": number }` |
| Reveal answer | POST | `/api/live/session/:sessionId/reveal` | Bearer | `{ "questionIndex"?: number }` |
| End session | POST | `/api/live/session/:sessionId/end` | Bearer | - |
| Public state (projector/student) | GET | `/api/live/public/:sessionId` or `/api/live/public/code/:sessionCode` | None | - |

---

## 5. UI checklist

- **Quiz list / detail:** Add **“Start live quiz”** (or “Run live”) only for teacher and only for own quizzes. On success, navigate to `/live/session/:sessionId`.
- **Control view:** Show “Question X of N”, question text, options (hide answer until index is in `revealedQuestionIndices`). Buttons: **Previous**, **Next**, **Reveal answer**, **End session**. Link/button: **Open projector view** (new tab with projector URL). Poll GET session or refetch after each action.
- **Projector view:** Full-screen; large text. Same data as control but read-only; poll public session state every 2–3 s. When `status === 'ended'`, show “Quiz ended”.
- **Student view:** Same as projector; URL by `sessionCode` or `sessionId`; no login; poll public API.
- **Session ended:** On all views, when `status === 'ended'`, show “Quiz ended” / “Thank you”. Control view can show a link back to quiz list.
- **Errors:** Handle 403/404 (session not found, not allowed, ended). Show message and link back to quiz list or home.

---

## 6. Who sees what

- **Teacher:** Quiz list + Quiz detail (Model 1) + **“Start live quiz”** + Control view + Projector view (own quizzes only).
- **Admin:** Do **not** show Quiz or Live Quiz.
- **Students / class:** Projector (shared by teacher) or Student view (public URL, no login). Read-only.

---

## 7. Optional

- **Session code:** If backend returns `sessionCode`, show it on Control view so teacher can share with students (e.g. “Students go to: yoursite.com/live/ABC12X”).
- **Rejoin:** If teacher closes the control tab, they can re-open `/live/session/:sessionId` with the same token to resume (backend allows owner to GET session while active).
- **Polling:** Start polling after page load; when `status === 'ended'` you can stop or slow down polling.

Use this guide together with [FRONTEND_QUIZ_MODEL2_UI_GUIDE.md](FRONTEND_QUIZ_MODEL2_UI_GUIDE.md) for full UI and flow details.

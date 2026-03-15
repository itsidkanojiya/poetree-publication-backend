# Frontend UI Guide: Model 2 – Teacher-Led Live Quiz

This guide plans the **screens, user flow, and API usage** for Model 2 (Teacher-Led Live Quiz). There is **no student login**: the teacher runs the quiz in class; students see questions on a shared display (e.g. projector) or on a simple public “student view” page. **Quiz and Live Quiz are for teachers only:** do not show this section to admin. All API calls for teacher control require **Bearer token** authentication.

---

## 1. Who sees Live Quiz (teacher only)

- **Teacher (user):** Can start a “Live quiz” session from an existing quiz (Model 1 paper with `type: 'quiz'`). Teacher sees: **control view** (current question, next / previous, reveal answer, end session) and can open **projector view** (full-screen, same content for the class). Teacher uses only their own quizzes.
- **Admin:** Do **not** show the Live Quiz section. No start session, no projector, no control view for admin.
- **Students:** No login. They either watch the projector/screen the teacher shares, or open a **public student view** URL (e.g. `/live/:sessionId` or `/live/:sessionCode`) that shows the same current question and (when revealed) the answer. Optional: backend may use a short-lived session code instead of session ID for easier sharing.

**Auth**

- Teacher: JWT as for Model 1. Only show “Start live quiz” / “Live quiz” when user is a teacher and only for quizzes they own.
- Student view: Typically **no auth**; session is identified by `sessionId` or `sessionCode` in the URL. Backend may validate that the session exists and is active.

---

## 2. Screens / Pages

| Screen | Purpose | Who |
|--------|---------|-----|
| **Quiz list or Quiz detail** | Entry point: add a **“Start live quiz”** (or **“Run live”**) button next to each quiz (or on quiz detail). | Teacher |
| **Live session – Control view** | Teacher’s control panel: current question index (e.g. 3 of 10), question text + options (answer hidden until “Reveal”). Buttons: **Previous**, **Next**, **Reveal answer**, **End session**. Optional: **Open projector view** (new tab/window). | Teacher |
| **Live session – Projector view** | Full-screen display of the **current question** (and options). After “Reveal answer”, show correct option. Same content as control view but optimized for large display (big font, high contrast). Can be the same route with a query e.g. `?view=projector` or a dedicated route `/live/:sessionId/projector`. | Teacher (opens) / Class (views) |
| **Student view (optional)** | Same content as projector view: current question + options, then answer when revealed. URL like `/live/:sessionCode` or `/live/:sessionId`. No login; read-only. | Students (any device) |
| **Session ended** | After teacher clicks “End session”, show a simple “Quiz ended” / “Thank you” screen on projector and student view. Control view can show “Session ended” and a link back to quiz list or quiz detail. | All |

You can combine **Control** and **Projector** into one page with a “Projector mode” toggle or a separate window.

---

## 3. User flow (step-by-step)

**Teacher**

1. From **Quiz list** or **Quiz detail** (Model 1), teacher clicks **“Start live quiz”** (or **“Run live”**) for a chosen quiz.
2. Frontend calls backend to **start a live session** (e.g. `POST /api/live/start` with `paperId`). Backend returns `sessionId` (and optionally `sessionCode`).
3. Teacher is taken to **Control view** (e.g. `/live/session/:sessionId` or `/live/:sessionId/control`). First question is shown (answer hidden).
4. Teacher shares screen (projector) or opens **Projector view** in a new tab (e.g. `/live/:sessionId/projector` or `?view=projector`). Students can also open **Student view** if you provide a URL (e.g. `/live/:sessionCode`).
5. Teacher uses **Next** / **Previous** to change the current question. Backend updates session state; projector and student views poll or use WebSocket to show the same question.
6. When ready, teacher clicks **Reveal answer**. Backend marks “answer revealed” for current question; all views update to show the correct option.
7. Repeat steps 5–6 until done. Teacher clicks **End session**. Backend marks session as ended; all views show “Quiz ended”.

**Students**

1. Watch the shared projector, or open the **Student view** URL (session code or link from teacher).
2. See current question and options; when teacher reveals, see the answer. No interaction required (optional: future extension for student responses).

---

## 4. API → UI mapping (expected backend)

Backend for Model 2 is **not yet implemented**. The table below is the **expected** API contract so the frontend can be planned. Implement backend accordingly or adjust frontend when APIs are defined.

| UI action | Method | Endpoint | Request | Response / use |
|-----------|--------|----------|---------|----------------|
| Start live session | POST | /api/live/start | Body: paperId (quiz paper ID) | 201 + sessionId, sessionCode (optional). Redirect to control view. |
| Get session state | GET | /api/live/session/:sessionId | - | Session metadata, currentQuestionIndex, questions[], revealedAnswers[] (or per-question revealed flag). Used by control view and by projector/student view. |
| Set current question | PATCH or PUT | /api/live/session/:sessionId/current | Body: questionIndex (0-based) | 200. Control view calls after Next/Previous. |
| Reveal answer | PATCH or POST | /api/live/session/:sessionId/reveal | Body: questionIndex (optional; default current) | 200. All views then show answer for that question. |
| End session | POST | /api/live/session/:sessionId/end | - | 200. Session marked ended; projector/student view show “Quiz ended”. |
| Public session state (no auth) | GET | /api/live/public/:sessionId or /api/live/public/code/:sessionCode | - | Same shape as session state (or minimal: current question + options + revealed). For projector/student view without teacher token. |

**Polling vs WebSocket**

- **Polling:** Frontend (projector view, student view) calls GET session state every few seconds (e.g. 2–3 s). Simple; works without WebSocket support.
- **WebSocket (optional):** Backend pushes state changes (current question, reveal, end). Low latency; better UX. Plan UI so it works with polling first; add WebSocket later if backend supports it.

---

## 5. UI components checklist

- **“Start live quiz” button:** On Quiz list row or Quiz detail. Only for teacher and only for own quizzes. Calls start-session API; redirects to control view.
- **Control view:** Shows current question index (e.g. “Question 3 of 10”), question text, options (answer hidden until revealed). Buttons: Previous, Next, Reveal answer, End session. Link or button: “Open projector view” (new tab).
- **Projector view:** Full-screen, large text. Displays current question + options; shows correct answer when revealed. Optional: “Quiz ended” when session ends. Prefer no navigation/chrome (or minimal).
- **Student view:** Same content as projector view; URL with sessionId or sessionCode; no login. Poll GET public session state.
- **Session ended:** Simple message (“Quiz ended” / “Thank you”) on all views when teacher ends the session.
- **Error handling:** Invalid session, session already ended, network errors. Show message and link back to quiz list or home.

---

## 6. Who sees what (summary)

- **Teacher:** Quiz list + Quiz detail (Model 1) + **“Start live quiz”** and **Control view** + **Projector view** (own quizzes only). No Live Quiz for admin.
- **Students / Class:** **Projector view** (shared by teacher) or **Student view** (public URL, no login). Read-only; no account needed.
- **Admin:** No Quiz, no Live Quiz.

---

## 7. Optional enhancements

- **Session code:** Short alphanumeric code (e.g. 6 chars) so students can type `yoursite.com/live/ABC123` instead of a long session ID.
- **Timer:** Optional per-question or total timer (backend or frontend); show on control and projector.
- **Rejoin:** If teacher closes control view by mistake, “Rejoin session” using same sessionId (and token) to resume control.
- **History:** List of past live sessions (backend would need to store sessions); show date, quiz title, duration. Optional for later.

---

## 8. Reference: expected backend endpoints (to implement)

- POST /api/live/start (body: paperId) → sessionId, sessionCode?
- GET /api/live/session/:sessionId (auth) → full session state
- GET /api/live/public/:sessionId or GET /api/live/public/code/:sessionCode (no auth) → current question + options + revealed state
- PATCH /api/live/session/:sessionId/current (body: questionIndex)
- PATCH or POST /api/live/session/:sessionId/reveal (body: questionIndex?)
- POST /api/live/session/:sessionId/end

Use this guide when implementing the Model 2 frontend and when designing the Model 2 backend APIs.

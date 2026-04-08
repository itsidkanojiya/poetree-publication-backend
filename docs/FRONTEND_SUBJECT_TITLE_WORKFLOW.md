# Frontend: Subject Title Workflow (Restructured)

**Audience:** Frontend developers / Cursor working on the frontend.  
**Purpose:** Align the UI with the backend’s restructured subject + subject title flow: cancel/remove behavior, admin approval payloads, and “no subject-only” rules.

Use this document to update the frontend so it works correctly with the current backend.

---

## 1. Summary of Backend Behavior

- **Cancel/Remove a subject title** → Backend **deletes** the row (pending or approved). It does **not** keep it as “rejected”; the title **disappears** from all lists after refresh.
- **Admin approval** → Only the **explicitly selected** subjects/titles are approved. Parent **Subject** is auto-approved when any of its **Subject Titles** are approved.
- **Subject-only requests** → **Not allowed.** Every subject must have at least one subject title. Backend returns `400` if `subject_titles` is missing or empty, or if a subject has no titles.

---

## 2. APIs You Must Use / Change

### 2.1 Signup – Require at least one subject title

**Endpoint:** `POST /api/auth/signup`

**Backend rules (enforced):**

- `subject_titles` must be a **non-empty array**. Subject-only signup is rejected.
- If `subjects` is sent, every `subject_id` in `subjects` must appear in at least one item in `subject_titles` (each subject must have at least one title).

**Frontend changes:**

- Do **not** allow the user to submit signup with only subjects and zero subject titles.
- Validate before submit: at least one subject title per selected subject.
- Send both `subjects` and `subject_titles` in the payload.

**Valid body example:**

```json
{
  "name": "...",
  "email": "...",
  "phone_number": "...",
  "username": "...",
  "password": "...",
  "school_name": "...",
  "school_address_state": "...",
  "school_address_pincode": "...",
  "school_address_city": "...",
  "school_principal_name": "...",
  "subjects": [1, 2],
  "subject_titles": [
    { "subject_id": 1, "subject_title_id": 101 },
    { "subject_id": 1, "subject_title_id": 102 },
    { "subject_id": 2, "subject_title_id": 201 }
  ]
}
```

**Errors you may get (400):**

- `"subject_titles are required. Subject-only signup is not allowed."`
- `"Each selected subject must include at least one selected subject title."` (with optional `missingTitleSubjects` array)
- `"Please select at least one subject title."`

---

### 2.2 User: Add/update selections (Subject Requests page)

**Endpoint:** `PUT /api/auth/my-selections`

**Backend rules (enforced):**

- `subject_titles` must be a **non-empty array**. Subject-only requests are rejected.
- If `subjects` is sent, every `subject_id` in `subjects` must have at least one entry in `subject_titles`.

**Frontend changes:**

- Do **not** allow submitting a request with only subjects and no subject titles.
- Validate: at least one subject title per subject before calling the API.

**Valid body example:**

```json
{
  "subjects": [1, 2],
  "subject_titles": [
    { "subject_id": 1, "subject_title_id": 101 },
    { "subject_id": 2, "subject_title_id": 201 }
  ]
}
```

**Errors you may get (400):**

- `"subject_titles are required. Subject-only requests are not allowed."`
- `"Each selected subject must include at least one selected subject title."` (with optional `missingTitleSubjects`)

---

### 2.3 User: Remove/cancel a subject title (so it disappears everywhere)

Two options; both remove the title **completely** (it will not reappear under Pending).

#### Option A – Recommended: New dedicated endpoint

**Endpoint:** `POST /api/auth/my-selections/remove-subject-title`

**Auth:** Bearer token (logged-in user).

**Body:**

```json
{
  "user_subject_title_ids": [22, 23]
}
```

- `user_subject_title_ids`: array of **row ids** (`user_subject_titles.id`) **or** master `subject_title_id`s. Backend tries row id first, then master id.

**Success (200):**

```json
{
  "message": "Subject title(s) removed successfully.",
  "removed": {
    "requested_ids": [22, 23],
    "deleted_subject_title_ids": [101, 102]
  },
  "user": {
    "id": 1,
    "subject": [1],
    "subject_title": [101]
  }
}
```

After success, refresh pending and approved lists (e.g. `GET /api/auth/my-selections/pending` and `GET /api/auth/my-selections/approved`). The removed title will no longer appear in either list.

#### Option B – Existing endpoint (already updated)

**Endpoint:** `POST /api/auth/my-selections/remove`

**Body:**

```json
{
  "user_subject_title_ids": [22]
}
```

The backend now **deletes** those subject title rows entirely (all statuses), so the title disappears from Pending and Approved. You can keep using this endpoint; just ensure you pass the **row id** (`user_subject_titles.id`) from the approved (or pending) item.

**Frontend change for “Remove” / “Cancel” button:**

- For **subject title** remove/cancel: call either
  - `POST /api/auth/my-selections/remove-subject-title` with `{ "user_subject_title_ids": [rowId] }`, or
  - `POST /api/auth/my-selections/remove` with `{ "user_subject_title_ids": [rowId] }`.
- Use the **row id** (`id` from `user_subject_titles`) that you get from:
  - `GET /api/auth/my-selections/approved` (e.g. `approved_selections.subject_titles[].id` or inside `grouped`),
  - or `GET /api/auth/my-selections` (e.g. `selections.subject_titles.approved[].id`).
- For **pending** subject titles, ensure the pending list API returns `id` (row id) for each item so the user can cancel pending titles with the same endpoint.
- After a successful remove/cancel, **refresh** pending and approved lists so the UI no longer shows that title.

---

### 2.4 Admin: Approve user selections (use master IDs)

**Endpoint:** `POST /api/admin/approve-selections/:userId`

**Important:** The backend treats:

- `subject_ids` → **row ids only** (`user_subjects.id`). If you send master subject IDs here, backend returns **400**.
- `subject_title_ids` → **row ids only** (`user_subject_titles.id`). If you send master subject title IDs here, backend returns **400**.

To approve by **master IDs** (subject_id and subject_title_id from the catalog), use:

- `approve_by_subject_ids` – array of **master** `subject_id`
- `approve_by_subject_title_ids` – array of **master** `subject_title_id`

**Frontend changes:**

- When the admin selects which **subjects/titles to approve** by their **catalog names/IDs** (master IDs), send:
  - `approve_by_subject_ids`: [ master subject_id, ... ]
  - `approve_by_subject_title_ids`: [ master subject_title_id, ... ]
- Do **not** send master IDs in `subject_ids` or `subject_title_ids` (those are for row ids only).

**Example (approve by master IDs):**

```json
{
  "approve_by_subject_ids": [1, 2],
  "approve_by_subject_title_ids": [101, 102, 201],
  "reject_others": false
}
```

**Example (approve by row IDs – if your UI uses junction row ids):**

```json
{
  "subject_ids": [10, 11],
  "subject_title_ids": [22, 23, 24],
  "reject_others": false
}
```

**Errors you may get (400):**

- `"No matching subject request rows found for given subject_ids. If you want to approve by master subject_id, send approve_by_subject_ids instead."`
- `"No matching subject title request rows found for given subject_title_ids. If you want to approve by master subject_title_id, send approve_by_subject_title_ids instead."`

---

### 2.5 Admin: Reject a single request (subject or subject title)

**Endpoint:** `POST /api/admin/subject-requests/:requestId/reject?type=subject|subject_title`

**Auth:** Admin Bearer token.

**URL:**

- `:requestId` = **row id** (`user_subjects.id` for a subject row, or `user_subject_titles.id` for a subject title row).
- Query: `type=subject` or `type=subject_title`.

**No body required.**

**Example – reject a subject title request:**

```
POST /api/admin/subject-requests/42/reject?type=subject_title
```

**Example – reject a subject request:**

```
POST /api/admin/subject-requests/15/reject?type=subject
```

**Success (200):**  
JSON with `message` and `request` (the updated row).

**Errors:**

- 400: invalid or missing `type` (must be `subject` or `subject_title`).
- 404: request row not found.

**Frontend:**  
Use the row `id` from the subject-requests list (e.g. from `GET /api/admin/subject-requests` or `GET /api/admin/user/:id/selections`) when calling this endpoint.

---

## 3. Where to Get IDs

| Use case                                    | Where to get the id                                                                                                                                                                                                                                                      |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Remove/cancel **subject title** (user)      | `GET /api/auth/my-selections/approved` → `approved_selections.subject_titles[].id` or from `grouped`; or `GET /api/auth/my-selections` → `selections.subject_titles.approved[].id`. For pending cancel, use pending list if the API returns `id` for each pending title. |
| Approve by **master** subject/title (admin) | From your dropdowns/catalog: `subject_id`, `subject_title_id`. Send them in `approve_by_subject_ids` and `approve_by_subject_title_ids`.                                                                                                                                 |
| Approve by **row** id (admin)               | `GET /api/admin/user/:id/selections` → `selections.subjects.pending[].id`, `selections.subject_titles.pending[].id`. Send in `subject_ids`, `subject_title_ids`.                                                                                                         |
| Reject a request (admin)                    | Same row `id` from the subject-requests or user selections response. Use in URL: `/api/admin/subject-requests/:requestId/reject?type=subject` or `type=subject_title`.                                                                                                   |

---

## 4. Checklist for Frontend Changes

- [ ] **Signup:** Require at least one subject title; validate “at least one title per subject” before submit. Do not send subject-only.
- [ ] **Subject Requests (user):** Same validation for “Create new request”: at least one subject title per subject; do not send subject-only.
- [ ] **Remove/Cancel subject title:**
  - Call `POST /api/auth/my-selections/remove-subject-title` with `{ "user_subject_title_ids": [ rowId ] }`, **or** keep using `POST /api/auth/my-selections/remove` with `user_subject_title_ids` (row ids).
  - After success, refresh pending and approved lists so the removed title disappears.
- [ ] **Pending list:** If the user can cancel **pending** subject titles, ensure the pending API response includes row `id` for each subject title and use the same remove endpoint(s) above.
- [ ] **Admin approve:** When approving by catalog/master IDs, send `approve_by_subject_ids` and `approve_by_subject_title_ids`. Do not send master IDs in `subject_ids` or `subject_title_ids`.
- [ ] **Admin reject:** Use `POST /api/admin/subject-requests/:requestId/reject?type=subject|subject_title` with the correct row `id` and `type`.

---

## 5. Quick API Reference

| Method | Endpoint                                                                    | Purpose                                                                                |
| ------ | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| GET    | `/api/auth/my-selections`                                                   | All selections (pending, approved, rejected)                                           |
| GET    | `/api/auth/my-selections/pending`                                           | Pending only                                                                           |
| GET    | `/api/auth/my-selections/approved`                                          | Approved only (with grouped view)                                                      |
| PUT    | `/api/auth/my-selections`                                                   | Add/update selections (requires `subject_titles` non-empty)                            |
| POST   | `/api/auth/my-selections/remove`                                            | Remove approved (and now: subject title rows deleted entirely)                         |
| POST   | `/api/auth/my-selections/remove-subject-title`                              | Remove subject title(s) by row or master id (deletes row)                              |
| GET    | `/api/admin/pending-users`                                                  | Pending users with selections                                                          |
| GET    | `/api/admin/user/:id/selections`                                            | User’s selections (pending/approved/rejected)                                          |
| GET    | `/api/admin/subject-requests`                                               | All subject requests grouped                                                           |
| POST   | `/api/admin/approve-selections/:id`                                         | Approve (use `approve_by_subject_ids` / `approve_by_subject_title_ids` for master IDs) |
| POST   | `/api/admin/subject-requests/:requestId/reject?type=subject\|subject_title` | Reject one request row                                                                 |

Base URL: your API base (e.g. `https://your-api.com` or relative `/api/...`). All auth endpoints need Bearer token; admin endpoints need admin token.

---

Use this document in the frontend repo (or with Cursor on the frontend) to implement the above changes so the UI matches the restructured subject title workflow.

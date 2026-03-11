# Frontend: Remove Approved Subject / Subject Title Selections

Users can now **remove** (revoke) their **approved** subject and subject-title selections. Previously, once approved, they could not be removed.

---

## 1. New API: Remove approved selections

**POST** `/api/auth/my-selections/remove`

**Auth:** Bearer token required (logged-in user).

**Body (JSON):**

| Field                 | Type    | Required | Description |
|-----------------------|---------|----------|-------------|
| `user_subject_ids`    | number[]| No*      | Array of **row ids** from `user_subjects` (the `id` of each approved subject selection to remove). |
| `user_subject_title_ids` | number[] | No*   | Array of **row ids** from `user_subject_titles` (the `id` of each approved subject-title selection to remove). |

*At least one of the two arrays must be present and non-empty.

**Example request:**

```json
{
  "user_subject_ids": [10, 11],
  "user_subject_title_ids": [22, 23]
}
```

**Success (200):**

```json
{
  "message": "Approved selection(s) removed successfully.",
  "removed": {
    "user_subject_ids": [10, 11],
    "user_subject_title_ids": [22, 23]
  }
}
```

**Error (400):** Both arrays missing or empty  
**Error (401):** Not logged in  
**Error (500):** Server error  

Only the **current user’s** rows can be removed, and only rows with status **approved**. Invalid or other users’ ids are ignored (no error; they are simply not deleted).

---

## 2. Where to get the ids

Use the **row id** (`id`) from:

- **GET /api/auth/my-selections** – `selections.subjects.approved[].id` and `selections.subject_titles.approved[].id`
- **GET /api/auth/my-selections/approved** – same ids inside the approved subject / subject_title items (e.g. in the `approved` arrays or inside `grouped`)

So:

- To remove an **approved subject**: send its `user_subjects.id` in `user_subject_ids`.
- To remove an **approved subject title**: send its `user_subject_titles.id` in `user_subject_title_ids`.

---

## 3. Suggested frontend flow

1. **List approved selections**  
   Call **GET /api/auth/my-selections/approved** (or GET /api/auth/my-selections) and show the list of approved subjects and subject titles.

2. **“Remove” action**  
   For each approved item, show a “Remove” (or “Revoke”) button. When the user clicks it (optionally with confirmation):
   - For a **subject**: `POST /api/auth/my-selections/remove` with `{ "user_subject_ids": [ that row’s id ] }`.
   - For a **subject title**: same with `{ "user_subject_title_ids": [ that row’s id ] }`.
   - You can also send multiple ids in one request to remove several at once.

3. **After success**  
   Refresh the list (e.g. call GET /api/auth/my-selections/approved again) or remove the item from local state. The backend has already updated the user’s approved list and the profile `subject` / `subject_title` arrays.

---

## 4. Quick reference: selection APIs (auth required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/auth/my-selections | All selections (pending, approved, rejected) |
| GET | /api/auth/my-selections/pending | Pending only |
| GET | /api/auth/my-selections/approved | Approved only (with grouped view) |
| PUT | /api/auth/my-selections | Add new selections (pending) – body: `subjects`, `subject_titles` |
| **POST** | **/api/auth/my-selections/remove** | **Remove approved selections** – body: `user_subject_ids`, `user_subject_title_ids` |

Base URL: same as your API (e.g. `https://your-api.com` or relative `/api/auth/...`).

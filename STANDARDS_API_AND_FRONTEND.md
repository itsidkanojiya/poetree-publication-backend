# Standards API – cURL examples & frontend prompt

Base URL: **http://localhost:4000** (replace with your API URL if different).

For **admin-only** requests (POST, PUT, DELETE), send the admin JWT in the header:
`Authorization: Bearer YOUR_ADMIN_TOKEN`

---

## 1. cURL examples (copy-paste for admin)

### Get all standards (no auth – use in dropdowns)
```bash
curl -X GET "http://localhost:4000/api/standards"
```

### Get one standard by ID
```bash
curl -X GET "http://localhost:4000/api/standards/1"
```

### Add a standard (admin)
```bash
curl -X POST "http://localhost:4000/api/standards" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d "{\"name\": \"Toddlers\", \"sort_order\": 1, \"type\": \"pre_primary\"}"
```

```bash
curl -X POST "http://localhost:4000/api/standards" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d "{\"name\": \"A\", \"sort_order\": 2, \"type\": \"pre_primary\"}"
```

```bash
curl -X POST "http://localhost:4000/api/standards" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d "{\"name\": \"B\", \"sort_order\": 3, \"type\": \"pre_primary\"}"
```

```bash
curl -X POST "http://localhost:4000/api/standards" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d "{\"name\": \"C\", \"sort_order\": 4, \"type\": \"pre_primary\"}"
```

```bash
curl -X POST "http://localhost:4000/api/standards" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d "{\"name\": \"1\", \"sort_order\": 5, \"type\": \"primary\"}"
```

(Repeat for "2" to "12" with sort_order 6–16, type "primary".)

### Edit a standard (admin)
```bash
curl -X PUT "http://localhost:4000/api/standards/1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d "{\"name\": \"Toddlers\", \"sort_order\": 1, \"type\": \"pre_primary\"}"
```

### Delete a standard (admin)
```bash
curl -X DELETE "http://localhost:4000/api/standards/1" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## 2. API summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/standards | No | List all standards (sorted by sort_order) |
| GET | /api/standards/:id | No | Get one standard by id |
| POST | /api/standards | Admin | Create standard (body: name, sort_order?, type?) |
| PUT | /api/standards/:id | Admin | Update standard (body: name?, sort_order?, type?) |
| DELETE | /api/standards/:id | Admin | Delete standard |

**Response (GET all):** `{ "success": true, "standards": [ { "standard_id": 1, "name": "Toddlers", "sort_order": 1, "type": "pre_primary" }, ... ] }`

**Usage elsewhere:** Subject/SubjectTitle still send `standard` as an **array of standard_id** (e.g. `[1,2,3,5]`). Questions, papers, worksheets, answer sheets send a single `standard` value as **standard_id** (integer). So everywhere that needs a “standard” option should load options from `GET /api/standards` and use `standard_id` when posting.

---

## 3. Frontend prompt (paste this for your frontend / admin UI)

Copy the block below and paste it where you implement the frontend (e.g. Cursor, ChatGPT, or to your frontend developer).

```
We have a new Standards API. Use it for all "standard" / "class" dropdowns and admin management.

API (base URL = your backend, e.g. http://localhost:4000):
- GET /api/standards → returns { success: true, standards: [ { standard_id, name, sort_order, type } ] } (sorted by sort_order). Use this to populate every standard dropdown (e.g. in subject/subject title forms, question form, paper form, worksheet, answer sheet, user profile). Display "name" to the user; when saving, send standard_id (or array of standard_ids for subject/subject title).
- GET /api/standards/:id → get one standard (optional).
- POST /api/standards → (admin only, Bearer token) create standard. Body: { name: string (required), sort_order?: number, type?: string }.
- PUT /api/standards/:id → (admin only) update standard. Body: { name?, sort_order?, type? }.
- DELETE /api/standards/:id → (admin only) delete standard.

Requirements:
1) Add an admin section "Manage Standards" where admin can:
   - List all standards (from GET /api/standards).
   - Add new standard (name, optional sort_order, optional type).
   - Edit existing standard (name, sort_order, type).
   - Delete a standard (with confirmation).
   Standards include pre-primary (e.g. Toddlers, A, B, C) and primary (1 to 12). Display order must follow sort_order from the API.

2) Replace any hardcoded standard options (e.g. [1,2,...,12]) across the app with a single source: fetch GET /api/standards and use the returned list for:
   - Subject create/edit: standard = array of standard_ids (multi-select).
   - Subject title create/edit: standard = array of standard_ids (multi-select).
   - Question create/edit: standard = one standard_id (single select).
   - Paper create/edit: standard = one standard_id (single select).
   - Worksheet / Answer sheet create: standard = one standard_id (single select).
   - User profile/settings: if standard is shown, use one standard_id (single select).
   Always show the "name" from the API to the user; send standard_id in the request body.

3) Keep existing API contracts: subject/subject title still send "standard" as array of numbers (standard_ids). Questions, papers, worksheets, answer sheets send "standard" as a single number (standard_id). No change to backend field names; only the options source is now GET /api/standards.
```

---

## 4. First-time setup (create standards 1–12 + Toddlers, A, B, C)

Run these after the backend is up and the `standards` table exists (restart server once so Sequelize creates the table).

Replace `YOUR_ADMIN_TOKEN` with a real admin JWT from login.

**Pre-primary:**
```bash
curl -X POST "http://localhost:4000/api/standards" -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_ADMIN_TOKEN" -d "{\"name\": \"Toddlers\", \"sort_order\": 1, \"type\": \"pre_primary\"}"
curl -X POST "http://localhost:4000/api/standards" -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_ADMIN_TOKEN" -d "{\"name\": \"A\", \"sort_order\": 2, \"type\": \"pre_primary\"}"
curl -X POST "http://localhost:4000/api/standards" -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_ADMIN_TOKEN" -d "{\"name\": \"B\", \"sort_order\": 3, \"type\": \"pre_primary\"}"
curl -X POST "http://localhost:4000/api/standards" -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_ADMIN_TOKEN" -d "{\"name\": \"C\", \"sort_order\": 4, \"type\": \"pre_primary\"}"
```

**Primary 1–12:**
```bash
for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
  curl -X POST "http://localhost:4000/api/standards" -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_ADMIN_TOKEN" -d "{\"name\": \"$i\", \"sort_order\": $((i+4)), \"type\": \"primary\"}"
done
```

On **Windows PowerShell** you can add one by one or use a loop; the single-curl commands above work as-is.

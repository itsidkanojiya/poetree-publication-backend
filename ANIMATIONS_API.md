# Animations API – YouTube links

Store and list YouTube videos with **subject, subject title, board, and standard** for the user-facing Animation section. No sort_order.

**Base URL:** `http://localhost:4000` (replace with your API URL).  
Admin write: use header `Authorization: Bearer YOUR_ADMIN_TOKEN`.

---

## Copy-paste cURL

Replace `http://localhost:4000` with your API URL, `YOUR_ADMIN_TOKEN` with admin JWT, and use real IDs for subject, subject_title, board, standard.

**User Animation page (no auth):**
```bash
curl -X GET "http://localhost:4000/api/animations"
```

**Get one animation (no auth):**
```bash
curl -X GET "http://localhost:4000/api/animations/1"
```

**Admin – Add animation (subject_id, subject_title_id, board_id, standard_id required):**
```bash
curl -X POST "http://localhost:4000/api/animations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d "{\"youtube_url\": \"https://www.youtube.com/watch?v=VIDEO_ID\", \"title\": \"My Animation\", \"subject_id\": 1, \"subject_title_id\": 1, \"board_id\": 1, \"standard_id\": 1}"
```

**Admin – Update animation:**
```bash
curl -X PUT "http://localhost:4000/api/animations/1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d "{\"title\": \"New title\", \"subject_id\": 1, \"subject_title_id\": 1, \"board_id\": 1, \"standard_id\": 2}"
```

**Admin – Delete animation:**
```bash
curl -X DELETE "http://localhost:4000/api/animations/1" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/animations | No | List all animations with subject, subject_title, board, standard |
| GET | /api/animations/:id | No | Get one animation |
| POST | /api/animations | Admin | Add (body: youtube_url, subject_id, subject_title_id, board_id, standard_id; title optional) |
| PUT | /api/animations/:id | Admin | Update (any of: youtube_url, title, subject_id, subject_title_id, board_id, standard_id) |
| DELETE | /api/animations/:id | Admin | Delete animation |

---

## Request/Response

**POST body (add):**
- `youtube_url` (required) – e.g. `https://www.youtube.com/watch?v=VIDEO_ID` or `https://youtu.be/VIDEO_ID`
- `subject_id` (required)
- `subject_title_id` (required)
- `board_id` (required)
- `standard_id` (required)
- `title` (optional)

**GET list response:** each animation includes subject, subject_title, board, standard (names for display):

```json
{
  "success": true,
  "animations": [
    {
      "animation_id": 1,
      "title": "My video",
      "youtube_url": "https://www.youtube.com/watch?v=abc123",
      "video_id": "abc123",
      "embed_url": "https://www.youtube.com/embed/abc123",
      "subject_id": 1,
      "subject_title_id": 1,
      "board_id": 1,
      "standard_id": 1,
      "subject": { "subject_id": 1, "subject_name": "Math" },
      "subject_title": { "subject_title_id": 1, "title_name": "Algebra" },
      "board": { "board_id": 1, "board_name": "CBSE" },
      "standard": { "standard_id": 1, "name": "10" },
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

Use `embed_url` in the frontend to show the video (e.g. `<iframe src="{embed_url}">`). Use `subject`, `subject_title`, `board`, `standard` to show and filter by subject, subject title, board, and standard.

---

## Database

Table is created automatically on server start (Sequelize sync). To create it manually, run `scripts/create_animations_table.sql` (requires subjects, subject_titles, boards, standards tables).

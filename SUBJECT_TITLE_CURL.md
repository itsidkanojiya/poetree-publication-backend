# Subject Title – cURL

Base URL: **http://localhost:4000**. Replace `YOUR_ADMIN_TOKEN` with admin JWT. Subject routes are under `/api`.

**Get subject titles filter:** By **subject** = yes. By **standard** = yes. You can use both together.

---

## Get all subject titles

**No filter:**
```bash
curl -X GET "http://localhost:4000/api/subjectTitle"
```

**Filter by subject only** (query param `subject_id`):
```bash
curl -X GET "http://localhost:4000/api/subjectTitle?subject_id=1"
```

**Filter by standard only** (query param `standard` = standard_id):
```bash
curl -X GET "http://localhost:4000/api/subjectTitle?standard=5"
```

**Filter by subject and standard:**
```bash
curl -X GET "http://localhost:4000/api/subjectTitle?subject_id=1&standard=5"
```

---

## Get subject titles by subject (path + optional standard)

Replace `1` with the subject id. Optionally add `?standard=5` to also filter by standard.

**Subject only:**
```bash
curl -X GET "http://localhost:4000/api/subject/1/titles"
```

**Subject and standard:**
```bash
curl -X GET "http://localhost:4000/api/subject/1/titles?standard=5"
```

---

## Add Subject Title

**POST** `/api/subjectTitle` (admin)

Body: `title_name` (string), `subject_id` (number), `standard` (array of standard_ids, e.g. `[1, 2, 3]`).

```bash
curl -X POST "http://localhost:4000/api/subjectTitle" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d "{\"title_name\": \"Algebra\", \"subject_id\": 1, \"standard\": [1, 2, 3, 4, 5]}"
```

---

## Delete Subject Title

**DELETE** `/api/subjectTitle/:id` (admin). Replace `1` with the subject title id.

```bash
curl -X DELETE "http://localhost:4000/api/subjectTitle/1" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

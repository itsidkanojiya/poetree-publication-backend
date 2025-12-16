# Question API Documentation

## Base URL
```
/api/question
```

All question APIs are available at the `/api/question` endpoint.

---

## Available APIs

### 1. **Add Question** (POST)
Create a new question (supports all 8 question types including `passage` and `match`)

**Endpoint:** `POST /api/question/add`

**Authentication:** Required (Admin only)

**Content-Type:** `multipart/form-data` (for file upload support)

**Request Body (Form Data):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `subject_title_id` | Integer | Yes | Subject title ID |
| `subject_id` | Integer | Yes | Subject ID |
| `standard` | Integer | Yes | Standard/Grade (1-12) |
| `board_id` | Integer | Yes | Board ID |
| `type` | String | Yes | Question type: `mcq`, `short`, `long`, `blank`, `onetwo`, `truefalse`, `passage`, `match` |
| `question` | String | Yes | Question text (or passage text for `passage` type) |
| `answer` | String | Yes | Answer (JSON string for structured answers) |
| `solution` | String | No | Solution/explanation |
| `options` | String/JSON | Conditional | Required for `mcq`, `passage`, `match` types |
| `marks` | Integer | Yes | Total marks |
| `image` | File | No | Image file (optional) |

**Example Request - Passage Question:**
```javascript
const formData = new FormData();
formData.append('subject_title_id', 1);
formData.append('subject_id', 1);
formData.append('standard', 10);
formData.append('board_id', 1);
formData.append('type', 'passage');
formData.append('marks', 10);
formData.append('question', 'Read the following passage and answer the questions that follow:\n\nOnce upon a time, in a small village, there lived a wise old man. He was known for his knowledge and kindness.');
formData.append('answer', JSON.stringify({
  q1: "Knowledge and kindness",
  q2: "For advice"
}));
formData.append('options', JSON.stringify([
  {
    question: "What was the old man known for?",
    answer: "Knowledge and kindness"
  },
  {
    question: "Why did villagers visit the old man?",
    answer: "For advice on various matters"
  }
]));
formData.append('solution', 'The passage describes a wise old man who helped villagers.');
// Optional: formData.append('image', imageFile);

fetch('/api/question/add', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: formData
});
```

**Example Request - Match Question:**
```javascript
const formData = new FormData();
formData.append('subject_title_id', 1);
formData.append('subject_id', 1);
formData.append('standard', 10);
formData.append('board_id', 1);
formData.append('type', 'match');
formData.append('marks', 5);
formData.append('question', 'Match the following:');
formData.append('answer', JSON.stringify({
  A: "1",
  B: "2",
  C: "3",
  D: "4"
}));
formData.append('options', JSON.stringify({
  left: ["A. Delhi", "B. Mumbai", "C. Kolkata", "D. Chennai"],
  right: ["1. Capital of India", "2. Financial Capital", "3. City of Joy", "4. Gateway of South"]
}));
// Optional: formData.append('image', imageFile);

fetch('/api/question/add', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: formData
});
```

**Success Response (201):**
```json
{
  "message": "Question added successfully",
  "question": {
    "question_id": 101,
    "subject_id": 1,
    "subject_title_id": 1,
    "standard": 10,
    "board_id": 1,
    "type": "passage",
    "question": "Read the following passage...",
    "answer": "{\"q1\": \"Knowledge and kindness\", \"q2\": \"For advice\"}",
    "solution": "The passage describes...",
    "options": "[{\"question\":\"What was the old man known for?\",\"answer\":\"Knowledge and kindness\"}]",
    "image_url": "uploads/question/passage/1234567890.jpg",
    "marks": 10
  }
}
```

**Error Response (400):**
```json
{
  "error": "Invalid question type"
}
```

**Error Response (400):**
```json
{
  "error": "Missing required fields"
}
```

---

### 2. **Get All Questions** (GET)
Retrieve questions with filtering options

**Endpoint:** `GET /api/question`

**Authentication:** Not required

**Query Parameters:**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `subject_id` | Integer/Array | Filter by subject ID(s) | `1` or `1,2,3` |
| `subject_title_id` | Integer/Array | Filter by subject title ID(s) | `1` or `1,2` |
| `standard` | Integer/Array | Filter by standard/grade | `10` or `9,10,11` |
| `board_id` | Integer/Array | Filter by board ID(s) | `1` or `1,2` |
| `type` | String/Array | Filter by question type | `passage` or `passage,match,mcq` |
| `marks` | Integer/Array | Filter by marks | `5` or `5,10` |

**Example Request:**
```javascript
// Get all passage questions for standard 10
fetch('/api/question?type=passage&standard=10')
  .then(res => res.json())
  .then(data => console.log(data));

// Get all match questions
fetch('/api/question?type=match')
  .then(res => res.json())
  .then(data => console.log(data));

// Get questions with multiple filters
fetch('/api/question?type=passage,match&standard=10&subject_id=1')
  .then(res => res.json())
  .then(data => console.log(data));
```

**Success Response (200):**
```json
{
  "success": true,
  "count": 2,
  "questions": [
    {
      "question_id": 101,
      "subject_id": 1,
      "subject_title_id": 1,
      "standard": 10,
      "board_id": 1,
      "type": "passage",
      "question": "Read the following passage...",
      "answer": "{\"q1\": \"Knowledge and kindness\", \"q2\": \"For advice\"}",
      "solution": "The passage describes...",
      "options": [
        {
          "question": "What was the old man known for?",
          "answer": "Knowledge and kindness"
        },
        {
          "question": "Why did villagers visit?",
          "answer": "For advice"
        }
      ],
      "marks": 10,
      "image_url": "http://localhost:3000/uploads/question/passage/1234567890.jpg",
      "subject": {
        "subject_id": 1,
        "subject_name": "English"
      },
      "subject_title": {
        "subject_title_id": 1,
        "title_name": "Literature"
      },
      "board": {
        "board_id": 1,
        "board_name": "CBSE"
      }
    },
    {
      "question_id": 102,
      "subject_id": 1,
      "subject_title_id": 1,
      "standard": 10,
      "board_id": 1,
      "type": "match",
      "question": "Match the following:",
      "answer": "{\"A\": \"1\", \"B\": \"2\", \"C\": \"3\", \"D\": \"4\"}",
      "solution": "Delhi is capital...",
      "options": {
        "left": ["A. Delhi", "B. Mumbai", "C. Kolkata", "D. Chennai"],
        "right": ["1. Capital of India", "2. Financial Capital", "3. City of Joy", "4. Gateway of South"]
      },
      "marks": 5,
      "image_url": "http://localhost:3000/uploads/question/match/9876543210.png",
      "subject": {
        "subject_id": 1,
        "subject_name": "English"
      },
      "subject_title": {
        "subject_title_id": 1,
        "title_name": "Geography"
      },
      "board": {
        "board_id": 1,
        "board_name": "CBSE"
      }
    }
  ]
}
```

**Note:** The `options` field is automatically parsed from JSON string to object/array in the response.

---

### 3. **Edit Question** (PUT)
Update an existing question

**Endpoint:** `PUT /api/question/edit/:id`

**Authentication:** Required (Admin only)

**Content-Type:** `multipart/form-data` (for file upload support)

**URL Parameters:**
- `id` - Question ID to update

**Request Body:** Same as Add Question (all fields optional except the ones you want to update)

**Example Request:**
```javascript
const formData = new FormData();
formData.append('type', 'passage');
formData.append('question', 'Updated passage text...');
formData.append('marks', 15); // Update marks
// Optional: formData.append('image', newImageFile);

fetch('/api/question/edit/101', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: formData
});
```

**Success Response (200):**
```json
{
  "message": "Question updated successfully",
  "question": {
    "question_id": 101,
    "type": "passage",
    "question": "Updated passage text...",
    "marks": 15,
    ...
  }
}
```

---

### 4. **Delete Question** (DELETE)
Delete a question and its associated image

**Endpoint:** `DELETE /api/question/delete/:id`

**Authentication:** Required (Admin only)

**URL Parameters:**
- `id` - Question ID to delete

**Example Request:**
```javascript
fetch('/api/question/delete/101', {
  method: 'DELETE',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
});
```

**Success Response (200):**
```json
{
  "message": "Question and image deleted successfully"
}
```

**Error Response (404):**
```json
{
  "message": "Question not found"
}
```

---

### 5. **Question Analysis** (GET)
Get statistics about question types

**Endpoint:** `GET /api/question/analysis`

**Authentication:** Not required

**Example Request:**
```javascript
fetch('/api/question/analysis')
  .then(res => res.json())
  .then(data => console.log(data));
```

**Success Response (200):**
```json
{
  "total": 150,
  "mcq": 50,
  "short": 30,
  "long": 20,
  "blank": 15,
  "onetwo": 10,
  "truefalse": 10,
  "passage": 10,
  "match": 5
}
```

---

## Question Type Specifications

### Passage Questions (`type: "passage"`)

**Required Fields:**
- `question`: The passage text
- `options`: Array of sub-questions (JSON string)
  ```json
  [
    {"question": "Q1 text", "answer": "A1"},
    {"question": "Q2 text", "answer": "A2"}
  ]
  ```
- `answer`: JSON string with all answers
  ```json
  {"q1": "answer1", "q2": "answer2"}
  ```

### Match Questions (`type: "match"`)

**Required Fields:**
- `question`: Usually "Match the following:"
- `options`: Object with left and right arrays (JSON string)
  ```json
  {
    "left": ["A. Item1", "B. Item2"],
    "right": ["1. Option1", "2. Option2"]
  }
  ```
- `answer`: JSON object mapping left to right
  ```json
  {"A": "1", "B": "2"}
  ```

---

## cURL Examples

### Add Passage Question:
```bash
curl -X POST http://localhost:3000/api/question/add \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "type=passage" \
  -F "subject_id=1" \
  -F "subject_title_id=1" \
  -F "standard=10" \
  -F "board_id=1" \
  -F "marks=10" \
  -F "question=Read the following passage..." \
  -F "answer={\"q1\":\"ans1\"}" \
  -F "options=[{\"question\":\"Q1?\",\"answer\":\"A1\"}]"
```

### Add Match Question:
```bash
curl -X POST http://localhost:3000/api/question/add \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "type=match" \
  -F "subject_id=1" \
  -F "subject_title_id=1" \
  -F "standard=10" \
  -F "board_id=1" \
  -F "marks=5" \
  -F "question=Match the following:" \
  -F "answer={\"A\":\"1\"}" \
  -F "options={\"left\":[\"A. Item1\"],\"right\":[\"1. Option1\"]}"
```

### Get All Passage Questions:
```bash
curl http://localhost:3000/api/question?type=passage
```

### Get Question Analysis:
```bash
curl http://localhost:3000/api/question/analysis
```

---

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created successfully |
| 400 | Bad Request (missing fields, invalid type) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (not admin) |
| 404 | Question not found |
| 500 | Internal Server Error |

---

## Notes

1. **File Upload**: Use `multipart/form-data` for requests with images
2. **JSON Strings**: For `options` and `answer` fields, send as JSON strings (not objects) in form data
3. **Image Storage**: Images are stored in `uploads/question/{type}/` directory
4. **Options Parsing**: Backend automatically parses JSON strings to objects/arrays when retrieving
5. **Filtering**: Multiple values can be comma-separated in query parameters


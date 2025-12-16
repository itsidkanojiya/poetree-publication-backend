# Question Upload Fields Reference

## Complete Field Reference for All Question Types

This document lists all **required** and **optional** fields when uploading questions.

---

## Common Fields (All Question Types)

### ✅ **Required Fields (All Types)**

These fields are **MANDATORY** for all question types:

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `subject_title_id` | Integer | Subject title ID | `1` |
| `subject_id` | Integer | Subject ID | `1` |
| `standard` | Integer | Grade/Standard (1-12) | `10` |
| `board_id` | Integer | Board ID | `1` |
| `type` | String | Question type | `"mcq"`, `"passage"`, `"match"`, etc. |
| `question` | String | Question text | `"What is 2+2?"` |
| `answer` | String | Answer text | `"4"` or JSON string |
| `marks` | Integer | Total marks | `5` |

### ⚪ **Optional Fields (All Types)**

These fields are **OPTIONAL** for all question types:

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `solution` | String | Solution/explanation | `"Add 2 and 2 to get 4"` |
| `image` | File | Image file upload | Image file (jpg, png, etc.) |

---

## Question Type Specific Fields

### 1. **MCQ** (`type: "mcq"`)

#### Required Fields:
- ✅ All common required fields
- ✅ **`options`** - Array of answer choices (JSON string)
  ```json
  ["Option A", "Option B", "Option C", "Option D"]
  ```

#### Optional Fields:
- ⚪ `solution`
- ⚪ `image`

#### Example:
```javascript
{
  // Required
  subject_title_id: 1,
  subject_id: 1,
  standard: 10,
  board_id: 1,
  type: "mcq",
  question: "What is the capital of India?",
  answer: "Delhi",
  marks: 1,
  options: JSON.stringify(["Mumbai", "Delhi", "Kolkata", "Chennai"]),
  
  // Optional
  solution: "Delhi has been the capital since 1911",
  image: imageFile
}
```

---

### 2. **Short Answer** (`type: "short"`)

#### Required Fields:
- ✅ All common required fields only

#### Optional Fields:
- ⚪ `options` (not used, but won't cause error)
- ⚪ `solution`
- ⚪ `image`

#### Example:
```javascript
{
  // Required
  subject_title_id: 1,
  subject_id: 1,
  standard: 10,
  board_id: 1,
  type: "short",
  question: "What is photosynthesis?",
  answer: "Process by which plants make food using sunlight",
  marks: 2,
  
  // Optional
  solution: "Photosynthesis converts light energy to chemical energy",
  image: imageFile
}
```

---

### 3. **Long Answer** (`type: "long"`)

#### Required Fields:
- ✅ All common required fields only

#### Optional Fields:
- ⚪ `options` (not used, but won't cause error)
- ⚪ `solution`
- ⚪ `image`

#### Example:
```javascript
{
  // Required
  subject_title_id: 1,
  subject_id: 1,
  standard: 10,
  board_id: 1,
  type: "long",
  question: "Explain the process of photosynthesis in detail.",
  answer: "Photosynthesis is the process... [detailed answer]",
  marks: 5,
  
  // Optional
  solution: "Detailed explanation with steps...",
  image: imageFile
}
```

---

### 4. **Fill in the Blank** (`type: "blank"`)

#### Required Fields:
- ✅ All common required fields only

#### Optional Fields:
- ⚪ `options` (not used, but won't cause error)
- ⚪ `solution`
- ⚪ `image`

#### Example:
```javascript
{
  // Required
  subject_title_id: 1,
  subject_id: 1,
  standard: 10,
  board_id: 1,
  type: "blank",
  question: "The capital of India is _____.",
  answer: "Delhi",
  marks: 1,
  
  // Optional
  solution: "Delhi is the capital city",
  image: imageFile
}
```

---

### 5. **One/Two Mark** (`type: "onetwo"`)

#### Required Fields:
- ✅ All common required fields only

#### Optional Fields:
- ⚪ `options` (not used, but won't cause error)
- ⚪ `solution`
- ⚪ `image`

#### Example:
```javascript
{
  // Required
  subject_title_id: 1,
  subject_id: 1,
  standard: 10,
  board_id: 1,
  type: "onetwo",
  question: "Define gravity.",
  answer: "Force that attracts objects towards each other",
  marks: 2,
  
  // Optional
  solution: "Gravity is a fundamental force...",
  image: imageFile
}
```

---

### 6. **True/False** (`type: "truefalse"`)

#### Required Fields:
- ✅ All common required fields only

#### Optional Fields:
- ⚪ `options` (not used, but won't cause error)
- ⚪ `solution`
- ⚪ `image`

#### Example:
```javascript
{
  // Required
  subject_title_id: 1,
  subject_id: 1,
  standard: 10,
  board_id: 1,
  type: "truefalse",
  question: "Delhi is the capital of India.",
  answer: "True",
  marks: 1,
  
  // Optional
  solution: "Delhi has been the capital since 1911",
  image: imageFile
}
```

---

### 7. **Passage** (`type: "passage"`) ⭐ NEW

#### Required Fields:
- ✅ All common required fields
- ✅ **`options`** - Array of sub-questions (JSON string)
  ```json
  [
    {"question": "Q1 text", "answer": "A1"},
    {"question": "Q2 text", "answer": "A2"}
  ]
  ```
- ✅ **`answer`** - JSON string with all answers
  ```json
  {"q1": "answer1", "q2": "answer2"}
  ```

#### Optional Fields:
- ⚪ `solution`
- ⚪ `image`

#### Example:
```javascript
{
  // Required
  subject_title_id: 1,
  subject_id: 1,
  standard: 10,
  board_id: 1,
  type: "passage",
  question: "Read the following passage and answer the questions that follow:\n\nOnce upon a time...",
  answer: JSON.stringify({
    q1: "Knowledge and kindness",
    q2: "For advice"
  }),
  marks: 10,
  options: JSON.stringify([
    {
      question: "What was the old man known for?",
      answer: "Knowledge and kindness"
    },
    {
      question: "Why did villagers visit?",
      answer: "For advice"
    }
  ]),
  
  // Optional
  solution: "The passage describes...",
  image: imageFile
}
```

---

### 8. **Match** (`type: "match"`) ⭐ NEW

#### Required Fields:
- ✅ All common required fields
- ✅ **`options`** - Object with left and right columns (JSON string)
  ```json
  {
    "left": ["A. Item1", "B. Item2"],
    "right": ["1. Option1", "2. Option2"]
  }
  ```
- ✅ **`answer`** - JSON object mapping left to right
  ```json
  {"A": "1", "B": "2"}
  ```

#### Optional Fields:
- ⚪ `solution`
- ⚪ `image`

#### Example:
```javascript
{
  // Required
  subject_title_id: 1,
  subject_id: 1,
  standard: 10,
  board_id: 1,
  type: "match",
  question: "Match the following:",
  answer: JSON.stringify({
    A: "1",
    B: "2",
    C: "3",
    D: "4"
  }),
  marks: 5,
  options: JSON.stringify({
    left: ["A. Delhi", "B. Mumbai", "C. Kolkata", "D. Chennai"],
    right: ["1. Capital of India", "2. Financial Capital", "3. City of Joy", "4. Gateway of South"]
  }),
  
  // Optional
  solution: "Delhi is capital, Mumbai is financial capital...",
  image: imageFile
}
```

---

## Quick Reference Table

| Question Type | Required Fields | Options Required? | Answer Format |
|---------------|----------------|-------------------|---------------|
| `mcq` | Common + `options` | ✅ Yes | String |
| `short` | Common only | ❌ No | String |
| `long` | Common only | ❌ No | String |
| `blank` | Common only | ❌ No | String |
| `onetwo` | Common only | ❌ No | String |
| `truefalse` | Common only | ❌ No | String |
| `passage` | Common + `options` | ✅ Yes | JSON String |
| `match` | Common + `options` | ✅ Yes | JSON String |

---

## Field Validation Rules

### Required Field Validation:
```javascript
// These fields are checked - if any missing, returns 400 error
if (!subject_title_id || !subject_id || !standard || !board_id || 
    !question || !answer || !type || !marks) {
  return res.status(400).json({ error: "Missing required fields" });
}
```

### Type Validation:
```javascript
// Valid types only
['mcq', 'short', 'long', 'blank', 'onetwo', 'truefalse', 'passage', 'match']
```

### Options Handling:
- For `mcq`, `passage`, `match`: `options` should be provided
- For other types: `options` is optional (ignored if provided)
- `options` is automatically JSON stringified if it's an array or object

---

## Complete Upload Example (FormData)

### For MCQ:
```javascript
const formData = new FormData();
formData.append('subject_title_id', 1);
formData.append('subject_id', 1);
formData.append('standard', 10);
formData.append('board_id', 1);
formData.append('type', 'mcq');
formData.append('question', 'What is 2+2?');
formData.append('answer', '4');
formData.append('marks', 1);
formData.append('options', JSON.stringify(['2', '3', '4', '5']));
formData.append('solution', 'Add 2 and 2'); // Optional
formData.append('image', imageFile); // Optional
```

### For Passage:
```javascript
const formData = new FormData();
formData.append('subject_title_id', 1);
formData.append('subject_id', 1);
formData.append('standard', 10);
formData.append('board_id', 1);
formData.append('type', 'passage');
formData.append('question', 'Read the following passage...');
formData.append('answer', JSON.stringify({q1: "ans1", q2: "ans2"}));
formData.append('marks', 10);
formData.append('options', JSON.stringify([
  {question: "Q1?", answer: "A1"},
  {question: "Q2?", answer: "A2"}
]));
formData.append('solution', 'Solution text'); // Optional
formData.append('image', imageFile); // Optional
```

### For Match:
```javascript
const formData = new FormData();
formData.append('subject_title_id', 1);
formData.append('subject_id', 1);
formData.append('standard', 10);
formData.append('board_id', 1);
formData.append('type', 'match');
formData.append('question', 'Match the following:');
formData.append('answer', JSON.stringify({A: "1", B: "2"}));
formData.append('marks', 5);
formData.append('options', JSON.stringify({
  left: ["A. Item1", "B. Item2"],
  right: ["1. Option1", "2. Option2"]
}));
formData.append('solution', 'Solution text'); // Optional
formData.append('image', imageFile); // Optional
```

---

## Error Messages

### Missing Required Fields:
```json
{
  "error": "Missing required fields"
}
```

### Invalid Question Type:
```json
{
  "error": "Invalid question type"
}
```

### Invalid File Type (for image):
```json
{
  "error": "Invalid question type"
}
```
(If image is uploaded but question type is invalid)

---

## Summary

### Always Required (8 fields):
1. `subject_title_id`
2. `subject_id`
3. `standard`
4. `board_id`
5. `type`
6. `question`
7. `answer`
8. `marks`

### Conditionally Required:
- `options` - Required for: `mcq`, `passage`, `match`
- `options` - Optional for: `short`, `long`, `blank`, `onetwo`, `truefalse`

### Always Optional (2 fields):
1. `solution`
2. `image`

---

## Notes

1. **JSON Strings**: For `options` and `answer` (in passage/match), send as JSON strings in FormData
2. **Image Upload**: Use field name `image` for file upload
3. **Content-Type**: Must be `multipart/form-data` when uploading images
4. **Options Format**: 
   - MCQ: Array of strings
   - Passage: Array of objects with `question` and `answer`
   - Match: Object with `left` and `right` arrays


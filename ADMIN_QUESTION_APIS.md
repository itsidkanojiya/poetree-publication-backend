# Admin Question Upload APIs

## Overview
These are the APIs that need to be available in the admin panel for uploading and managing questions (including `passage` and `match` types).

---

## Required Admin APIs for Question Upload

### 1. **Add Question** ✅ (Already Exists)
**Endpoint:** `POST /api/question/add`

**Authentication:** Admin only (via `authMiddleware.verifyAdmin`)

**Purpose:** Upload/create new questions of any type (mcq, short, long, blank, onetwo, truefalse, passage, match)

**Request:**
- Content-Type: `multipart/form-data`
- Supports image upload
- All 8 question types supported

**Status:** ✅ **READY** - No changes needed

---

### 2. **Edit Question** ✅ (Already Exists)
**Endpoint:** `PUT /api/question/edit/:id`

**Authentication:** Admin only

**Purpose:** Update existing questions

**Request:**
- Content-Type: `multipart/form-data`
- Supports image upload/replacement

**Status:** ✅ **READY** - Already supports all types

---

### 3. **Delete Question** ✅ (Already Exists)
**Endpoint:** `DELETE /api/question/delete/:id`

**Authentication:** Admin only

**Purpose:** Delete questions and their associated images

**Status:** ✅ **READY**

---

### 4. **Get All Questions (Admin View)** ✅ (Already Exists)
**Endpoint:** `GET /api/question`

**Authentication:** Not required (but can add admin filter if needed)

**Purpose:** Retrieve questions for admin dashboard/management

**Query Parameters:**
- `type` - Filter by question type (passage, match, mcq, etc.)
- `subject_id`, `standard`, `board_id`, `marks` - Filter options

**Status:** ✅ **READY** - Works for admin use

---

### 5. **Get Single Question** ⚠️ (Might be useful)
**Endpoint:** `GET /api/question/:id`

**Purpose:** Get details of a single question for editing

**Status:** ❌ **NOT IMPLEMENTED** - Consider adding if needed

---

### 6. **Question Statistics/Analysis** ✅ (Already Exists)
**Endpoint:** `GET /api/question/analysis`

**Authentication:** Not required

**Purpose:** Get count of questions by type (useful for admin dashboard)

**Response includes:** total, mcq, short, long, blank, onetwo, truefalse, **passage**, **match**

**Status:** ✅ **READY** - Updated to include passage and match

---

## Summary: What You Need

### ✅ **Already Available (No Changes Needed):**

1. **POST `/api/question/add`** - Upload questions (all 8 types)
2. **PUT `/api/question/edit/:id`** - Edit questions
3. **DELETE `/api/question/delete/:id`** - Delete questions
4. **GET `/api/question`** - List all questions (with filters)
5. **GET `/api/question/analysis`** - Question statistics

### ⚠️ **Optional (Consider Adding):**

6. **GET `/api/question/:id`** - Get single question details

---

## API Endpoints Summary Table

| Method | Endpoint | Auth | Purpose | Status |
|--------|----------|------|---------|--------|
| POST | `/api/question/add` | Admin | Upload new question | ✅ Ready |
| PUT | `/api/question/edit/:id` | Admin | Update question | ✅ Ready |
| DELETE | `/api/question/delete/:id` | Admin | Delete question | ✅ Ready |
| GET | `/api/question` | Public | List questions | ✅ Ready |
| GET | `/api/question/analysis` | Public | Statistics | ✅ Ready |
| GET | `/api/question/:id` | Public | Single question | ❌ Optional |

---

## Frontend Integration Examples

### Upload Passage Question (Admin Panel):
```javascript
// Admin uploads a passage question
const uploadPassageQuestion = async (formData) => {
  const response = await fetch('/api/question/add', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`
    },
    body: formData
  });
  
  return response.json();
};

// Form data structure
const formData = new FormData();
formData.append('type', 'passage');
formData.append('subject_id', 1);
formData.append('subject_title_id', 1);
formData.append('standard', 10);
formData.append('board_id', 1);
formData.append('marks', 10);
formData.append('question', 'Read the following passage...');
formData.append('answer', JSON.stringify({q1: "ans1", q2: "ans2"}));
formData.append('options', JSON.stringify([
  {question: "Q1?", answer: "A1"},
  {question: "Q2?", answer: "A2"}
]));
// Optional: formData.append('image', imageFile);
```

### Upload Match Question (Admin Panel):
```javascript
// Admin uploads a match question
const uploadMatchQuestion = async (formData) => {
  const response = await fetch('/api/question/add', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`
    },
    body: formData
  });
  
  return response.json();
};

// Form data structure
const formData = new FormData();
formData.append('type', 'match');
formData.append('subject_id', 1);
formData.append('subject_title_id', 1);
formData.append('standard', 10);
formData.append('board_id', 1);
formData.append('marks', 5);
formData.append('question', 'Match the following:');
formData.append('answer', JSON.stringify({A: "1", B: "2", C: "3"}));
formData.append('options', JSON.stringify({
  left: ["A. Item1", "B. Item2", "C. Item3"],
  right: ["1. Option1", "2. Option2", "3. Option3"]
}));
// Optional: formData.append('image', imageFile);
```

### Get Questions for Admin Dashboard:
```javascript
// Get all passage questions
const getPassageQuestions = async () => {
  const response = await fetch('/api/question?type=passage');
  return response.json();
};

// Get all match questions
const getMatchQuestions = async () => {
  const response = await fetch('/api/question?type=match');
  return response.json();
};

// Get question statistics
const getQuestionStats = async () => {
  const response = await fetch('/api/question/analysis');
  return response.json();
};
```

---

## Recommendation

**✅ All required admin APIs are already implemented!**

You don't need to add any new APIs. The existing `/api/question/add` endpoint already supports:
- All 8 question types (including `passage` and `match`)
- Image uploads
- Proper validation
- Admin authentication

**Optional Enhancement:**
If you want a dedicated admin route structure, you could add:
- `GET /api/admin/question/:id` - Get single question (for edit form pre-population)

But this is optional - the current setup works perfectly for admin question upload.

---

## Current API Structure

```
/api/question/add          → POST (Admin) - Upload question ✅
/api/question/edit/:id    → PUT (Admin) - Edit question ✅
/api/question/delete/:id  → DELETE (Admin) - Delete question ✅
/api/question              → GET (Public) - List questions ✅
/api/question/analysis    → GET (Public) - Statistics ✅
```

**All APIs are ready for admin use!** 🎉


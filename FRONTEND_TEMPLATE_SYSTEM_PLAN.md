# Frontend Template System Implementation Plan

## Overview

This plan covers the implementation of the template system in the React frontend. The system allows:
- **Admins** to create reusable paper templates with custom question titles and header selection
- **Users** to browse templates, view template details, and clone templates to create new editable papers

## System Architecture

### Data Flow

```
Admin Module:
1. Admin creates template → POST /api/papers/templates/create
2. Template stored with is_template=true, template_metadata (question_types + header_id)

User Module:
1. User browses templates → GET /api/papers/templates
2. User views template details → GET /api/papers/:id (returns template with metadata)
3. User clones template → POST /api/papers/templates/:id/clone
4. New paper created (is_template=false) with header data from headers table
```

### Template Metadata Structure

```json
{
  "question_types": {
    "mcq": {
      "custom_title": "A) Multiple Choice Questions (MCQs). Tick the correct options."
    },
    "short": {
      "custom_title": "B) Short Answer Questions"
    },
    "long": {
      "custom_title": "C) Long Answer Questions"
    },
    "blank": {
      "custom_title": "D) Fill in the Blanks"
    },
    "onetwo": {
      "custom_title": "E) One/Two Mark Questions"
    },
    "truefalse": {
      "custom_title": "F) True/False Questions"
    }
  },
  "header_id": 1
}
```

**Important Notes:**
- Each template has ONE `header_id` (not an array)
- Frontend has HTML templates for each header style (1: header style html, 2: header style html, etc.)
- When cloning, backend automatically uses template's `header_id` to fetch header from headers table
- Custom titles apply to ALL questions of that type in the template

---

## API Endpoints Reference

### 1. Create Template (Admin Only)

**Endpoint:** `POST /api/papers/templates/create`

**Authentication:** Required (Admin token in Authorization header)

**Request Headers:**
```
Authorization: Bearer <admin_jwt_token>
Content-Type: multipart/form-data
```

**Request Body (FormData):**
```javascript
{
  user_id: number,              // Required
  type: "custom" | "default",   // Required
  school_name: string,          // Required
  standard: number,             // Required
  timing: string,              // Optional
  date: string (ISO date),      // Required
  division: string,             // Optional
  address: string,              // Optional
  subject: string,              // Required
  subject_title_id: number,     // Optional
  board: string,                // Required
  body: string,                 // Required - JSON array of question IDs: "[29,34,35,42,43]"
  logo_url: string,             // Optional - URL for logo
  logo: File,                   // Optional - File upload for logo
  marks_mcq: number,            // Optional (default: 0)
  marks_short: number,          // Optional (default: 0)
  marks_long: number,           // Optional (default: 0)
  marks_blank: number,          // Optional (default: 0)
  marks_onetwo: number,        // Optional (default: 0)
  marks_truefalse: number,      // Optional (default: 0)
  template_metadata: string      // Required - JSON string with question_types and header_id
}
```

**template_metadata JSON Structure:**
```json
{
  "question_types": {
    "mcq": { "custom_title": "A) Multiple Choice Questions" },
    "short": { "custom_title": "B) Short Answer Questions" },
    "long": { "custom_title": "C) Long Answer Questions" },
    "blank": { "custom_title": "D) Fill in the Blanks" },
    "onetwo": { "custom_title": "E) One/Two Mark Questions" },
    "truefalse": { "custom_title": "F) True/False Questions" }
  },
  "header_id": 1
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Template created successfully",
  "data": {
    "id": 1,
    "user_id": 1,
    "type": "custom",
    "school_name": "ABC School",
    "standard": 10,
    "timing": null,
    "date": "2024-01-15T00:00:00.000Z",
    "division": null,
    "address": null,
    "subject": "Mathematics",
    "subject_title_id": 1,
    "logo": "uploads/papers/logo/filename.jpg",
    "logo_url": null,
    "board": "CBSE",
    "body": "[29,34,35,42,43]",
    "marks_mcq": 10,
    "marks_short": 20,
    "marks_long": 30,
    "marks_blank": 0,
    "marks_onetwo": 0,
    "marks_truefalse": 0,
    "total_marks": 60,
    "is_template": true,
    "template_metadata": "{\"question_types\":{...},\"header_id\":1}"
  }
}
```

**Error Responses:**
- `400` - Missing required fields / Invalid template_metadata format / Header ID doesn't exist
- `401` - Access Denied (no token)
- `403` - Admin access required
- `500` - Server error

---

### 2. Get All Templates (Public)

**Endpoint:** `GET /api/papers/templates`

**Authentication:** Not required (Public access)

**Query Parameters:**
```
?subject=Mathematics        // Optional - Filter by subject
?standard=10               // Optional - Filter by standard
?board=CBSE                // Optional - Filter by board
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "type": "custom",
      "school_name": "ABC School",
      "standard": 10,
      "timing": null,
      "date": "2024-01-15T00:00:00.000Z",
      "division": null,
      "address": null,
      "subject": "Mathematics",
      "subject_title_id": 1,
      "logo": "http://localhost:5000/uploads/papers/logo/filename.jpg",
      "logo_url": null,
      "board": "CBSE",
      "body": "[29,34,35,42,43]",
      "marks_mcq": 10,
      "marks_short": 20,
      "marks_long": 30,
      "marks_blank": 0,
      "marks_onetwo": 0,
      "marks_truefalse": 0,
      "total_marks": 60,
      "is_template": true,
      "template_metadata": {
        "question_types": {
          "mcq": {
            "custom_title": "A) Multiple Choice Questions (MCQs). Tick the correct options."
          },
          "short": {
            "custom_title": "B) Short Answer Questions"
          }
        },
        "header_id": 1
      },
      "subject_title_name": "Algebra"
    }
  ]
}
```

**Note:** 
- `template_metadata` is already parsed as JSON object (not string)
- `logo` URLs are full URLs (not relative paths)
- Frontend should fetch header details using `header_id` from `/api/headers/:id` if needed

---

### 3. Get Template by ID (Public)

**Endpoint:** `GET /api/papers/:id`

**Authentication:** Not required (Public access)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "user_id": 1,
    "type": "custom",
    "school_name": "ABC School",
    "standard": 10,
    "timing": null,
    "date": "2024-01-15T00:00:00.000Z",
    "division": null,
    "address": null,
    "subject": "Mathematics",
    "subject_title_id": 1,
    "logo": "http://localhost:5000/uploads/papers/logo/filename.jpg",
    "logo_url": null,
    "board": "CBSE",
    "body": "[29,34,35,42,43]",
    "marks_mcq": 10,
    "marks_short": 20,
    "marks_long": 30,
    "marks_blank": 0,
    "marks_onetwo": 0,
    "marks_truefalse": 0,
    "total_marks": 60,
    "is_template": true,
    "template_metadata": {
      "question_types": {
        "mcq": {
          "custom_title": "A) Multiple Choice Questions (MCQs). Tick the correct options."
        },
        "short": {
          "custom_title": "B) Short Answer Questions"
        }
      },
      "header_id": 1
    },
    "subject_title_name": "Algebra"
  }
}
```

**Error Responses:**
- `404` - Paper/Template not found
- `500` - Server error

---

### 4. Clone Template (Authenticated Users)

**Endpoint:** `POST /api/papers/templates/:id/clone`

**Authentication:** Required (User token in Authorization header)

**Request Headers:**
```
Authorization: Bearer <user_jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "user_id": 5
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Template cloned successfully",
  "data": {
    "id": 10,
    "user_id": 5,
    "type": "custom",
    "school_name": "XYZ School",
    "standard": 10,
    "timing": null,
    "date": "2024-01-15T00:00:00.000Z",
    "division": null,
    "address": null,
    "subject": "Mathematics",
    "subject_title_id": 1,
    "logo": "https://example.com/logo.jpg",
    "logo_url": "https://example.com/logo.jpg",
    "board": "CBSE",
    "body": "[29,34,35,42,43]",
    "marks_mcq": 10,
    "marks_short": 20,
    "marks_long": 30,
    "marks_blank": 0,
    "marks_onetwo": 0,
    "marks_truefalse": 0,
    "total_marks": 60,
    "is_template": false,
    "template_metadata": "{\"question_types\":{...}}"
  }
}
```

**Note:**
- New paper has `is_template: false` (editable)
- Header fields (`school_name`, `logo`, `logo_url`, `subject_title_id`) are populated from the header fetched using template's `header_id`
- `template_metadata` only contains `question_types` (header_id is not copied)

**Error Responses:**
- `400` - user_id required / Template metadata or header_id missing
- `401` - No token provided / Invalid token
- `404` - Template not found / Header not found
- `500` - Server error

---

### 5. Get User Papers (Excludes Templates)

**Endpoint:** `GET /api/papers/user/:user_id`

**Authentication:** Not required (but can be used for user's own papers)

**Query Parameters:**
```
?type=custom    // Optional - Filter by type (custom/default)
```

**Success Response (200):**
```json
{
  "success": true,
  "papers": [
    {
      "id": 10,
      "user_id": 5,
      "type": "custom",
      "school_name": "XYZ School",
      "standard": 10,
      "subject": "Mathematics",
      "subject_title_id": 1,
      "subject_title_name": "Algebra",
      "logo": "http://localhost:5000/uploads/papers/logo/filename.jpg",
      "board": "CBSE",
      "is_template": false,
      // ... other fields
    }
  ]
}
```

**Note:** Templates (`is_template: true`) are automatically excluded from this endpoint

---

## Frontend Implementation Plan

### Component Structure

```
src/
├── components/
│   ├── admin/
│   │   ├── CreateTemplate.jsx
│   │   ├── TemplateForm.jsx
│   │   └── QuestionTypeTitleEditor.jsx
│   ├── user/
│   │   ├── TemplateList.jsx
│   │   ├── TemplateCard.jsx
│   │   ├── TemplateDetail.jsx
│   │   └── CloneTemplateButton.jsx
│   └── shared/
│       ├── HeaderSelector.jsx
│       └── QuestionTypeSelector.jsx
├── services/
│   └── templateApi.js
├── hooks/
│   └── useTemplates.js
└── utils/
    └── templateHelpers.js
```

---

## Admin Module Implementation

### 1. Create Template Component

**File:** `src/components/admin/CreateTemplate.jsx`

**Features:**
- Form to create new template
- Fields: All paper fields (type, school_name, standard, subject, board, etc.)
- Question selection (body field - array of question IDs)
- Marks breakdown (mcq, short, long, blank, onetwo, truefalse)
- Logo upload (file or URL)
- **Template-specific fields:**
  - Question type custom titles editor
  - Header ID selector (dropdown/select from available headers)

**State Management:**
```javascript
const [formData, setFormData] = useState({
  user_id: currentUser.id,
  type: 'custom',
  school_name: '',
  standard: '',
  subject: '',
  board: '',
  body: '[]', // JSON string of question IDs
  template_metadata: {
    question_types: {
      mcq: { custom_title: '' },
      short: { custom_title: '' },
      long: { custom_title: '' },
      blank: { custom_title: '' },
      onetwo: { custom_title: '' },
      truefalse: { custom_title: '' }
    },
    header_id: null
  },
  marks_mcq: 0,
  marks_short: 0,
  marks_long: 0,
  marks_blank: 0,
  marks_onetwo: 0,
  marks_truefalse: 0
});
```

**Form Sections:**
1. **Basic Paper Info:**
   - Type, School Name, Standard, Subject, Board, Date, etc.

2. **Question Selection:**
   - Multi-select component to choose questions
   - Store as JSON array: `[29, 34, 35, 42, 43]`
   - Convert to string for API: `"[29,34,35,42,43]"`

3. **Marks Breakdown:**
   - Input fields for each question type marks
   - Auto-calculate total marks

4. **Question Type Titles:**
   - Input fields for custom titles per question type
   - Optional - if left empty, uses default from database

5. **Header Selection:**
   - Dropdown/Select to choose header ID (1, 2, 3, 4, 5, etc.)
   - Fetch available headers from `/api/headers` if needed
   - Display header preview if possible

6. **Logo Upload:**
   - File upload or URL input

**Submit Handler:**
```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  
  const formDataToSend = new FormData();
  
  // Add all paper fields
  Object.keys(formData).forEach(key => {
    if (key !== 'template_metadata' && key !== 'logo') {
      formDataToSend.append(key, formData[key]);
    }
  });
  
  // Add template_metadata as JSON string
  formDataToSend.append('template_metadata', JSON.stringify(formData.template_metadata));
  
  // Add logo file if uploaded
  if (logoFile) {
    formDataToSend.append('logo', logoFile);
  }
  
  try {
    const response = await createTemplate(formDataToSend);
    // Handle success (show success message, redirect, etc.)
  } catch (error) {
    // Handle error
  }
};
```

---

### 2. API Service for Admin

**File:** `src/services/templateApi.js`

```javascript
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Get auth token from localStorage or context
const getAuthToken = () => {
  return localStorage.getItem('token') || '';
};

// Create Template (Admin Only)
export const createTemplate = async (formData) => {
  const token = getAuthToken();
  const response = await axios.post(
    `${API_BASE_URL}/papers/templates/create`,
    formData,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    }
  );
  return response.data;
};

// Get All Templates (Public)
export const getTemplates = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.subject) params.append('subject', filters.subject);
  if (filters.standard) params.append('standard', filters.standard);
  if (filters.board) params.append('board', filters.board);
  
  const response = await axios.get(
    `${API_BASE_URL}/papers/templates?${params.toString()}`
  );
  return response.data;
};

// Get Template by ID (Public)
export const getTemplateById = async (id) => {
  const response = await axios.get(`${API_BASE_URL}/papers/${id}`);
  return response.data;
};

// Clone Template (Authenticated Users)
export const cloneTemplate = async (templateId, userId) => {
  const token = getAuthToken();
  const response = await axios.post(
    `${API_BASE_URL}/papers/templates/${templateId}/clone`,
    { user_id: userId },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data;
};

// Get Headers (for header selection dropdown)
export const getHeaders = async () => {
  const token = getAuthToken();
  const response = await axios.get(
    `${API_BASE_URL}/headers`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  return response.data;
};
```

---

## User Module Implementation

### 1. Template List Component

**File:** `src/components/user/TemplateList.jsx`

**Features:**
- Display grid/list of available templates
- Filter by subject, standard, board
- Search functionality
- Template cards with preview

**Component Structure:**
```javascript
import { useState, useEffect } from 'react';
import { getTemplates } from '../../services/templateApi';
import TemplateCard from './TemplateCard';

const TemplateList = () => {
  const [templates, setTemplates] = useState([]);
  const [filters, setFilters] = useState({
    subject: '',
    standard: '',
    board: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, [filters]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await getTemplates(filters);
      setTemplates(response.data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="template-list">
      {/* Filter Section */}
      <div className="filters">
        <select value={filters.subject} onChange={(e) => setFilters({...filters, subject: e.target.value})}>
          <option value="">All Subjects</option>
          {/* Populate from subjects API */}
        </select>
        <select value={filters.standard} onChange={(e) => setFilters({...filters, standard: e.target.value})}>
          <option value="">All Standards</option>
          {/* Populate standards */}
        </select>
        <select value={filters.board} onChange={(e) => setFilters({...filters, board: e.target.value})}>
          <option value="">All Boards</option>
          {/* Populate boards */}
        </select>
      </div>

      {/* Template Grid */}
      <div className="template-grid">
        {templates.map(template => (
          <TemplateCard key={template.id} template={template} />
        ))}
      </div>
    </div>
  );
};
```

---

### 2. Template Card Component

**File:** `src/components/user/TemplateCard.jsx`

**Features:**
- Display template preview
- Show subject, standard, board, total marks
- "View Details" button
- "Clone Template" button (if authenticated)

**Component:**
```javascript
import { Link } from 'react-router-dom';
import { cloneTemplate } from '../../services/templateApi';

const TemplateCard = ({ template }) => {
  const handleClone = async () => {
    const userId = getCurrentUserId(); // Get from auth context
    try {
      const response = await cloneTemplate(template.id, userId);
      // Redirect to paper editor or show success message
      navigate(`/papers/${response.data.id}/edit`);
    } catch (error) {
      // Handle error
    }
  };

  return (
    <div className="template-card">
      <img src={template.logo} alt="Template" />
      <h3>{template.subject}</h3>
      <p>Standard: {template.standard}</p>
      <p>Board: {template.board}</p>
      <p>Total Marks: {template.total_marks}</p>
      <Link to={`/templates/${template.id}`}>View Details</Link>
      <button onClick={handleClone}>Clone Template</button>
    </div>
  );
};
```

---

### 3. Template Detail Component

**File:** `src/components/user/TemplateDetail.jsx`

**Features:**
- Display full template details
- Show question type custom titles
- Display header preview (fetch header details using header_id)
- "Clone Template" button
- Preview of questions (fetch questions using body array)

**Component:**
```javascript
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getTemplateById, cloneTemplate } from '../../services/templateApi';
import { getHeaderById } from '../../services/headerApi';

const TemplateDetail = () => {
  const { id } = useParams();
  const [template, setTemplate] = useState(null);
  const [header, setHeader] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplate();
  }, [id]);

  const fetchTemplate = async () => {
    try {
      const response = await getTemplateById(id);
      setTemplate(response.data);
      
      // Fetch header details if header_id exists
      if (response.data.template_metadata?.header_id) {
        const headerResponse = await getHeaderById(response.data.template_metadata.header_id);
        setHeader(headerResponse.data);
      }
    } catch (error) {
      console.error('Error fetching template:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClone = async () => {
    const userId = getCurrentUserId();
    try {
      const response = await cloneTemplate(template.id, userId);
      navigate(`/papers/${response.data.id}/edit`);
    } catch (error) {
      // Handle error
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!template) return <div>Template not found</div>;

  return (
    <div className="template-detail">
      <h1>{template.subject} - Template</h1>
      
      {/* Header Preview */}
      {header && (
        <div className="header-preview">
          <img src={header.logo_url} alt="Header" />
          <p>{header.school_name}</p>
          <p>{header.exam_type}</p>
        </div>
      )}

      {/* Question Type Titles */}
      {template.template_metadata?.question_types && (
        <div className="question-types">
          <h2>Question Type Titles</h2>
          {Object.entries(template.template_metadata.question_types).map(([type, data]) => (
            <div key={type}>
              <strong>{type.toUpperCase()}:</strong> {data.custom_title}
            </div>
          ))}
        </div>
      )}

      {/* Template Info */}
      <div className="template-info">
        <p>Standard: {template.standard}</p>
        <p>Board: {template.board}</p>
        <p>Total Marks: {template.total_marks}</p>
      </div>

      <button onClick={handleClone}>Clone This Template</button>
    </div>
  );
};
```

---

## Implementation Steps

### Step 1: Setup API Service
1. Create `src/services/templateApi.js` with all API functions
2. Configure axios with base URL and interceptors
3. Add token management

### Step 2: Admin Module
1. Create `CreateTemplate` component
2. Add form fields for all paper properties
3. Implement question selection (multi-select)
4. Add question type title editor
5. Add header ID selector
6. Implement form submission with FormData
7. Add validation
8. Add success/error handling

### Step 3: User Module
1. Create `TemplateList` component
2. Implement filtering (subject, standard, board)
3. Create `TemplateCard` component
4. Create `TemplateDetail` component
5. Implement clone functionality
6. Add navigation/routing

### Step 4: Integration
1. Add routes in React Router
2. Connect to authentication context
3. Add loading states
4. Add error boundaries
5. Add success notifications

### Step 5: Testing
1. Test template creation (admin)
2. Test template listing (public)
3. Test template cloning (user)
4. Test filtering
5. Test error handling

---

## Key Implementation Notes

### 1. Question IDs in Body Field
- When selecting questions, store as array: `[29, 34, 35]`
- Convert to JSON string for API: `JSON.stringify([29, 34, 35])` → `"[29,34,35]"`
- Backend expects string format

### 2. Template Metadata
- Store in state as object
- Convert to JSON string when submitting: `JSON.stringify(template_metadata)`
- Parse from API response: `JSON.parse(template_metadata)` (if string) or use directly (if already parsed)

### 3. Header ID Selection
- Admin selects ONE header ID (1, 2, 3, 4, 5, etc.)
- Frontend can fetch headers from `/api/headers` to show options
- Display header preview if possible

### 4. Cloning Flow
1. User clicks "Clone Template"
2. Frontend calls `POST /api/papers/templates/:id/clone` with `user_id`
3. Backend fetches header using template's `header_id`
4. Backend creates new paper with header data
5. Frontend redirects to paper editor with new paper ID

### 5. Template vs Regular Paper
- Templates: `is_template: true`, shown in template list
- Regular Papers: `is_template: false`, shown in user's paper list
- Templates are excluded from user's paper list automatically

---

## Error Handling

### Common Errors:
1. **401 Unauthorized** - Token missing/invalid
   - Redirect to login
   - Show error message

2. **403 Forbidden** - Admin access required
   - Show error message
   - Hide admin features

3. **400 Bad Request** - Validation errors
   - Show field-specific errors
   - Highlight invalid fields

4. **404 Not Found** - Template doesn't exist
   - Show "Template not found" message
   - Redirect to template list

5. **500 Server Error** - Backend error
   - Show generic error message
   - Log error for debugging

---

## UI/UX Recommendations

1. **Template Cards:**
   - Show preview image (logo)
   - Display key info (subject, standard, board, marks)
   - Hover effects
   - Loading skeletons

2. **Create Template Form:**
   - Multi-step form (Basic Info → Questions → Titles → Header → Review)
   - Progress indicator
   - Save draft functionality
   - Validation feedback

3. **Template Detail:**
   - Full-width layout
   - Header preview section
   - Question type titles section
   - Questions preview (fetch and display)
   - Prominent "Clone" button

4. **Filtering:**
   - Sticky filter bar
   - Clear filters button
   - Results count
   - Empty state message

---

## Testing Checklist

- [ ] Admin can create template with all fields
- [ ] Admin can select header ID
- [ ] Admin can set custom question type titles
- [ ] Template appears in template list
- [ ] User can browse templates (public)
- [ ] User can filter templates (subject, standard, board)
- [ ] User can view template details
- [ ] User can clone template (authenticated)
- [ ] Cloned paper has correct header data
- [ ] Cloned paper is editable (is_template: false)
- [ ] Templates excluded from user's paper list
- [ ] Error handling works correctly
- [ ] Loading states display properly
- [ ] Responsive design works

---

## Additional Resources

### API Base URL
- Development: `http://localhost:5000/api`
- Production: `https://poetreebackend.netlify.app/api`

### Authentication
- Store JWT token in localStorage or context
- Include in Authorization header: `Bearer <token>`
- Handle token expiration

### Headers API (if needed)
- `GET /api/headers` - Get all headers
- `GET /api/headers/:id` - Get header by ID

---

This plan provides complete implementation guidance for the frontend template system. Follow the steps sequentially and refer to the API documentation for request/response formats.











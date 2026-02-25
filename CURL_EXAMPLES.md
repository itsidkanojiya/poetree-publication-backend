# API CURL Examples

## Base URL
Replace `http://localhost:3000` with your actual server URL.

---

## 1. USER SIGNUP

### New Format (Multiple Subjects)
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone_number": "1234567890",
    "username": "johndoe",
    "password": "password123",
    "school_name": "ABC School",
    "school_address_state": "Maharashtra",
    "school_address_pincode": "400001",
    "school_address_city": "Mumbai",
    "school_principal_name": "Principal Name",
    "subjects": [1, 2, 3],
    "subject_titles": [
      {"subject_id": 1, "subject_title_id": 5},
      {"subject_id": 1, "subject_title_id": 6},
      {"subject_id": 2, "subject_title_id": 10}
    ]
  }'
```

### Old Format (Single Subject - Still Supported)
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone_number": "9876543210",
    "username": "janedoe",
    "password": "password123",
    "school_name": "XYZ School",
    "school_address_state": "Gujarat",
    "school_address_pincode": "380001",
    "school_address_city": "Ahmedabad",
    "school_principal_name": "Principal Name",
    "subject": 1,
    "subject_title": 5
  }'
```

**Response:**
```json
{
  "message": "Signup successful. OTP sent to email. Your selections are pending admin approval.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "subject": null,
    "subject_title": null,
    "is_verified": 0
  }
}
```

---

## 2. VERIFY OTP

```bash
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "otp": "123456"
  }'
```

---

## 3. LOGIN

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "password": "password123"
  }'
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "subject": ["Math", "Science"],
    "subject_title": ["Math Book 1", "Science Book 1"],
    "is_verified": 1
  }
}
```

---

## 4. USER ENDPOINTS (Require Authentication)

### 4.1 Get All My Selections (Pending + Approved + Rejected)

```bash
curl -X GET http://localhost:3000/api/auth/my-selections \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Response:**
```json
{
  "selections": {
    "subjects": {
      "pending": [
        {
          "id": 1,
          "user_id": 1,
          "subject_id": 3,
          "status": "pending",
          "subject": {
            "subject_id": 3,
            "subject_name": "English"
          }
        }
      ],
      "approved": [
        {
          "id": 2,
          "user_id": 1,
          "subject_id": 1,
          "status": "approved",
          "approved_at": "2024-01-15T10:30:00.000Z",
          "subject": {
            "subject_id": 1,
            "subject_name": "Math"
          }
        }
      ],
      "rejected": [],
      "all": [...]
    },
        "subject_titles": {
          "pending": [...],
          "approved": [...],
          "rejected": [...],
          "all": [...]
        }
  }
}
```

### 4.2 Get My Pending Selections Only

```bash
curl -X GET http://localhost:3000/api/auth/my-selections/pending \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Response:**
```json
{
  "pending_selections": {
    "subjects": [...],
    "subject_titles": [...]
  }
}
```

### 4.3 Get My Approved Selections Only

```bash
curl -X GET http://localhost:3000/api/auth/my-selections/approved \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Response:**
```json
{
  "approved_selections": {
    "subjects": [...],
    "subject_titles": [...]
  }
}
```

### 4.4 Add/Update My Selections (Create New Pending Requests)

```bash
curl -X PUT http://localhost:3000/api/auth/my-selections \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "subjects": [4, 5],
    "subject_titles": [
      {"subject_id": 4, "subject_title_id": 15},
      {"subject_id": 5, "subject_title_id": 20}
    ]
  }'
```

**Response:**
```json
{
  "message": "New selections added successfully. They are pending admin approval."
}
```

---

## 5. ADMIN ENDPOINTS (Require Admin Token)

### 5.1 Get All Pending Users with Their Selections

```bash
curl -X GET http://localhost:3000/api/admin/pending-users \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE"
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "is_verified": 0,
    "pending_selections": {
      "subjects": [
        {
          "id": 1,
          "subject_id": 1,
          "status": "pending",
          "subject": {
            "subject_id": 1,
            "subject_name": "Math"
          }
        }
      ],
      "subject_titles": [...],
    }
  }
]
```

### 5.2 Get User's All Selections (Admin View)

```bash
curl -X GET http://localhost:3000/api/admin/user/1/selections \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE"
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "is_verified": 0
  },
  "selections": {
    "subjects": {
      "pending": [...],
      "approved": [...],
      "rejected": [...]
    },
        "subject_titles": {
          "pending": [...],
          "approved": [...],
          "rejected": [...]
        }
  }
}
```

### 5.3 Approve User Selections and Activate User

```bash
curl -X POST http://localhost:3000/api/admin/approve-selections/1 \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "subject_ids": [2, 3],
    "subject_title_ids": [6, 10],
    "reject_others": true
  }'
```

**Note:** 
- `subject_ids` = Array of IDs from `user_subjects` table (not subject_id)
- `subject_title_ids` = Array of IDs from `user_subject_titles` table (not subject_title_id)
- `reject_others` = If true, rejects all non-approved items

**Response:**
```json
{
  "message": "User selections approved and user activated successfully",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "subject": [2, 3],
    "subject_title": [6, 10],
    "is_verified": 1
  }
}
```

### 5.4 Get All Users

```bash
curl -X GET http://localhost:3000/api/admin/user \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE"
```

### 5.5 Activate User (View Pending Selections)

```bash
curl -X PUT http://localhost:3000/api/admin/activate/1 \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE"
```

**Response:**
```json
{
  "message": "User details with pending selections",
  "user": {...},
      "pending_selections_count": {
        "subjects": 2,
        "subject_titles": 3
      },
  "note": "Use /admin/approve-selections/:id to approve and activate user"
}
```

### 5.6 Deactivate User

```bash
curl -X PUT http://localhost:3000/api/admin/deactivate/1 \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE"
```

---

## 6. OTHER ENDPOINTS

### 6.1 Resend OTP

```bash
curl -X POST http://localhost:3000/api/auth/resend-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com"
  }'
```

### 6.2 Forgot Password

```bash
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com"
  }'
```

### 6.3 Change Password

```bash
curl -X POST http://localhost:3000/api/auth/change-password \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "oldPassword": "oldpass123",
    "newPassword": "newpass123"
  }'
```

### 6.4 Verify Token

```bash
curl -X GET http://localhost:3000/api/auth/verify-token \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## IMPORTANT NOTES:

1. **Token Format:** Always use `Bearer TOKEN` in Authorization header
2. **Subject IDs vs Junction Table IDs:**
   - When approving: Use IDs from `user_subjects`, `user_subject_titles` tables
   - When adding: Use actual `subject_id`, `subject_title_id` values
3. **Status Values:** `pending`, `approved`, `rejected`
4. **User Access:** Users can only see their own selections
5. **Admin Access:** Admins can see and approve any user's selections

---

## FRONTEND INTEGRATION GUIDE:

### For User Dashboard:
1. **Show All Selections:** `GET /api/auth/my-selections`
2. **Show Pending Only:** `GET /api/auth/my-selections/pending`
3. **Show Approved Only:** `GET /api/auth/my-selections/approved`
4. **Add New Selections:** `PUT /api/auth/my-selections`

### For Admin Dashboard:
1. **View Pending Users:** `GET /api/admin/pending-users`
2. **View User Details:** `GET /api/admin/user/:id/selections`
3. **Approve & Activate:** `POST /api/admin/approve-selections/:id`


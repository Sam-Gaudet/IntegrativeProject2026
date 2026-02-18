# API Reference — For the Frontend

> Base URL (local): `http://localhost:3001`  
> All endpoints return JSON.  
> All protected endpoints require: `Authorization: Bearer <access_token>`

---

## Response Format

Every response follows the same shape:

**Success:**
```json
{ "success": true, "data": { ... } }
```

**Error:**
```json
{ "success": false, "error": "Human-readable message" }
```

---

## Auth

### POST `/api/auth/login`

Log in with email and password. Returns the JWT and user info with role.
Store the `access_token` and `user` in React context / localStorage.

**Request body:**
```json
{
  "email": "student1@university.edu",
  "password": "Password123!"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "email": "student1@university.edu",
      "role": "student",
      "full_name": "Alex Thompson"
    }
  }
}
```

**Response `401`:**
```json
{ "success": false, "error": "Invalid email or password" }
```

**How to use the token (axios example):**
```js
// After login, store the token:
localStorage.setItem('token', data.access_token);

// On every authenticated request:
const token = localStorage.getItem('token');
axios.get('/api/professors', {
  headers: { Authorization: `Bearer ${token}` }
});
```

---

### POST `/api/auth/logout`

Invalidates the session on the server side.
**Also clear the token from localStorage on the frontend regardless of the response.**

**Headers:** `Authorization: Bearer <token>`

**Response `200`:**
```json
{ "success": true, "data": { "message": "Logged out" } }
```

---

### GET `/api/auth/me`

Returns the currently logged-in user's profile.
Use this on app load to restore the session (check if the stored token is still valid).

**Headers:** `Authorization: Bearer <token>`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "prof.martin@university.edu",
    "role": "professor",
    "full_name": "Dr. Alice Martin",
    "department": "Computer Science"
  }
}
```

**Response `401`:** Token missing or expired.

---

## Professors

### GET `/api/professors`

Returns all professors. Used on the **student dashboard** to show who is available.

**Headers:** `Authorization: Bearer <token>` (any role)

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "full_name": "Dr. Alice Martin",
      "department": "Computer Science",
      "availability_status": "available"
    },
    {
      "id": "uuid",
      "full_name": "Dr. Robert Chen",
      "department": "Mathematics",
      "availability_status": "busy"
    }
  ]
}
```

**`availability_status` values:**

| Value | Meaning |
|---|---|
| `available` | Student can book right now |
| `busy` | Professor is in a meeting — student should join queue |
| `away` | Professor is not available |

---

### GET `/api/professors/:id`

Returns a single professor by their UUID.

**Headers:** `Authorization: Bearer <token>` (any role)

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "full_name": "Dr. Alice Martin",
    "department": "Computer Science",
    "availability_status": "available"
  }
}
```

**Response `404`:** Professor not found.

---

## Students

### GET `/api/students` — Professor only

Returns all students. Only accessible by professors (e.g., for the professor's queue view).
A student calling this endpoint will get `403 Forbidden`.

**Headers:** `Authorization: Bearer <token>` (professor only)

**Response `200`:**
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "full_name": "Alex Thompson", "email": "student1@university.edu" },
    { "id": "uuid", "full_name": "Jordan Lee",     "email": "student2@university.edu" }
  ]
}
```

**Response `403`:**
```json
{ "success": false, "error": "Access denied. Required role: [professor]. Your role: student" }
```

---

### GET `/api/students/me` — Student only

Returns the currently logged-in student's own profile.
Only accessible by students — calling this as a professor returns `403`.

**Headers:** `Authorization: Bearer <token>` (student only)

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "full_name": "Alex Thompson",
    "email": "student1@university.edu"
  }
}
```

---

## Health Check

### GET `/api/health`

No auth required. Use to check if the server is running.

**Response `200`:**
```json
{ "status": "ok", "timestamp": "2026-02-18T12:00:00.000Z" }
```

---

## Role-Based Routing Guide

Use the `role` from the login response (or `/api/auth/me`) to decide which view to render:

```jsx
// React pseudocode
const { user } = useAuth(); // your auth context

if (user.role === 'professor') {
  return <ProfessorDashboard />;
}

if (user.role === 'student') {
  return <StudentDashboard />;
}
```

**Student dashboard** should:
- Call `GET /api/professors` to show the professor list with availability
- Show "Book Now" if `availability_status === 'available'`
- Show "Join Queue" if `availability_status === 'busy'`
- Show "Unavailable" if `availability_status === 'away'`

**Professor dashboard** should:
- Show the professor's own status and a toggle (availability update comes in a later deliverable)
- Show "Manage Availability" UI

---

## Error Reference

| HTTP Code | Meaning |
|---|---|
| `400` | Bad request — missing or invalid fields in body |
| `401` | Unauthenticated — missing, expired, or invalid token |
| `403` | Forbidden — authenticated but wrong role for this route |
| `404` | Resource not found |
| `500` | Internal server error — check backend logs |

---

## Real-Time Updates (Supabase Realtime)

For **Deliverable 4**, the frontend will subscribe directly to Supabase Realtime for live updates (e.g., professor availability changes without a page refresh). The backend does not manage WebSocket connections — Supabase handles that.

Example (to be implemented in D4):
```js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Subscribe to changes on the professors table
supabase
  .channel('professors')
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'professors' }, (payload) => {
    console.log('Professor updated:', payload.new);
    // Update your React state here
  })
  .subscribe();
```

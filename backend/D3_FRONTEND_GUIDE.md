# D3 Frontend Integration Guide

This document covers every new API endpoint added for Deliverable 3.
The D2 endpoints (`/api/auth`, `/api/professors`, `/api/students`) are unchanged.

All requests require `Authorization: Bearer <access_token>` header unless stated otherwise.

---

## What Changed in D3

| New endpoint group | Purpose |
|---|---|
| `PATCH /api/professors/status` | Professor one-click status toggle |
| `/api/availability` | Professor creates slots; students view them |
| `/api/bookings` | Students book/cancel; professors view |
| `/api/queue` | Students join/leave queue; professors view FIFO queue |

---

## 1. Professor — Update Availability Status

**`PATCH /api/professors/status`**  
Role: `professor` only

```json
// Request body
{ "availability_status": "available" }        // or "busy" or "away"

// Response 200
{ "success": true, "data": { "id": "uuid", "availability_status": "available" } }
```

Use this for the one-click toggle on the professor dashboard. Show the current status as the button label ("Available", "Busy", "Away"). Call this on every toggle.

---

## 2. Availability Slots

### View all slots

**`GET /api/availability`**  
Role: any authenticated user

Optional query param: `?professor_id=UUID` to filter to one professor.

```json
// Response 200
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "professor_id": "uuid",
      "start_time": "2026-03-20T10:00:00Z",
      "end_time": "2026-03-20T10:30:00Z",
      "status": "available",    // "available" | "booked" | "cancelled"
      "created_at": "..."
    }
  ]
}
```

On the **student dashboard**, show only slots with `status === "available"` for the selected professor. Show `start_time` and `end_time` formatted for the user. Display a "Book Now" button next to each one.

### Professor creates a slot

**`POST /api/availability`**  
Role: `professor` only

```json
// Request body — ISO 8601 timestamps
{
  "start_time": "2026-03-20T10:00:00Z",
  "end_time":   "2026-03-20T10:30:00Z"
}

// Response 201
{ "success": true, "data": { /* slot object */ } }
```

On the **professor dashboard**, provide a form or time-picker to add new office hour slots.

### Professor updates a slot status

**`PATCH /api/availability/:id`**  
Role: `professor` only, must own the slot

```json
// Request body
{ "status": "cancelled" }    // or "available"

// Response 200
{ "success": true, "data": { /* updated slot */ } }
```

Use for "Remove Slot" buttons on the professor dashboard.

---

## 3. Bookings

### Student books a slot

**`POST /api/bookings`**  
Role: `student` only

```json
// Request body
{ "slot_id": "uuid" }

// Response 201 — success
{ "success": true, "data": { "id": "uuid", "slot_id": "...", "student_id": "...", "status": "active", "created_at": "..." } }

// Response 409 — already has a booking
{ "success": false, "error": "max_booking_limit_exceeded: ...", "code": "MAX_BOOKING_LIMIT" }

// Response 409 — slot was just taken
{ "success": false, "error": "slot_not_available: ...", "code": "SLOT_NOT_AVAILABLE" }
```

On error `MAX_BOOKING_LIMIT`: show a message like "You already have an active booking. Cancel it first."  
On error `SLOT_NOT_AVAILABLE`: show "This slot was just taken. Please choose another."

### View bookings

**`GET /api/bookings`**  
Role: any authenticated user

- **Student**: returns their own bookings with nested slot + professor details
- **Professor**: returns bookings on their slots with nested student details

```json
// Student response shape
{
  "success": true,
  "data": [{
    "id": "uuid",
    "slot_id": "uuid",
    "student_id": "uuid",
    "status": "active",
    "created_at": "...",
    "availability_slots": {
      "start_time": "...",
      "end_time": "...",
      "professor_id": "...",
      "professors": { "full_name": "...", "department": "..." }
    }
  }]
}

// Professor response shape
{
  "success": true,
  "data": [{
    "id": "uuid",
    "slot_id": "uuid",
    "student_id": "uuid",
    "status": "active",
    "created_at": "...",
    "availability_slots": { "start_time": "...", "end_time": "..." },
    "students": { "full_name": "...", "email": "..." }
  }]
}
```

### Cancel a booking

**`DELETE /api/bookings/:id`**  
Role: student (own booking) or professor (booking on their slot)

```json
// Response 200
{
  "success": true,
  "data": {
    "booking_id": "uuid",
    "status": "cancelled",
    "promoted_student_id": "uuid or null"   // non-null means someone was auto-promoted
  }
}
```

If `promoted_student_id` is not null, a student was auto-promoted from the queue. You can show a toast: "Next student in queue has been notified."

---

## 4. Queue

### Student joins queue

**`POST /api/queue`**  
Role: `student` only

Use this when the professor has no available slots or `availability_status === "busy"`.

```json
// Request body
{ "professor_id": "uuid" }

// Response 201
{
  "success": true,
  "data": {
    "id": "uuid",
    "professor_id": "uuid",
    "student_id": "uuid",
    "status": "waiting",
    "promoted_at": null,
    "created_at": "...",
    "position": 2    // their position in the FIFO queue (1 = next up)
  }
}

// Response 409 — already queued
{ "success": false, "error": "already_in_queue: ...", "code": "ALREADY_IN_QUEUE" }
```

Show the student their queue position. Replace the "Join Queue" button with "Leave Queue" after joining.

### View queue entries

**`GET /api/queue`**  
Role: any authenticated user

- **Professor**: returns their full queue, `status === "waiting"`, ordered FIFO (position 1 = first)
- **Student**: returns all their queue entries across all professors

```json
// Professor response — includes student name
{
  "success": true,
  "data": [{
    "id": "uuid",
    "professor_id": "uuid",
    "student_id": "uuid",
    "status": "waiting",
    "created_at": "...",
    "students": { "full_name": "...", "email": "..." }
  }]
}

// Student response — includes professor name
{
  "success": true,
  "data": [{
    "id": "uuid",
    "professor_id": "uuid",
    "status": "waiting",
    "promoted_at": null,
    "created_at": "...",
    "professors": { "full_name": "...", "department": "..." }
  }]
}
```

On the professor dashboard, show this as the live queue list.  
On the student dashboard, a `status === "promoted"` entry means it's their turn — show a prominent notification.

### Leave queue

**`DELETE /api/queue/:id`**  
Role: student (own entry) or professor (entry in their queue)

```json
// Response 200
{ "success": true, "data": { "id": "uuid", "status": "cancelled" } }
```

---

## 5. Real-Time (Supabase Realtime)

Subscribe to these tables to get live updates without polling:

```ts
// Subscribe to slot status changes for a professor
supabase
  .channel('slots')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'availability_slots',
    filter: `professor_id=eq.${professorId}`,
  }, (payload) => {
    // Update your local state with payload.new
  })
  .subscribe();

// Subscribe to queue changes
supabase
  .channel('queue')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'queue_entries',
    filter: `professor_id=eq.${professorId}`,
  }, (payload) => {
    // Refresh queue display
  })
  .subscribe();

// Subscribe to the student's own bookings
supabase
  .channel('bookings')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'bookings',
    filter: `student_id=eq.${studentId}`,
  }, (payload) => {
    // Detect promoted_at becoming non-null → show "It's your turn!" notification
  })
  .subscribe();
```

The key D4 requirement: if a student's `queue_entries` row changes to `status = 'promoted'`, immediately show a prominent in-app notification (toast or modal): **"It's your turn! You've been moved to the front."**

---

## 6. Error Codes Reference

| HTTP | `code` field | Meaning |
|---|---|---|
| 409 | `MAX_BOOKING_LIMIT` | Student already has 1 active booking |
| 409 | `SLOT_NOT_AVAILABLE` | Slot is already booked or cancelled |
| 409 | `SLOT_ALREADY_BOOKED` | Race condition — another student just took it |
| 409 | `ALREADY_IN_QUEUE` | Student is already waiting for this professor |
| 403 | — | Wrong role for this endpoint |
| 401 | — | Missing or invalid token |
| 404 | — | Resource not found |
| 400 | — | Missing required field in request body |

---

## 7. Student Flow Summary

```
Professor list → Select Professor
  ├── availability_status = "available" AND slots exist?
  │     └── Show "Book Now" → POST /api/bookings
  └── No available slots or status = "busy"?
        └── Show "Join Queue" → POST /api/queue
              └── Show position: "You are #2 in queue"

Queue entry status becomes "promoted"?
  └── Show notification: "It's your turn!" + button to confirm/view booking
```

## 8. Professor Flow Summary

```
Professor dashboard loads:
  ├── GET /api/professors → show own status + toggle button
  ├── GET /api/availability → show my upcoming slots
  ├── GET /api/bookings → show who has booked
  └── GET /api/queue → show waiting students (FIFO order)

Actions:
  ├── Toggle availability → PATCH /api/professors/status
  ├── Add slot → POST /api/availability
  ├── Remove slot → PATCH /api/availability/:id { status: "cancelled" }
  └── Cancel student booking → DELETE /api/bookings/:id (auto-promotes next in queue)
```

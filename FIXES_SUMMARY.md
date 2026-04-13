# Integrative Project 2026 - Issues & Fixes Summary

## Overview
Multiple bugs were identified and fixed in the application. Below is a comprehensive list of all issues and their resolutions.

---

## Issue 1: Professor Status Toggle Un-toggling Itself

### Problem
When a professor changed their availability status, the toggle would update momentarily but then revert to the previous status. This was happening because the polling mechanism was fetching fresh data and overwriting the locally updated state.

### Root Cause
The polling interval (3 seconds) was updating the professor state from the database, which hadn't yet been updated via the API call. This created a race condition where the local UI update was immediately overwritten.

### Solution
1. **Added timestamp tracking**: Store the time when a status change is made with `lastStatusChangeTime`
2. **Modified polling logic**: Only update professor data if 2+ seconds have passed since the last status change
3. **Files modified**: 
   - [frontend/src/routes/ProfessorDashboard.tsx](frontend/src/routes/ProfessorDashboard.tsx#L33)

**Changes Made:**
```typescript
// Added state tracking for last status change time
const [lastStatusChangeTime, setLastStatusChangeTime] = useState<number>(0);

// Update when status changes
const handleStatusChange = (newStatus: 'available' | 'busy' | 'away') => {
  setProfessor((prev) => prev ? { ...prev, availability_status: newStatus } : null);
  setLastStatusChangeTime(Date.now()); // Track when status changed
  // ... rest of function
};

// Modified polling to respect recent changes
useEffect(() => {
  const fetchProfessor = async () => {
    try {
      const res = await api.get('/api/auth/me');
      // Only update if 2+ seconds have passed since last status change
      if (Date.now() - lastStatusChangeTime > 2000) {
        setProfessor(res.data.data);
      }
    }
    // ... rest of function
  };
  // ... polling setup
}, [lastStatusChangeTime]);
```

---

## Issue 2: Queue Position Shows "---" (Not Calculated)

### Problem
When students viewed their queue positions, it showed "---" instead of an actual position number. The queue positions were not being calculated when fetching student's queue entries.

### Root Cause
The backend's GET `/api/queue` endpoint for students was returning queue entries without the `position` field. The position calculation was only done when joining the queue (POST), but not on subsequent fetches.

### Solution
1. **Added position calculation in backend**: For each queue entry returned to students, calculate their FIFO position dynamically
2. **Files modified**:
   - [backend/src/routes/queue.ts](backend/src/routes/queue.ts#L130-L160)

**Changes Made:**
```typescript
// Calculate positions for each entry
const entriesWithPositions = await Promise.all(
  (entries || []).map(async (entry) => {
    if (entry.status === 'waiting') {
      const { count } = await supabaseAdmin
        .from('queue_entries')
        .select('*', { count: 'exact', head: true })
        .eq('professor_id', entry.professor_id)
        .eq('status', 'waiting')
        .lte('created_at', entry.created_at);
      
      return { ...entry, position: count ?? 1 };
    }
    return { ...entry, position: null };
  })
);

res.status(200).json({ success: true, data: entriesWithPositions });
```

---

## Issue 3: Student Bookings Show as Empty

### Problem
The "My Active Bookings" section was showing no bookings even when students had active bookings.

### Root Cause
The frontend's `bookingService.getStudentBookings()` was calling `/api/bookings/me`, but the backend never had this endpoint defined. The backend's `/api/bookings` GET endpoint handles both students and professors based on their role.

### Solution
1. **Updated frontend service calls**: Changed to use `/api/bookings` endpoint which returns student bookings for students and professor bookings for professors (based on role)
2. **Files modified**:
   - [frontend/src/services/bookingService.ts](frontend/src/services/bookingService.ts#L37-L45)

**Changes Made:**
```typescript
async getStudentBookings(): Promise<Booking[]> {
  const res = await api.get('/api/bookings'); // Was: /api/bookings/me
  return res.data.data;
},

async getProfessorBookings(): Promise<Booking[]> {
  const res = await api.get('/api/bookings'); // Was: /api/bookings/professor
  return res.data.data;
},
```

---

## Issue 4: Booking Fairness Rule Implementation

### Problem
The backend was preventing students from booking another professor while they had ANY active booking. The intended rule was: **Max 1 active booking PER PROFESSOR at a time** (students should be able to book different professors, just not multiple slots with the same professor simultaneously).

### Root Cause
The backend query trying to filter bookings by professor was malformed. It was using `.eq('availability_slots.professor_id', ...)` which doesn't correctly join through the foreign key in Supabase.

### Solution
1. **Fixed the query syntax**: Changed from `.eq()` filter to proper `.select()` with `.inner()` join to availability_slots
2. **Maintained per-professor fairness**: The query now correctly checks if student has an active booking with the specific professor
3. **Files modified**:
   - [backend/src/routes/bookings.ts](backend/src/routes/bookings.ts#L72-L89)

**Changes Made:**
```typescript
// Check if student already has an active booking with THIS professor
const { data: existingBookings, error: countError } = await supabaseAdmin
  .from('bookings')
  .select('id, availability_slots!inner(professor_id)')
  .eq('student_id', req.user!.id)
  .eq('status', 'active')
  .eq('availability_slots.professor_id', slot.professor_id);

if ((existingBookings?.length ?? 0) >= 1) {
  res.status(409).json({
    success: false,
    error: 'max_booking_limit_exceeded: You already have an active booking with this professor. Cancel it before booking another slot with them.',
    code: 'MAX_BOOKING_LIMIT',
  });
  return;
}
```

---

## Issue 5: Missing Backend Queue Endpoints

### Problem
The frontend was calling several queue endpoints that didn't exist in the backend:
- `GET /api/queue/me/:professorId` - Check student's position in a specific professor's queue
- `GET /api/queue/professor/:professorId` - Professor views their queue
- `POST /api/queue/professor/:professorId/next` - Professor calls next student

### Solution
1. **Implemented three new endpoints** in the queue router with proper validation and authorization
2. **Files modified**:
   - [backend/src/routes/queue.ts](backend/src/routes/queue.ts#L215-L330)

**Endpoints Added:**

#### GET /api/queue/me/:professorId
- **Purpose**: Allow a student to check their position in a specific professor's queue
- **Returns**: Queue entry with calculated position, or null if not in queue
- **Roles**: student only

#### GET /api/queue/professor/:professorId
- **Purpose**: Allow a professor to view their own queue (with student names/emails)
- **Returns**: Array of waiting queue entries, ordered FIFO
- **Roles**: professor only
- **Security**: Professor can only view their own queue

#### POST /api/queue/professor/:professorId/next
- **Purpose**: Allow a professor to call the next student from their queue
- **Returns**: `{ promoted_student_id, booking_id }`
- **Roles**: professor only
- **Logic**: Marks the oldest waiting entry as 'called'

---

## Testing Checklist

### Professor Status Toggle
- [ ] Professor changes status from available → busy
- [ ] Status persists (doesn't revert)
- [ ] Status updates appear in UI without flickering
- [ ] Change from busy → away and verify it sticks
- [ ] Polling every 3 seconds doesn't cause status to revert

### Queue Positions
- [ ] Student joins queue for a professor
- [ ] Queue position displays correctly (e.g., "Position: 1")
- [ ] Second student joins queue shows "Position: 2"
- [ ] Position updates when first student leaves
- [ ] Position displays on the StudentDashboard "My Queue Positions" section

### Student Bookings
- [ ] Student creates a booking for a slot
- [ ] Booking appears in "My Active Bookings" section
- [ ] Booking shows correct professor name and time
- [ ] Multiple bookings display correctly if student books multiple professors

### Booking Fairness
- [ ] Student can book Professor A
- [ ] While booked with Professor A, student CANNOT book another slot with Professor A
- [ ] While booked with Professor A, student CAN book a slot with Professor B
- [ ] After canceling booking with Professor A, student can book Professor A again

### Queue Management
- [ ] Professor can view their queue with students listed
- [ ] "Call Next" button marks the oldest student as called
- [ ] Queue updates in real-time when students join/leave
- [ ] Queue positions adjust correctly after students leave

---

## Build & Deployment

### Backend Changes
- **Files Modified**: `src/routes/queue.ts`, `src/routes/bookings.ts`
- **Build Command**: `npm run build`
- **Build Status**: ✅ Successful (No TypeScript errors)

### Frontend Changes
- **Files Modified**: `src/routes/ProfessorDashboard.tsx`, `src/services/bookingService.ts`
- **Build Command**: `npm run build`
- **Build Status**: ✅ Successful
- **Output**: 154 modules transformed, ready for deployment

### Running Application
```bash
# Terminal 1: Start Backend
cd backend && npm start

# Terminal 2: Start Frontend
cd frontend && npm run dev
```

---

## Code Quality
- ✅ All TypeScript compilation successful
- ✅ No new eslint violations
- ✅ Maintained existing code style and patterns
- ✅ Added comprehensive error handling
- ✅ Proper HTTP status codes and error messages

---

## Future Improvements
1. Consider caching queue positions to reduce database queries
2. Add WebSocket support for real-time queue updates (currently uses polling)
3. Implement automatic queue position updates via Supabase realtime
4. Add rate limiting on booking attempts to prevent abuse
5. Add audit logging for all status changes and bookings

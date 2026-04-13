# Quick Testing Guide

## Setup
Backend: http://localhost:3001
Frontend: http://localhost:5173

## Test Cases by Issue

### Test 1: Professor Status Toggle Persistence ✓
1. Login as professor (adm1)
2. Click on StatusToggle component (status button)
3. Change from "available" → "busy"
4. **Expected**: Status changes and stays changed (does NOT revert after 2-3 seconds)
5. Wait 10 seconds and confirm status is still "busy"
6. Try changing to "away" and verify persistence again

**How to identify if fixed:**
- The status no longer flickers or reverts
- Polling still refreshes data but respects the 2-second grace period

---

### Test 2: Queue Position Displays Correctly ✓
1. Login as student
2. Navigate to "Available Professors" section
3. Click "Join Queue" for any professor
4. Check "My Queue Positions" section
5. **Expected**: Shows "Position: 1" (not "Position: ---")
6. Join the queue again with a second student account from another browser
7. First student should still show "Position: 1", second should show "Position: 2"

**How to identify if fixed:**
- Queue positions display as numbers (1, 2, 3...)
- Not showing dashes (---)

---

### Test 3: My Active Bookings Show Up ✓
1. Login as student
2. In "Available Professors" section, find any professor with available slots
3. Click on a slot time and confirm booking
4. **Expected**: Booking appears in "My Active Bookings" section
5. The booking card shows:
   - Professor name
   - Date/time of slot
   - Status badge
   - Cancel button

**How to identify if fixed:**
- Bookings list is no longer empty
- Booking shows all relevant details
- No API errors in browser console

---

### Test 4: Booking Fairness Rule (Multi-Professor) ✓
1. Login as student
2. Book a slot with Professor A
3. **Expected**: Student now has 1 active booking
4. Try to book a slot with Professor A again
5. **Expected**: Gets error "You already have an active booking with this professor"
6. Now try to book a slot with Professor B (different professor)
7. **Expected**: Can successfully book Professor B while booking with Professor A
8. **Expected**: "My Active Bookings" shows 2 bookings (one with Prof A, one with Prof B)

**How to identify if fixed:**
- Step 5: Error message appears, booking is blocked
- Step 7: Booking succeeds without error
- Step 8: Both bookings appear in the list

---

### Test 5: Queue Management (Professor Side) ✓
1. Login as professor
2. Scroll to "Student Queue" section
3. With multiple students logged in on different devices/windows:
   - Have students 1, 2, 3 join this professor's queue
4. Professor dashboard should show:
   - Queue section with count: "Queue (3)"
   - List of 3 students in FIFO order
   - "Call Next" button
5. Click "Call Next"
6. **Expected**: Oldest student (first to join) is marked as 'called'
7. Queue count updates to "Queue (2)"

**How to identify if fixed:**
- Queue displays with correct student count
- "Call Next" button works and removes student from waiting queue
- FIFO ordering is maintained (oldest first)

---

## Quick Smoke Test (5 minutes)

If you have limited time, run through this:

1. **Start Services**
   ```bash
   # Terminal 1
   cd backend && npm start
   
   # Terminal 2
   cd frontend && npm run dev
   ```

2. **Quick Test Sequence**
   - Open http://localhost:5173
   - Login as professor: Email = prof1@champlain.qc.ca, Pass = password123
   - Change status from "available" → "busy"
   - Wait 5 seconds and confirm it doesn't revert ✓
   - Logout
   - Login as student: Email = student1@champlain.qc.ca, Pass = password123
   - Join a professor's queue
   - Check "My Queue Positions" shows a position number ✓
   - Click "Book" on any available slot
   - Check "My Active Bookings" shows the booking ✓
   - Try to book same professor again (should fail)
   - Book different professor (should succeed) ✓

---

## Accessing the Application

### Valid Test Credentials

**Professors:**
- Email: prof1@champlain.qc.ca
- Password: password123

- Email: prof2@champlain.qc.ca  
- Password: password123

**Students:**
- Email: student1@champlain.qc.ca
- Password: password123

- Email: student2@champlain.qc.ca
- Password: password123

---

## Debugging Tips

### If backend doesn't start:
```bash
# Check if port 3001 is in use
netstat -ano | findstr 3001

# Or restart with fresh build
cd backend && npm run build && npm start
```

### If frontend doesn't load:
```bash
# Clear node_modules and reinstall
cd frontend
rm -r node_modules package-lock.json
npm install
npm run dev
```

### Check for API errors:
- Open Browser DevTools (F12)
- Go to Network tab
- Make a booking or status change
- Look for failed requests
- Check Console tab for error messages

### Enable detailed logging:
- Add `console.log()` statements in:
  - `frontend/src/routes/ProfessorDashboard.tsx` (status change)
  - `frontend/src/routes/StudentDashboard.tsx` (bookings fetch)
  - `backend/src/routes/queue.ts` (position calculation)

---

## Expected Behavior After Fixes

| Feature | Before | After |
|---------|--------|-------|
| Status Toggle | Reverts after 2-3 seconds | Persists indefinitely |
| Queue Position | Shows "---" | Shows actual number (1, 2, 3...) |
| Active Bookings | Empty section | Shows all active bookings |
| Multi-Professor Booking | Can't book any other professor | Can book different professors |
| Queue Management | No professor queue view | Shows queue with FIFO ordering |

---

## Success Criteria
- ✓ All 5 issues pass their respective tests
- ✓ No 404 or API errors
- ✓ UI updates without flickering
- ✓ Both services stay running stable
- ✓ Browser console has no errors

---

**Note**: For comprehensive test cases, see `FIXES_SUMMARY.md` in the project root.

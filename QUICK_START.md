# Quick Start Guide — Deliverable 4

## Getting Started in 5 Minutes

### Prerequisites
- Node.js 16+ installed
- Backend running on `http://localhost:3001`
- Supabase instance running (local or remote)

### Step 1: Install Dependencies
```bash
cd frontend
npm install
```

### Step 2: Configure Environment
```bash
# Copy template
cp .env.example .env.local

# Edit .env.local with your Supabase credentials
# VITE_SUPABASE_URL=http://localhost:54321
# VITE_SUPABASE_ANON_KEY=your-key-here
# VITE_API_URL=http://localhost:3001
```

### Step 3: Start Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:5173` (default Vite port).

### Step 4: Log In
Use demo credentials:
- **Student**: student1@university.edu / Password123!
- **Professor**: prof.martin@university.edu / Password123!

---

## What's Implemented

### Requirement 1: Full API Integration ✅
- **Booking System**: Students can book slots or join queues
- **Status Management**: Professors can set their availability status
- **Loading States**: Spinners and disabled buttons during API calls
- **Error Handling**: Clear error messages for failed operations
- **Auto-refresh**: Automatic notification cleanup

### Requirement 2: Real-Time Updates ✅
- **Live Status**: Professor status changes visible instantly
- **Queue Updates**: New queue entries appear without refresh
- **Slot Changes**: Availability changes propagate in real-time
- **No Polling**: Uses Supabase Realtime (WebSockets)

### Requirement 3: Mobile-Responsive ✅
- **Desktop (1024px+)**: Full layout with grid
- **Tablet (768px)**: Two-column, adapted layout
- **Mobile (640px)**: Single-column, full-width
- **Small Mobile (375px)**: Compact, touch-optimized
- **No Pinch-Zoom**: All content readable and clickable

---

## Features Tour

### Student Dashboard
1. **View Professors**: Expandable cards showing each professor
2. **Status Indicators**: Color-coded (green=available, orange=busy, gray=away)
3. **Book Meeting**: Click to book available time slots
4. **Join Queue**: Queue when professor is busy
5. **Real-Time Updates**: See status changes instantly

### Professor Dashboard
1. **Status Toggle**: Switch between Available/Busy/Away
2. **Create Slots**: Add bookable time slots
3. **Queue Management**: View waiting students in FIFO order
4. **Call Next**: Move first student from queue to "called" status
5. **Profile Info**: Display current status and department

### Core Components

#### AvailabilityCard
- Expandable professor card
- Time slot information
- Booking/queue button

#### BookingButton  
- Context-aware (Book/Queue/Unavailable)
- Loading spinner during action
- Error message display

#### QueueList
- Shows queue position and number
- Call next button (professors)
- Leave queue button (students)
- Real-time updates

#### StatusToggle
- Three status buttons
- Visual feedback (active state)
- Loading indicator

---

## Mobile Testing

### Test on Different Devices

**iPhone 12 (390px):**
```
- All buttons visible and tappable
- No horizontal scroll
- Text readable
- Forms full-width
```

**iPad (768px):**
```
- Tablet-optimized layout
- Readable text size
- Touch-friendly spacing
```

**Desktop (1440px):**
```
- Full layout with grid
- All features visible
- Optimal typography
```

### Test with Browser DevTools
1. Open DevTools (F12)
2. Click device icon (top-left)
3. Select different devices
4. Test interactions at each breakpoint

---

## API Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/login` | User authentication |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/logout` | Logout user |
| GET | `/api/professors` | List all professors |
| GET | `/api/availability` | Get available slots |
| POST | `/api/bookings` | Create booking |
| DELETE | `/api/bookings/:id` | Cancel booking |
| POST | `/api/queue` | Join queue |
| DELETE | `/api/queue/:id` | Leave queue |
| GET | `/api/queue/professor/:id` | Get professor's queue |
| POST | `/api/queue/professor/:id/next` | Call next student |
| PATCH | `/api/professors/me/status` | Update professor status |
| POST | `/api/availability` | Create availability slot |

---

## Responsive CSS Breakpoints

```css
/* Desktop: 1024px+ (default) */
/* Tablet: 768px - 1023px */
@media (max-width: 768px) { ... }

/* Mobile: 640px - 767px */
@media (max-width: 640px) { ... }

/* Small Mobile: < 640px */
@media (max-width: 480px) { ... }
```

---

## Real-Time Features

### How Real-Time Works
1. Frontend subscribes to Supabase Realtime channel
2. Backend updates database
3. Supabase broadcasts change via WebSocket
4. All connected clients receive update instantly
5. React state updates, UI re-renders

### Example: Professor Status Change
```
Professor A: "I'm now available" 
  ↓ (sends to API)
Backend: Updates database
  ↓ (Supabase detects change)
Supabase Realtime: Broadcasts update
  ↓ (WebSocket message)
All Students: See status change immediately
```

### Channels Subscribed
- `professors-realtime`: Professor status changes
- `queue-{professorId}`: Queue entry updates
- `availability-realtime`: Slot availability changes

---

## Troubleshooting

### Issue: Blank Screen on Load
**Solution:**
1. Check browser console (F12) for errors
2. Verify backend is running: `curl http://localhost:3001/api/health`
3. Check .env.local file exists
4. Clear browser cache and reload

### Issue: "Invalid email or password"
**Solution:**
1. Check demo credentials above
2. Verify backend database has test users
3. Check API logs for error details

### Issue: Real-time Updates Not Working
**Solution:**
1. Check browser console for Supabase errors
2. Verify VITE_SUPABASE_URL is correct
3. Check Supabase instance is running
4. Look for WebSocket connection in DevTools

### Issue: Buttons Not Working
**Solution:**
1. Open DevTools → Network tab
2. Check API responses (200 vs error codes)
3. Look for 401 errors (token expired)
4. Check console for JavaScript errors

### Issue: Mobile Layout Broken
**Solution:**
1. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
2. Test at exact breakpoint widths (375px, 640px, 768px)
3. Check CSS is loaded (Network tab)
4. Disable browser zoom

---

## Development Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type check (TypeScript)
npx tsc --noEmit

# Format code (if ESLint installed)
npm run lint
```

---

## Build & Deployment

### Local Production Build
```bash
npm run build
npm run preview
```

### Deploy to Vercel (Recommended)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

### Environment Variables for Production
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-key
VITE_API_URL=https://your-backend.com
```

---

## Performance Tips

1. **Clear Cache**: `Ctrl+Shift+Del` or DevTools → Storage → Clear
2. **Check Network**: DevTools → Network tab → Monitor API calls
3. **Monitor Console**: DevTools → Console → Look for warnings/errors
4. **Test Throttling**: DevTools → Network → Throttle connection
5. **Check Real-time**: DevTools → Network → WS (WebSocket connections)

---

## Next Steps

1. **Test on Multiple Devices**: Desktop, tablet, mobile
2. **Test Real-Time**: Open 2 windows, change status in one
3. **Test Edge Cases**: Wrong password, timeout, offline mode
4. **Performance**: Check load time and API response times
5. **Accessibility**: Test with keyboard navigation only

---

## Support

- **Frontend Issues**: Check [frontend/README.md](./frontend/README.md)
- **API Issues**: Check [backend/API.md](./backend/API.md)
- **Supabase Docs**: https://supabase.com/docs
- **React Docs**: https://react.dev
- **Vite Docs**: https://vitejs.dev

---

**Ready to Start?**
```bash
npm install && npm run dev
```

**Questions?** Check the docs folder or the backend API documentation.

Enjoy testing Deliverable 4! 🚀

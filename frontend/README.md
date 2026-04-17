# Frontend — Deliverable 4: Full Integration & UX

React + TypeScript frontend with full API integration, real-time updates, and mobile-responsive design.

## Features Implemented

### ✅ 1. Full API Integration
- All mock data removed, fully wired to backend APIs
- Network latency handling with loading spinners and disabled buttons
- Clear success/error messages for all user actions
- Axios interceptor automatically includes JWT token in all requests

### ✅ 2. Real-Time Updates
- Supabase Realtime subscriptions for live professor status changes
- Queue updates push to students without page refresh
- Availability slot changes propagate instantly
- Real-time professor status changes visible across all connected users

### ✅ 3. Mobile-Responsive Design
- Fully responsive CSS using Flexbox and CSS Grid
- Media queries for 640px, 768px, 1024px breakpoints
- Touch-friendly buttons (44px+ height on mobile)
- Readable text without horizontal scrolling (no pinch-to-zoom needed)
- Optimized layouts for mobile, tablet, and desktop

## Project Structure

```
frontend/
├── src/
│   ├── App.tsx                 # Main app with routing
│   ├── main.tsx               # React entry point
│   ├── components/
│   │   ├── AvailabilityCard.tsx/.css      # Professor availability display
│   │   ├── BookingButton.tsx/.css         # Book/Queue action button
│   │   ├── QueueList.tsx/.css             # Queue display & management
│   │   ├── StatusToggle.tsx/.css          # Professor status selector
│   │   ├── ProtectedRoute.tsx/.css        # Auth-protected routes
│   │   └── ToastNotification.tsx          # Toast notifications
│   ├── hooks/
│   │   ├── useAuth.ts         # Auth context hook
│   │   ├── useBookings.ts     # Bookings hook
│   │   ├── useSocket.ts       # WebSocket hook (optional)
│   │   └── useRealtime.ts     # Supabase Realtime hooks
│   ├── routes/
│   │   ├── LoginPage.tsx/.css
│   │   ├── StudentDashboard.tsx/.css
│   │   └── ProfessorDashboard.tsx/.css
│   ├── services/
│   │   ├── api.ts             # Axios instance with auth
│   │   ├── authService.ts     # Auth API calls
│   │   ├── bookingService.ts  # Booking/Queue/Availability APIs
│   │   └── supabaseClient.ts  # Supabase Realtime client
│   ├── context/
│   │   └── AuthContext.tsx    # Auth state management
│   ├── types/
│   │   ├── Booking.ts
│   │   ├── User.ts
│   │   ├── ProfessorStatus.ts
│   │   └── Queue.ts
│   └── styles/
│       └── main.css           # Global responsive styles
├── .env.example               # Environment variable template
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
├── vite.config.ts             # Vite config
└── index.html                 # HTML entry point
```

## Setup & Installation

### Prerequisites
- Node.js 16+ and npm/yarn
- Backend running on `http://localhost:3001`
- Supabase instance running (local or cloud)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   npm run preview
   ```

## Environment Variables

Create a `.env.local` file in the `frontend/` directory:

```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_URL=http://localhost:3001
```

## Key Components

### Authentication
- **LoginPage**: Email/password login with error handling
- **AuthContext**: Global auth state with token persistence
- **ProtectedRoute**: Role-based route protection (student/professor)

### Student Dashboard
- List of all professors with availability status
- Book available time slots
- Join queue when professor is busy
- View personal queue position
- Real-time status updates

### Professor Dashboard
- Set availability status (available/busy/away)
- Create bookable time slots
- View student queue with FIFO ordering
- Call next student from queue
- Profile information display

### Real-Time Features
- Supabase Realtime channels for:
  - Professor status changes
  - Queue entry updates
  - Availability slot changes
- Automatic UI updates without polling

### Loading & Error States
- Spinner indicators during API calls
- Disabled buttons while loading
- Toast notifications for success/error messages
- Graceful error handling with user-friendly messages

## API Integration

All API calls go through `/src/services/`:

- **authService.ts**: Login, logout, get current user
- **bookingService.ts**: Create/cancel bookings, manage queue, availability slots
- **api.ts**: Configured Axios instance with auth interceptor

### Example Usage

```typescript
// Book a slot
const booking = await bookingService.createBooking(slotId);

// Join queue
const queueEntry = await queueService.joinQueue(professorId);

// Subscribe to real-time updates
const { queueEntries } = useRealtimeQueue(professorId);
```

## Responsive Design

### Breakpoints
- **Desktop**: 1024px+
- **Tablet**: 768px - 1023px
- **Mobile**: 640px - 767px
- **Small Mobile**: < 640px

### Key Features
- Flexbox layouts that stack on mobile
- Touch-friendly button sizes (44px minimum)
- Readable font sizes without zoom
- Optimized form inputs for mobile keyboards
- Collapsible sections on mobile
- Full-width buttons on small screens

## Testing

### Manual Testing Checklist
- [ ] Login with student/professor account
- [ ] View professors on student dashboard
- [ ] Book available slot (verify loading state)
- [ ] Join queue when professor busy (verify loading state)
- [ ] See success/error messages
- [ ] Real-time status updates (open app in 2 windows)
- [ ] Mobile responsiveness (test at 375px, 768px widths)
- [ ] Queue management (add/remove from queue)
- [ ] Create availability slot (professor)
- [ ] Update status (professor)

### Demo Credentials
- **Student**: student1@university.edu / Password123!
- **Professor**: prof.martin@university.edu / Password123!

## Browser Support
- Chrome/Edge (latest)
- Firefox (latest)
- Safari 12+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance Optimizations
- Code splitting via Vite
- CSS modules for component isolation
- Lazy loading routes (optional)
- Real-time subscriptions instead of polling
- Memoization of heavy computations

## Troubleshooting

### Blank screen on load
- Check console for errors
- Verify backend is running on port 3001
- Check SUPABASE_URL and SUPABASE_ANON_KEY in .env

### Real-time updates not working
- Verify Supabase realtime is enabled
- Check browser console for subscription errors
- Ensure SUPABASE_URL and ANON_KEY are correct

### Buttons not responsive
- Check network tab in DevTools
- Verify backend API is returning responses
- Look for 401 errors (token might be expired)

### Mobile layout issues
- Force refresh browser cache (Ctrl+Shift+R)
- Test at actual mobile dimensions
- Check mobile viewport meta tag in index.html

## Next Steps (Deliverable 5+)

- [ ] Add notification system (desktop/push notifications)
- [ ] Implement video conferencing integration
- [ ] Add calendar UI for booking
- [ ] Email confirmations
- [ ] Admin dashboard
- [ ] Analytics and usage reports
- [ ] Mobile app (React Native)

## Technologies Used

- **React 19**: UI library
- **TypeScript**: Type-safe JavaScript
- **Vite**: Lightning-fast build tool
- **React Router**: Client-side routing
- **Axios**: HTTP client
- **Supabase**: Database, Auth, Real-time
- **CSS3**: Responsive styling (Flexbox, Grid)

## Contributing

- Follow TypeScript strict mode
- Use component-scoped CSS files
- Test responsive design at multiple breakpoints
- Add loading/error states for all async operations
- Use semantic HTML for accessibility

## License

Part of Integrative Project 2026 — Champlain Regional College

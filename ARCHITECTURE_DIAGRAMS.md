# Deliverable 4: Architecture & Data Flow Diagrams

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       FRONTEND (React + TypeScript)             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    React Components                       │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │                                                           │   │
│  │  LoginPage ──┐                                            │   │
│  │              ├─► ProtectedRoute ──┐                      │   │
│  │  AuthContext─┘                    ├─► StudentDashboard  │   │
│  │                                   │    • AvailabilityCard│   │
│  │              ┌────────────────────┴─► • BookingButton    │   │
│  │              │                         • QueueList       │   │
│  │              └────────────────────┬─► ProfessorDashboard│   │
│  │                                   │    • StatusToggle    │   │
│  │                                   │    • QueueList       │   │
│  │                                   │    • Slot Form       │   │
│  │                                   │                      │   │
│  └──────────────────────────────────┬──────────────────────┘   │
│                                      │                          │
│  ┌──────────────────────────────────▼──────────────────────┐   │
│  │                    Services Layer                        │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │                                                           │   │
│  │  • authService      (JWT auth)                           │   │
│  │  • bookingService   (Bookings, Queue, Availability)     │   │
│  │  • supabaseClient   (Realtime subscriptions)             │   │
│  │  • api.ts           (Axios with interceptors)            │   │
│  │                                                           │   │
│  └──────────────┬────────────────────┬─────────────────────┘   │
│                 │                    │                          │
│  ┌──────────────▼──────────────────────▼─────────────────────┐  │
│  │              Custom Hooks                                 │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │                                                           │  │
│  │  • useAuth              (Auth state)                      │  │
│  │  • useRealtime          (Supabase subscriptions)          │  │
│  │  • useRealtimeProfessors (Professor updates)             │  │
│  │  • useRealtimeQueue     (Queue updates)                   │  │
│  │  • useRealtimeAvailability (Slot updates)                │  │
│  │                                                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              State Management                             │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │                                                           │  │
│  │  • React Context (AuthContext)  ──► Global Auth State    │  │
│  │  • Component State (useState)   ──► Local Component State│  │
│  │  • Real-time State (useRealtime)──► Live Data Streams   │  │
│  │                                                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Responsive CSS                               │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  • main.css (730 lines)                                  │  │
│  │  • 4 breakpoints (1024px, 768px, 640px, 480px)          │  │
│  │  • Flexbox, Grid, Media Queries                          │  │
│  │  • Mobile-first approach                                 │  │
│  │                                                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└────┬─────────────────────────────────────────────────────┬─────┘
     │                                                     │
     │ HTTP/REST                                           │ WebSocket
     │ (Axios with JWT)                                    │ (Supabase Realtime)
     │                                                     │
┌────▼─────────────────────────────────────────────────────▼─────┐
│                   BACKEND & DATABASE                           │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐    ┌──────────────────┐                 │
│  │  Express API     │    │ Supabase Realtime│                 │
│  │  (port 3001)     │───►│  (WebSocket)     │                 │
│  │                  │    │  PostgreSQL      │                 │
│  │ • /api/auth      │    │  Changes         │                 │
│  │ • /api/professors│    │                  │                 │
│  │ • /api/bookings  │    │  Channels:       │                 │
│  │ • /api/queue     │    │  • professors    │                 │
│  │ • /api/availability   │  • queue         │                 │
│  │                  │    │  • availability  │                 │
│  └──────────────────┘    └──────────────────┘                 │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │           PostgreSQL Database                           │   │
│  ├────────────────────────────────────────────────────────┤   │
│  │ Tables:                                                │   │
│  │ • users (professors & students)                        │   │
│  │ • professors (dept, status)                            │   │
│  │ • availability_slots (start_time, end_time, status)    │   │
│  │ • bookings (student_id, slot_id, status)               │   │
│  │ • queue_entries (professor_id, student_id, position)   │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Student Booking Meeting

```
Student Opens App
      ↓
┌─────────────────────────────────────┐
│ LoginPage                            │
│ • Email: student1@university.edu    │
│ • Password: Password123!             │
│ • Click "Sign In"                    │
└────────────┬────────────────────────┘
             │
             ▼
     POST /api/auth/login
        (axios request)
             │
             ▼
    Backend verifies credentials
             │
             ▼
    Returns JWT token + user info
             │
             ▼
┌─────────────────────────────────────┐
│ StudentDashboard                     │
│ • GET /api/professors                │
│ • GET /api/availability              │
│ • Subscribe to Realtime              │
└────────────┬────────────────────────┘
             │
             ▼
   Display Professor List
   [Dr. Alice Martin - Available]
             │
             ▼
┌─────────────────────────────────────┐
│ Student Clicks "Book Now"            │
│ • Loading spinner appears            │
│ • Button disabled                    │
│ • Text: "Booking..."                 │
└────────────┬────────────────────────┘
             │
             ▼
  POST /api/bookings
    {slot_id: "xyz"}
    (with JWT token)
             │
             ▼
  Backend validates & inserts booking
  (checks 1 active per student limit)
             │
             ▼
  Returns {success: true, data: booking}
             │
             ▼
┌─────────────────────────────────────┐
│ Success Toast Notification           │
│ "✓ Booking confirmed!"               │
│ (auto-dismisses after 3 seconds)     │
└─────────────────────────────────────┘
             │
             ▼
   Professor sees booking
   (via Realtime subscription)
             │
             ▼
  All students see status update
  (queue updated if other students)
```

---

## Data Flow: Real-Time Status Update

```
Professor's Computer              Backend DB           Student's Computer
     │                                 │                      │
     │ Click "Busy" button             │                      │
     │                                 │                      │
     ├─► PATCH /api/professors/me/status
     │        {status: "busy"}         │                      │
     │                                 │                      │
     │                          Updates professors table
     │                                 │                      │
     │                          Triggers realtime event
     │                                 │                      │
     │                      ╔═══════════╩═════════════╗        │
     │                      ║ Supabase Realtime        ║        │
     │                      ║ WebSocket Broadcast      ║        │
     │                      ╚═════════════╦═══════════╝        │
     │                                    │                    │
     │ Button state updates              │     Subscription receives
     │ Immediately shows "Busy"          │     UPDATE event
     │                                   │                    │
     │                                   │     React state updates
     │                                   │                    │
     │                                   │     Component re-renders
     │                                   │                    │
     │                                   │     Student sees:
     │                                   │     "Dr. Alice - Busy"
     │                                   │     "Join Queue" button
     │                                   │
     │◄──────── 500ms latency ──────────┤
     │
     └── No page refresh needed ────────────────────────────┘
```

---

## Component Hierarchy

```
App
├── Routes
│   ├── Route /login
│   │   └── LoginPage
│   │       ├── form (email, password)
│   │       └── AuthContext.setUser()
│   │
│   ├── Route /student
│   │   └── ProtectedRoute (role: "student")
│   │       └── StudentDashboard
│   │           ├── useAuth() → user info
│   │           ├── api.get("/api/professors")
│   │           ├── useRealtimeProfessors()
│   │           ├── StateManagement
│   │           │   ├── professors
│   │           │   ├── slots
│   │           │   ├── loading
│   │           │   └── error
│   │           └── Rendering
│   │               └── Map professors
│   │                   └── AvailabilityCard
│   │                       ├── Professor info
│   │                       ├── Slot details
│   │                       └── BookingButton
│   │                           ├── bookingService.createBooking()
│   │                           ├── queueService.joinQueue()
│   │                           └── Toast notification
│   │
│   ├── Route /professor
│   │   └── ProtectedRoute (role: "professor")
│   │       └── ProfessorDashboard
│   │           ├── useAuth() → user info
│   │           ├── api.get("/api/auth/me")
│   │           ├── StateManagement
│   │           │   ├── professor
│   │           │   ├── loading
│   │           │   ├── error
│   │           │   └── slotForm
│   │           └── Components
│   │               ├── StatusToggle
│   │               │   └── professorService.updateStatus()
│   │               ├── Slot Creation Form
│   │               │   └── api.post("/api/availability")
│   │               ├── QueueList
│   │               │   ├── useRealtimeQueue()
│   │               │   ├── queueService.callNextStudent()
│   │               │   └── Queue items
│   │               └── Profile Info
│   │                   └── User data display
```

---

## State Management Flow

```
┌─────────────────────────────────────────┐
│ AuthContext (Global)                    │
├─────────────────────────────────────────┤
│ • user (current logged-in user)         │
│ • loading (auth init loading)           │
│ • setUser(user) (login)                 │
│ • logout() (logout)                     │
│                                         │
│ Persisted in: localStorage (token)      │
│ Restored on: App mount                  │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Component State (Local)                 │
├─────────────────────────────────────────┤
│ StudentDashboard:                       │
│ • professors: Professor[]               │
│ • slots: AvailabilitySlot[]             │
│ • loading: boolean                      │
│ • error: string | null                  │
│                                         │
│ ProfessorDashboard:                     │
│ • professor: ProfessorProfile           │
│ • status: 'available'|'busy'|'away'     │
│ • queueList: QueueEntry[]               │
│                                         │
│ LoginPage:                              │
│ • email: string                         │
│ • password: string                      │
│ • loading: boolean                      │
│ • error: string | null                  │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Real-Time State (Supabase Realtime)     │
├─────────────────────────────────────────┤
│ useRealtimeProfessors():                │
│ • professors updated on DB change       │
│ • Subscription: professors table        │
│                                         │
│ useRealtimeQueue(professorId):          │
│ • queueEntries updated on DB change     │
│ • Subscription: queue_entries table     │
│                                         │
│ useRealtimeAvailability(professorId):   │
│ • slots updated on DB change            │
│ • Subscription: availability_slots      │
│                                         │
│ Cleanup: useEffect() return cleanup     │
└─────────────────────────────────────────┘
```

---

## API Call Sequence: Book Meeting

```
Timeline:
   0ms ┌─ Student clicks "Book Now"
       │
   5ms │ Loading spinner starts
       │ Button disabled
       │
  10ms │ POST /api/bookings sent
       │ {
       │   slot_id: "uuid",
       │   Authorization: "Bearer {jwt_token}"
       │ }
       │
 100ms │ Backend validates:
       │ • Token valid?
       │ • Student role?
       │ • Slot exists?
       │ • Slot available?
       │ • Already has booking?
       │ • DB trigger enforces limit
       │
 110ms │ Booking inserted to DB
       │
 150ms │ Response: {success: true, data: {booking}}
       │
 155ms │ Component receives response
       │ • Loading spinner stops
       │ • Button text changes
       │ • setSuccess(true)
       │
 160ms │ Success toast appears:
       │ "✓ Booking confirmed!"
       │
 200ms │ Supabase Realtime broadcasts:
       │ UPDATE professors table
       │ UPDATE availability_slots table
       │
 250ms │ useRealtime hooks receive event
       │ React state updates
       │ Components re-render
       │
 300ms │ All students see:
       │ • Slot marked as "booked"
       │ • Professor status updated
       │ • Queue updated
       │
3000ms │ Toast notification auto-dismisses
       │
Total: Booking complete in ~300ms
       Toast visible for 3 seconds
```

---

## Error Handling Flow

```
User Action
    │
    ▼
┌─────────────────────┐
│ Try API Call        │
└────────┬────────────┘
         │
    ┌────┴─────────────────────┐
    │                          │
    ▼                          ▼
Success                    Error
   │                          │
   ├─ 200 OK                  ├─ 400 Bad Request
   │                          │   └─ "Invalid slot_id"
   │                          │
   ├─ Show success            ├─ 401 Unauthorized
   │  toast                   │   └─ "Token expired"
   │                          │
   │                          ├─ 409 Conflict
   │                          │   └─ "Already in queue"
   │                          │
   │                          ├─ 500 Server Error
   │                          │   └─ "Server error"
   │                          │
   │                          ├─ Network Timeout
   │                          │   └─ "Connection failed"
   │                          │
   │                          ▼
   │                    ┌─────────────────────┐
   │                    │ catch(err) block    │
   │                    ├─────────────────────┤
   │                    │ Extract error msg   │
   │                    │ Set error state     │
   │                    │ Show error toast    │
   │                    │ (3 sec auto-dismiss)│
   │                    └─────────────────────┘
   │
   ▼
┌─────────────────────┐
│ State Updates       │
├─────────────────────┤
│ • loading = false   │
│ • error = msg       │
│ • Button enabled    │
└─────────────────────┘
    │
    ▼
User can retry or try different action
```

---

## Responsive Design Breakpoints

```
Desktop               Tablet                Mobile              Small Mobile
1024px+               768px-1023px          640px-767px         <640px
│                     │                     │                   │
│ ┌─────────────────┐ │ ┌─────────────────┐ │ ┌─────────────────┐│
│ │ ┌─────┬─────┬─────┐ │ ┌─────┬─────────┐ │ │ ┌───────────────┐││
│ │ │   │   │   │ │ │       │       │ │ │ │             │││
│ │ │ P │ P │ P │ │ │   P   │   P   │ │ │ │      P      │││
│ │ │   │   │   │ │ │       │       │ │ │ │             │││
│ │ └─────┴─────┴─────┘ │ └─────┴─────────┘ │ │ └───────────────┘││
│ │ 3 professors/row  │ │ 2 professors/row │ │ 1 professor/row   │
│ │                   │ │                   │ │                   │
│ │ Full buttons      │ │ Adapted buttons   │ │ Full-width buttons││
│ │                   │ │                   │ │                   │
│ │ Large text        │ │ Medium text       │ │ Smaller text      │
│ │                   │ │                   │ │                   │
│ └─────────────────┘ │ └─────────────────┘ │ └───────────────┘  │
│                     │                     │                   │
└─────────────────────┴─────────────────────┴───────────────────┘

Key Changes at Each Breakpoint:
├─ 1024px: .grid-cols-3 (3 columns)
├─ 768px: .grid-cols-2 (2 columns)
├─ 640px: .grid-cols-1 (1 column)
└─ <640px: Full-width, compact spacing
```

---

## Mobile Responsive Touch Targets

```
Touch Area Requirement: 44px × 44px minimum

┌──────────────────────────────────────────────┐
│                   Mobile Layout              │
├──────────────────────────────────────────────┤
│                                              │
│  Header (50px)                               │
│  ┌──────────────────────────────────────┐    │
│  │ Office Hours ← "hamburger" possible  │    │
│  └──────────────────────────────────────┘    │
│                                              │
│  Professor Card (90px+)                      │
│  ┌──────────────────────────────────────┐    │
│  │ Dr. Alice Martin    [Available ▼]    │    │
│  │ Computer Science                     │    │
│  │                                      │    │
│  │ [Expanded Section - 10px margin]     │    │
│  │ Time: Monday 2:00 PM - 3:00 PM       │    │
│  │                                      │    │
│  │  ┌────────────────────────────────┐  │    │
│  │  │ ✓ Book Now (44px tall button)  │  │    │
│  │  └────────────────────────────────┘  │    │
│  └──────────────────────────────────────┘    │
│  (12px margin between cards)                 │
│                                              │
│  Status Toggle                               │
│  ┌──────────────────────────────────────┐    │
│  │ Availability Status                  │    │
│  │                                      │    │
│  │  ┌─────────────────────────────────┐ │    │
│  │  │ ● Available (44px tall)         │ │    │
│  │  ├─────────────────────────────────┤ │    │
│  │  │ ● Busy (44px tall)              │ │    │
│  │  ├─────────────────────────────────┤ │    │
│  │  │ ● Away (44px tall)              │ │    │
│  │  └─────────────────────────────────┘ │    │
│  └──────────────────────────────────────┘    │
│  (8px gap between buttons)                   │
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │ No pinch-zoom required ✓             │    │
│  │ No horizontal scroll ✓               │    │
│  │ Text readable (14px+) ✓              │    │
│  └──────────────────────────────────────┘    │
│                                              │
└──────────────────────────────────────────────┘
```

---

## Tech Stack Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                   │
├─────────────────────────────────────────────────────────┤
│ React 19 + TypeScript                                   │
│ • Functional components with hooks                      │
│ • Type-safe props and state                             │
│ • Component composition                                 │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                    Routing Layer                        │
├─────────────────────────────────────────────────────────┤
│ React Router 7                                          │
│ • Client-side routing                                   │
│ • Protected routes by role                              │
│ • Navigation without page refresh                       │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                    State Management                     │
├─────────────────────────────────────────────────────────┤
│ React Context + Hooks                                   │
│ • Global auth state                                     │
│ • Component-level state                                 │
│ • Real-time subscription state                          │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                    API Layer                            │
├─────────────────────────────────────────────────────────┤
│ Axios + Interceptors                                    │
│ • Automatic JWT injection                               │
│ • Global error handling                                 │
│ • Request/response transformation                       │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                 Real-Time Layer                         │
├─────────────────────────────────────────────────────────┤
│ Supabase Realtime (WebSocket)                           │
│ • Professor updates                                     │
│ • Queue changes                                         │
│ • Slot availability                                     │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              Backend & Database                         │
├─────────────────────────────────────────────────────────┤
│ Node.js + Express (REST API)                            │
│ PostgreSQL + Supabase                                   │
│ JWT Authentication                                      │
└─────────────────────────────────────────────────────────┘
```

---

This architecture provides:
- ✅ Separation of concerns
- ✅ Type safety throughout
- ✅ Real-time synchronization
- ✅ Responsive design
- ✅ Error handling
- ✅ Performance optimization
- ✅ Maintainability
- ✅ Scalability

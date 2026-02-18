# Backend — Integrative Project 2026

Node.js + Express + TypeScript API backed by Supabase (PostgreSQL + Auth).

---

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js |
| Framework | Express |
| Language | TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (JWT) |
| Real-time | Supabase Realtime (used by frontend directly) |

---

## Project Structure

```
backend/
├── src/
│   ├── index.ts              # Express app entry point
│   ├── config/
│   │   └── supabase.ts       # Supabase clients (standard + admin)
│   ├── middleware/
│   │   └── auth.ts           # JWT verification + role guard middleware
│   ├── routes/
│   │   ├── auth.ts           # /api/auth — login, logout, /me
│   │   ├── professors.ts     # /api/professors — list, single professor
│   │   └── students.ts       # /api/students — list (professor only), /me
│   └── types/
│       └── index.ts          # Shared TypeScript types
├── scripts/
│   ├── seed.ts               # Creates 5 professors + 20 students in Supabase
│   └── tsconfig.json         # tsconfig for seed script execution
├── supabase/
│   └── schema.sql            # Run this first in Supabase SQL Editor
├── .env.example              # Copy to .env and fill in values
├── package.json
└── tsconfig.json
```

---

## Setup (Local Dev)

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Wait for the project to finish provisioning.
3. Go to **Project Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon / public key** → `SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` *(keep this secret)*

### 2. Apply the database schema

1. In Supabase Dashboard: **SQL Editor → New Query**
2. Paste the contents of `supabase/schema.sql`
3. Click **Run** — you should see success for each statement

### 3. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your Supabase values:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=3001
FRONTEND_URL=http://localhost:5173
```

### 4. Install dependencies

```bash
npm install
```

### 5. Seed the database

This creates 5 professors and 20 students in Supabase Auth and the DB tables.

```bash
npm run seed
```

Output will list all created accounts and the default password (`Password123!`).

### 6. Start the dev server

```bash
npm run dev
```

Server starts at: `http://localhost:3001`

Verify it's running:
```bash
curl http://localhost:3001/api/health
# → { "status": "ok", "timestamp": "..." }
```

---

## Test Credentials (post-seed)

All accounts use the password: **`Password123!`**

| Role | Email |
|---|---|
| Professor A | `prof.martin@university.edu` |
| Professor B | `prof.chen@university.edu` |
| Professor C | `prof.johnson@university.edu` |
| Professor D | `prof.rivera@university.edu` |
| Professor E | `prof.nguyen@university.edu` |
| Student A | `student1@university.edu` |
| Student B | `student2@university.edu` |
| ... | `student3–20@university.edu` |

---

## Authentication Overview

This backend uses **Supabase Auth JWTs**.

### Flow

```
1. Frontend sends POST /api/auth/login  { email, password }
2. Backend calls Supabase Auth signInWithPassword
3. Supabase returns a JWT access_token
4. Backend fetches the user's role from the profiles table
5. Backend returns: { access_token, user: { id, email, role, full_name } }
6. Frontend stores the token (localStorage or React context)
7. Frontend sends the token on every request: Authorization: Bearer <token>
8. Backend middleware verifies the token on protected routes
```

### Role Separation

| Role | What they see |
|---|---|
| `student` | List of professors, their own profile |
| `professor` | List of professors, list of all students |

---

## API Reference

See [API.md](./API.md) for the full endpoint documentation (intended for the frontend teammate).

---

## Common Issues

**"Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env"**
→ Make sure you copied `.env.example` to `.env` and filled in the values.

**Seed fails with "already exists"**
→ That's fine — the seed script skips existing users. Re-runs are safe.

**CORS errors from the frontend**
→ Make sure `FRONTEND_URL` in `.env` matches the exact URL your React app runs on (default: `http://localhost:5173`).

**Token rejected (401)**
→ The Supabase JWT expires after 1 hour by default. The frontend should use the refresh token or call `/api/auth/login` again.

---

## npm Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start server with hot reload (nodemon) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled `dist/index.js` (production) |
| `npm run seed` | Seed professors + students into Supabase |

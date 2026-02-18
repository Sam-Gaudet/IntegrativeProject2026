-- ═══════════════════════════════════════════════════════════════════
-- DELIVERABLE 2 — Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════════
-- 
-- HOW TO APPLY:
--   1. Open your Supabase project
--   2. Go to: SQL Editor (left sidebar)
--   3. Paste this entire file and click "Run"
--   4. You should see "Success" for each statement
--   5. Then run the seed script: npm run seed
-- ═══════════════════════════════════════════════════════════════════

-- ─── PROFILES ────────────────────────────────────────────────────────────────
-- Master user table. One row per Supabase Auth user.
-- Linked to auth.users via id (UUID).
-- The 'role' column drives all access control decisions on the backend.

CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  full_name   TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('student', 'professor')),
  department  TEXT,           -- Only populated for professors
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── PROFESSORS ──────────────────────────────────────────────────────────────
-- Extended profile for professor-specific data.
-- availability_status controls what students see on their dashboard.

CREATE TABLE IF NOT EXISTS professors (
  id                   UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  full_name            TEXT NOT NULL,
  email                TEXT NOT NULL,
  department           TEXT NOT NULL,
  availability_status  TEXT NOT NULL DEFAULT 'available'
                         CHECK (availability_status IN ('available', 'busy', 'away')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── STUDENTS ────────────────────────────────────────────────────────────────
-- Extended profile for student-specific data.

CREATE TABLE IF NOT EXISTS students (
  id          UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────
-- RLS ensures users can only read data they are allowed to see,
-- even if someone tries to query Supabase directly (bypassing the backend).
-- The backend uses service_role which bypasses RLS — so RLS is a safety net
-- for direct DB access, not the primary enforcement layer.

ALTER TABLE profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE professors ENABLE ROW LEVEL SECURITY;
ALTER TABLE students   ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read their own row only
CREATE POLICY "profiles: own row only"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Professors: any authenticated user can view the professors list (needed for student dashboard)
CREATE POLICY "professors: authenticated users can read"
  ON professors FOR SELECT
  TO authenticated
  USING (true);

-- Students: only professors can read the student list
CREATE POLICY "students: professors can read"
  ON students FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'professor'
    )
  );

-- Students: students can read only their own row
CREATE POLICY "students: own row only"
  ON students FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- ─── AUTO-POPULATE PROFILE TRIGGER ───────────────────────────────────────────
-- When a user is created in Supabase Auth, automatically create their profile row.
-- This is fired by the seed script creating users via supabase.auth.admin.createUser().

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role, department)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    NEW.raw_user_meta_data->>'department'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

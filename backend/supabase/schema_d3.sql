-- ═══════════════════════════════════════════════════════════════════
-- DELIVERABLE 3 — Schema Addition
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- This is ADDITIVE — it does not touch existing D2 tables.
-- Make sure you have already run schema.sql from D2 first.
-- ═══════════════════════════════════════════════════════════════════

-- ─── AVAILABILITY SLOTS ───────────────────────────────────────────────────────
-- Each row is a bookable time block created by a professor.
-- status: 'available' → ready to book | 'booked' → taken | 'cancelled' → removed

CREATE TABLE IF NOT EXISTS availability_slots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id  UUID NOT NULL REFERENCES professors(id) ON DELETE CASCADE,
  start_time    TIMESTAMPTZ NOT NULL,
  end_time      TIMESTAMPTZ NOT NULL,
  status        TEXT NOT NULL DEFAULT 'available'
                  CHECK (status IN ('available', 'booked', 'cancelled')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── BOOKINGS ────────────────────────────────────────────────────────────────
-- Each row is a student's confirmed booking for a slot.
--
-- UNIQUE on slot_id: only one booking can ever exist per slot at the DB level.
-- This is Fairness Layer 2 (DB constraint) preventing double-booking even under
-- concurrent requests.

CREATE TABLE IF NOT EXISTS bookings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id     UUID NOT NULL UNIQUE REFERENCES availability_slots(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'cancelled', 'completed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── QUEUE ENTRIES ────────────────────────────────────────────────────────────
-- Students waiting for a professor's next available slot.
-- FIFO is enforced by ordering on created_at ASC (oldest = first promoted).
-- promoted_at is set when the student moves from 'waiting' to 'promoted'.

CREATE TABLE IF NOT EXISTS queue_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id  UUID NOT NULL REFERENCES professors(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'waiting'
                  CHECK (status IN ('waiting', 'promoted', 'cancelled', 'expired')),
  promoted_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent a student from being in 'waiting' state twice for the same professor.
-- This is a partial unique index so it only applies to active queue entries.
CREATE UNIQUE INDEX IF NOT EXISTS queue_unique_waiting
  ON queue_entries (professor_id, student_id)
  WHERE status = 'waiting';


-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────
-- The backend uses service_role (supabaseAdmin) which bypasses RLS entirely.
-- These policies are a safety net for anyone accessing Supabase directly.

ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_entries       ENABLE ROW LEVEL SECURITY;

-- Slots: any authenticated user can read
CREATE POLICY "slots: authenticated read"
  ON availability_slots FOR SELECT
  TO authenticated
  USING (true);

-- Bookings: students see their own; professors see bookings on their slots
CREATE POLICY "bookings: student own or professor slot owner"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM availability_slots s
      WHERE s.id = slot_id AND s.professor_id = auth.uid()
    )
  );

-- Queue: students see their own entries; professors see their queue
CREATE POLICY "queue: own entries"
  ON queue_entries FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR professor_id = auth.uid()
  );


-- ═══════════════════════════════════════════════════════════════════
-- FAIRNESS RULE — Server Authority Proof
-- ═══════════════════════════════════════════════════════════════════
--
-- Rule: A student may hold at most 1 active booking at a time.
--
-- Enforcement layers:
--   1. API handler (bookings.ts): Counted before insert, returns HTTP 409.
--   2. THIS TRIGGER: Fires BEFORE every INSERT into bookings.
--      Even if someone bypasses the API entirely (Postman, curl, direct Supabase call),
--      this trigger will reject the insert with a Postgres exception.
--
-- This is the proof that the rule is NOT just a disabled button in the UI.

CREATE OR REPLACE FUNCTION check_booking_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  active_count INTEGER;
BEGIN
  SET search_path = public;

  SELECT COUNT(*) INTO active_count
  FROM bookings
  WHERE student_id = NEW.student_id
    AND status = 'active';

  IF active_count >= 1 THEN
    RAISE EXCEPTION 'max_booking_limit_exceeded: This student already has an active booking. Cancel it before booking again.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_booking_limit ON bookings;
CREATE TRIGGER enforce_booking_limit
  BEFORE INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION check_booking_limit();

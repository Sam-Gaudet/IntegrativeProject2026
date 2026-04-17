-- ═══════════════════════════════════════════════════════════════════
-- DELIVERABLE 4 — Schema Fixes
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- This patches the D3 trigger to match the per-professor booking logic.
-- ═══════════════════════════════════════════════════════════════════

-- ─── FIX: Booking limit now checked PER PROFESSOR (not globally) ─────────────
--
-- WHY: The API was updated in D4 to allow a student to have one active booking
-- per professor (not one globally). The original D3 trigger was still checking
-- globally, causing it to block valid bookings with a second professor.
--
-- The rule: A student may hold at most 1 active booking per professor.

CREATE OR REPLACE FUNCTION check_booking_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  active_count INTEGER;
  target_professor_id UUID;
BEGIN
  SET search_path = public;

  -- Find the professor this slot belongs to
  SELECT professor_id INTO target_professor_id
  FROM availability_slots
  WHERE id = NEW.slot_id;

  -- Count how many active bookings this student already has with THIS professor
  SELECT COUNT(*) INTO active_count
  FROM bookings b
  JOIN availability_slots s ON s.id = b.slot_id
  WHERE b.student_id = NEW.student_id
    AND b.status = 'active'
    AND s.professor_id = target_professor_id;

  IF active_count >= 1 THEN
    RAISE EXCEPTION 'max_booking_limit_exceeded: This student already has an active booking with this professor. Cancel it before booking another slot.';
  END IF;

  RETURN NEW;
END;
$$;

-- Re-create the trigger (the function replacement is enough, but this ensures a clean state)
DROP TRIGGER IF EXISTS enforce_booking_limit ON bookings;
CREATE TRIGGER enforce_booking_limit
  BEFORE INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION check_booking_limit();

-- ─── FIX: Add 'pending' to bookings.status CHECK constraint ──────────────────
--
-- WHY: The queue promotion flow creates bookings with status='pending' so the
-- student can review and accept before the booking becomes active. The original
-- schema only allowed ('active', 'cancelled', 'completed'), blocking every
-- pending insert at the DB level and causing "No pending booking found" errors.
--
-- Drop the old constraint and add a new one that includes 'pending'.

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('active', 'cancelled', 'completed', 'pending'));

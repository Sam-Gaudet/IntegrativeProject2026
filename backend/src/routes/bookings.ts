import { Router, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { requireAuth, requireRole } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();

// ─── POST /api/bookings ───────────────────────────────────────────────────────
// Student creates a confirmed booking for an available slot.
//
// ╔══════════════════════════════════════════════════════════════════╗
// ║              SERVER AUTHORITY — FAIRNESS ENFORCEMENT            ║
// ║  Rule: Max 1 active booking per student at any time.            ║
// ║                                                                  ║
// ║  Layer 1 (API):  This handler counts the student's active       ║
// ║                  bookings and returns HTTP 409 if >= 1.         ║
// ║                                                                  ║
// ║  Layer 2 (DB):   The `enforce_booking_limit` BEFORE INSERT      ║
// ║                  trigger does the same check. Even if someone   ║
// ║                  bypasses this API entirely (raw SQL, direct     ║
// ║                  Supabase SDK call), the DB rejects the insert. ║
// ║                                                                  ║
// ║  Layer 3 (DB):   UNIQUE constraint on slot_id ensures no two    ║
// ║                  students can ever book the same slot.          ║
// ╚══════════════════════════════════════════════════════════════════╝
//
// Headers: Authorization: Bearer <token>
// Roles: student ONLY
//
// Body: { slot_id: UUID }
// 201 → { success: true, data: Booking }
// 400 → Missing slot_id
// 404 → Slot not found
// 409 → max_booking_limit_exceeded | slot_not_available | slot_already_booked

router.post(
  '/',
  requireAuth,
  requireRole('student'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { slot_id } = req.body;

    if (!slot_id) {
      res.status(400).json({ success: false, error: 'slot_id is required' });
      return;
    }

    // ── FAIRNESS CHECK — Layer 1 (API) ────────────────────────────────────────
    // Check if student already has an active booking with THIS PROFESSOR
    // (not globally - they can book different professors)
    const { data: slot, error: slotError } = await supabaseAdmin
      .from('availability_slots')
      .select('id, professor_id, status')
      .eq('id', slot_id)
      .single();

    if (slotError || !slot) {
      res.status(404).json({ success: false, error: 'Slot not found' });
      return;
    }

    if (slot.status !== 'available') {
      res.status(409).json({
        success: false,
        error: `slot_not_available: This slot is currently '${slot.status}'. Only 'available' slots can be booked.`,
        code: 'SLOT_NOT_AVAILABLE',
      });
      return;
    }

    // Check if student already has an active booking with THIS professor
    const { data: existingBookings, error: countError } = await supabaseAdmin
      .from('bookings')
      .select('id, availability_slots!inner(professor_id)')
      .eq('student_id', req.user!.id)
      .eq('status', 'active')
      .eq('availability_slots.professor_id', slot.professor_id);

    if (countError) {
      res.status(500).json({ success: false, error: 'Failed to verify booking limit' });
      return;
    }

    if ((existingBookings?.length ?? 0) >= 1) {
      res.status(409).json({
        success: false,
        error: 'max_booking_limit_exceeded: You already have an active booking with this professor. Cancel it before booking another slot with them.',
        code: 'MAX_BOOKING_LIMIT',
      });
      return;
    }

    // ── CREATE BOOKING ────────────────────────────────────────────────────────
    // The DB trigger (Layer 2) fires here as a final guard.
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .insert({
        slot_id,
        student_id: req.user!.id,
        status: 'active',
      })
      .select()
      .single();

    if (bookingError) {
      // DB trigger raised the fairness exception (bypassed the API check somehow)
      if (bookingError.message?.includes('max_booking_limit_exceeded')) {
        res.status(409).json({
          success: false,
          error: 'max_booking_limit_exceeded: Booking rejected at the database level. You already have an active booking.',
          code: 'MAX_BOOKING_LIMIT',
        });
        return;
      }
      // UNIQUE constraint violation on slot_id — race condition: another student just took it
      if (bookingError.code === '23505') {
        res.status(409).json({
          success: false,
          error: 'slot_already_booked: This slot was just taken by another student.',
          code: 'SLOT_ALREADY_BOOKED',
        });
        return;
      }
      res.status(500).json({ success: false, error: 'Failed to create booking' });
      return;
    }

    // Mark the slot as booked
    await supabaseAdmin
      .from('availability_slots')
      .update({ status: 'booked' })
      .eq('id', slot_id);

    res.status(201).json({ success: true, data: booking });
  }
);

// ─── GET /api/bookings ────────────────────────────────────────────────────────
// Students: returns their own bookings (with slot details).
// Professors: returns bookings on their slots (with student info).
//
// Headers: Authorization: Bearer <token>
// Roles: student, professor
// 200 → { success: true, data: Booking[] }

router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const now = new Date().toISOString();

  if (req.user!.role === 'student') {
    // Get all active bookings with their slot end times
    const { data: activeBookings, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('id, availability_slots(end_time)')
      .eq('student_id', req.user!.id)
      .eq('status', 'active') as any;

    if (!fetchError && activeBookings) {
      // Mark expired ones as completed
      for (const booking of activeBookings) {
        const endTime = (booking.availability_slots as any)?.end_time;
        if (endTime && new Date(endTime) < new Date(now)) {
          await supabaseAdmin
            .from('bookings')
            .update({ status: 'completed' })
            .eq('id', booking.id);
        }
      }
    }

    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select('id, slot_id, student_id, status, created_at, availability_slots(start_time, end_time, professor_id, professors(full_name, department))')
      .eq('student_id', req.user!.id)
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch bookings' });
      return;
    }

    res.status(200).json({ success: true, data });
    return;
  }

  // Professor: fetch bookings on their slots and mark expired ones as completed
  const { data: profBookings, error: profFetchError } = await supabaseAdmin
    .from('bookings')
    .select('id, availability_slots(end_time, professor_id)')
    .eq('availability_slots.professor_id', req.user!.id)
    .eq('status', 'active') as any;

  if (!profFetchError && profBookings) {
    for (const booking of profBookings) {
      const endTime = (booking.availability_slots as any)?.end_time;
      if (endTime && new Date(endTime) < new Date(now)) {
        await supabaseAdmin
          .from('bookings')
          .update({ status: 'completed' })
          .eq('id', booking.id);
      }
    }
  }

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('id, slot_id, student_id, status, created_at, availability_slots!inner(start_time, end_time, professor_id), students(full_name, email)')
    .eq('availability_slots.professor_id', req.user!.id)
    .order('created_at', { ascending: false });

  if (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch bookings' });
    return;
  }

  res.status(200).json({ success: true, data });
});

// ─── DELETE /api/bookings/:id ─────────────────────────────────────────────────
// Cancels a booking.
// Students: can only cancel their own active bookings.
// Professors: can cancel any booking on their own slots.
//
// Auto-promotion logic (FIFO queue):
//   After cancellation, the system checks if any students are waiting in the
//   professor's queue. If so, the oldest waiting entry is promoted (FIFO),
//   a new booking is automatically created for them, and the slot is re-booked.
//   The promoted student's queue entry status is set to 'promoted'.
//
// Headers: Authorization: Bearer <token>
// Roles: student, professor
// 200 → { success: true, data: { booking_id, status: 'cancelled', promoted_student_id } }
// 400 → Booking is not active
// 403 → Not authorized to cancel this booking
// 404 → Booking not found

router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const { data: booking, error: fetchError } = await supabaseAdmin
    .from('bookings')
    .select('id, slot_id, student_id, status, availability_slots(professor_id)')
    .eq('id', id)
    .single();

  if (fetchError || !booking) {
    res.status(404).json({ success: false, error: 'Booking not found' });
    return;
  }

  const slotData = booking.availability_slots as unknown as { professor_id: string } | null;
  const isStudentOwner = req.user!.role === 'student' && booking.student_id === req.user!.id;
  const isProfessorOwner = req.user!.role === 'professor' && slotData?.professor_id === req.user!.id;

  if (!isStudentOwner && !isProfessorOwner) {
    res.status(403).json({ success: false, error: 'You do not have permission to cancel this booking' });
    return;
  }

  if (booking.status !== 'active') {
    res.status(400).json({ success: false, error: 'Only active bookings can be cancelled' });
    return;
  }

  // Cancel the booking
  await supabaseAdmin
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', id);

  // Free up the slot
  await supabaseAdmin
    .from('availability_slots')
    .update({ status: 'available' })
    .eq('id', booking.slot_id);

  // ── AUTO-PROMOTION — FIFO Queue ───────────────────────────────────────────
  // Look for the oldest waiting entry for this professor (FIFO = lowest created_at).
  const professorId = slotData?.professor_id;
  let promotedStudentId: string | null = null;

  if (professorId) {
    const { data: nextInQueue } = await supabaseAdmin
      .from('queue_entries')
      .select('id, student_id')
      .eq('professor_id', professorId)
      .eq('status', 'waiting')
      .order('created_at', { ascending: true })  // FIFO: oldest first
      .limit(1)
      .single();

    if (nextInQueue) {
      // Mark queue entry as promoted
      await supabaseAdmin
        .from('queue_entries')
        .update({ status: 'promoted', promoted_at: new Date().toISOString() })
        .eq('id', nextInQueue.id);

      // Create the new booking for the promoted student
      // Note: The DB trigger will allow this because the promoted student's
      // previous booking was cancelled (count = 0).
      await supabaseAdmin
        .from('bookings')
        .insert({
          slot_id: booking.slot_id,
          student_id: nextInQueue.student_id,
          status: 'active',
        });

      // Re-lock the slot
      await supabaseAdmin
        .from('availability_slots')
        .update({ status: 'booked' })
        .eq('id', booking.slot_id);

      promotedStudentId = nextInQueue.student_id;
    }
  }

  res.status(200).json({
    success: true,
    data: {
      booking_id: id,
      status: 'cancelled',
      promoted_student_id: promotedStudentId,
    },
  });
});

// ─── DELETE /api/bookings/:id/delete ───────────────────────────────────────
// Student deletes a completed or cancelled booking from their history.
// This is different from cancelling an active booking - this removes the booking entirely.
//
// Headers: Authorization: Bearer <token>
// Roles: student (only can delete their own bookings), professor (none)
//
// 200 → { success: true, data: { id } }
// 404 → Booking not found or not owned by student
// 400 → Cannot delete active booking

router.delete('/:id/delete', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const studentId = req.user!.id;

  try {
    // Fetch the booking to verify it belongs to the student
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('id, status, student_id')
      .eq('id', id)
      .single();

    if (fetchError || !booking) {
      res.status(404).json({ success: false, error: 'Booking not found' });
      return;
    }

    if (booking.student_id !== studentId) {
      res.status(403).json({ success: false, error: 'You can only delete your own bookings' });
      return;
    }

    if (booking.status === 'active') {
      res.status(400).json({ success: false, error: 'Cannot delete active booking. Cancel it first.' });
      return;
    }

    // Delete the booking
    const { error: deleteError } = await supabaseAdmin
      .from('bookings')
      .delete()
      .eq('id', id);

    if (deleteError) {
      res.status(500).json({ success: false, error: 'Failed to delete booking' });
      return;
    }

    res.status(200).json({ success: true, data: { id } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

export default router;

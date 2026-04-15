import { Router, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { requireAuth, requireRole } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();

// ─── POST /api/queue ──────────────────────────────────────────────────────────
// Student joins the waiting queue for a professor.
//
// Fair ordering: Position is determined entirely by created_at ASC (FIFO).
// The server assigns the position — there is no client-supplied ordering.
// A partial unique index (status = 'waiting') prevents a student from being
// in the same queue twice.
//
// Headers: Authorization: Bearer <token>
// Roles: student ONLY
//
// Body: { professor_id: UUID }
// 201 → { success: true, data: { ...queue_entry, position: number } }
// 400 → Missing professor_id
// 404 → Professor not found
// 409 → Already in this professor's queue

router.post(
  '/',
  requireAuth,
  requireRole('student'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { professor_id } = req.body;

    if (!professor_id) {
      res.status(400).json({ success: false, error: 'professor_id is required' });
      return;
    }

    // Verify professor exists
    const { data: prof, error: profError } = await supabaseAdmin
      .from('professors')
      .select('id')
      .eq('id', professor_id)
      .single();

    if (profError || !prof) {
      res.status(404).json({ success: false, error: 'Professor not found' });
      return;
    }

    // Check if student is already waiting (API layer check before DB unique index fires)
    const { data: existing } = await supabaseAdmin
      .from('queue_entries')
      .select('id')
      .eq('professor_id', professor_id)
      .eq('student_id', req.user!.id)
      .eq('status', 'waiting')
      .single();

    if (existing) {
      res.status(409).json({
        success: false,
        error: "already_in_queue: You are already waiting in this professor's queue.",
        code: 'ALREADY_IN_QUEUE',
      });
      return;
    }

    const { data: entry, error: insertError } = await supabaseAdmin
      .from('queue_entries')
      .insert({
        professor_id,
        student_id: req.user!.id,
        status: 'waiting',
      })
      .select()
      .single();

    if (insertError) {
      // Partial unique index violation (race condition)
      if (insertError.code === '23505') {
        res.status(409).json({
          success: false,
          error: "already_in_queue: You are already waiting in this professor's queue.",
          code: 'ALREADY_IN_QUEUE',
        });
        return;
      }
      res.status(500).json({ success: false, error: 'Failed to join queue' });
      return;
    }

    // Calculate FIFO position (count all waiting entries that joined before or at the same time)
    const { count } = await supabaseAdmin
      .from('queue_entries')
      .select('*', { count: 'exact', head: true })
      .eq('professor_id', professor_id)
      .eq('status', 'waiting')
      .lte('created_at', entry.created_at);

    res.status(201).json({
      success: true,
      data: {
        ...entry,
        position: count ?? 1,
      },
    });
  }
);

// ─── GET /api/queue ───────────────────────────────────────────────────────────
// Professor: returns their full waiting queue ordered by created_at ASC (FIFO).
//            Includes student name and email for each entry.
// Student: returns all queue entries for this student across all professors.
//
// Headers: Authorization: Bearer <token>
// Roles: professor, student
// 200 → { success: true, data: QueueEntry[] }

router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const now = new Date().toISOString();

  if (req.user!.role === 'professor') {
    const { data, error } = await supabaseAdmin
      .from('queue_entries')
      .select('id, professor_id, student_id, status, promoted_at, created_at, students(full_name, email)')
      .eq('professor_id', req.user!.id)
      .eq('status', 'waiting')
      .order('created_at', { ascending: true });  // FIFO: oldest = first in line

    if (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch queue' });
      return;
    }

    res.status(200).json({ success: true, data });
    return;
  }

  // Student: mark old queue entries as expired, then show all their queue entries
  // First, expire old entries (where the related booking would have ended)
  await supabaseAdmin
    .from('queue_entries')
    .update({ status: 'expired' })
    .eq('student_id', req.user!.id)
    .eq('status', 'waiting')
    .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Older than 24 hours

  const { data: entries, error } = await supabaseAdmin
    .from('queue_entries')
    .select('id, professor_id, status, promoted_at, created_at, professors(full_name, department)')
    .eq('student_id', req.user!.id)
    .order('created_at', { ascending: false });

  if (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch queue entries' });
    return;
  }

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
      return { ...entry, position: 0 };
    })
  );

  res.status(200).json({ success: true, data: entriesWithPositions });
});

// ─── DELETE /api/queue/:id ────────────────────────────────────────────────────
// Student leaves a queue entry they own.
// Professor can also remove a student from their own queue.
//
// Headers: Authorization: Bearer <token>
// Roles: student, professor
// 200 → { success: true, data: { id, status: 'cancelled' } }
// 400 → Entry is not in 'waiting' state
// 403 → Not authorized
// 404 → Entry not found

router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const { data: entry, error: fetchError } = await supabaseAdmin
    .from('queue_entries')
    .select('id, student_id, professor_id, status')
    .eq('id', id)
    .single();

  if (fetchError || !entry) {
    res.status(404).json({ success: false, error: 'Queue entry not found' });
    return;
  }

  const isStudentOwner = req.user!.role === 'student' && entry.student_id === req.user!.id;
  const isProfessorOwner = req.user!.role === 'professor' && entry.professor_id === req.user!.id;

  if (!isStudentOwner && !isProfessorOwner) {
    res.status(403).json({ success: false, error: 'You do not have permission to remove this queue entry' });
    return;
  }

  if (entry.status !== 'waiting' && entry.status !== 'promoted' && entry.status !== 'expired') {
    res.status(400).json({ success: false, error: 'Only waiting, promoted, or expired entries can be cancelled' });
    return;
  }

  await supabaseAdmin
    .from('queue_entries')
    .update({ status: 'cancelled' })
    .eq('id', id);

  // If the student was promoted, they have an auto-created active booking.
  // Cancelling the queue entry means they're declining — also cancel that booking
  // so the slot is freed and the next person in queue gets promoted.
  if (entry.status === 'promoted') {
    const { data: activeBookings } = await supabaseAdmin
      .from('bookings')
      .select('id, slot_id, availability_slots!inner(professor_id)')
      .eq('student_id', entry.student_id)
      .eq('status', 'active')
      .eq('availability_slots.professor_id', entry.professor_id) as any;

    if (activeBookings && activeBookings.length > 0) {
      const bookingToCancel = activeBookings[0];

      await supabaseAdmin.from('bookings').update({ status: 'cancelled' }).eq('id', bookingToCancel.id);
      await supabaseAdmin.from('availability_slots').update({ status: 'available' }).eq('id', bookingToCancel.slot_id);

      // Auto-promote the next person in queue (FIFO)
      const { data: nextInQueue } = await supabaseAdmin
        .from('queue_entries')
        .select('id, student_id')
        .eq('professor_id', entry.professor_id)
        .eq('status', 'waiting')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (nextInQueue) {
        await supabaseAdmin
          .from('queue_entries')
          .update({ status: 'promoted', promoted_at: new Date().toISOString() })
          .eq('id', nextInQueue.id);

        await supabaseAdmin.from('bookings').insert({
          slot_id: bookingToCancel.slot_id,
          student_id: nextInQueue.student_id,
          status: 'active',
        });

        await supabaseAdmin.from('availability_slots').update({ status: 'booked' }).eq('id', bookingToCancel.slot_id);
      }
    }
  }

  res.status(200).json({ success: true, data: { id, status: 'cancelled' } });
});

// ─── GET /api/queue/me/:professorId ──────────────────────────────────────────
// Student checks their position in a specific professor's queue.
//
// Headers: Authorization: Bearer <token>
// Roles: student ONLY
// 200 → { success: true, data: QueueEntry | null }

router.get(
  '/me/:professorId',
  requireAuth,
  requireRole('student'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { professorId } = req.params;

    const { data: entry, error } = await supabaseAdmin
      .from('queue_entries')
      .select('id, professor_id, status, created_at')
      .eq('professor_id', professorId)
      .eq('student_id', req.user!.id)
      .eq('status', 'waiting')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      res.status(500).json({ success: false, error: 'Failed to fetch queue status' });
      return;
    }

    if (!entry) {
      res.status(200).json({ success: true, data: null });
      return;
    }

    // Calculate position
    const { count } = await supabaseAdmin
      .from('queue_entries')
      .select('*', { count: 'exact', head: true })
      .eq('professor_id', professorId)
      .eq('status', 'waiting')
      .lte('created_at', entry.created_at);

    res.status(200).json({
      success: true,
      data: { ...entry, position: count ?? 1 },
    });
  }
);

// ─── GET /api/queue/professor/:professorId ───────────────────────────────────
// Professor views their queue (alias for GET /queue but filtered to professor's own queue).
// Returns full queue with student names.
//
// Headers: Authorization: Bearer <token>
// Roles: professor ONLY
// 200 → { success: true, data: QueueEntry[] }

router.get(
  '/professor/:professorId',
  requireAuth,
  requireRole('professor'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { professorId } = req.params;

    // Verify the professor is accessing their own queue
    if (professorId !== req.user!.id) {
      res.status(403).json({ success: false, error: 'You can only view your own queue' });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('queue_entries')
      .select('id, professor_id, student_id, status, promoted_at, created_at, students(full_name, email)')
      .eq('professor_id', professorId)
      .eq('status', 'waiting')
      .order('created_at', { ascending: true });

    if (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch queue' });
      return;
    }

    res.status(200).json({ success: true, data });
  }
);

// ─── POST /api/queue/professor/:professorId/next ──────────────────────────────
// Professor calls the next student in their queue.
// Marks them as 'called', creates a booking for the next available slot (if exists),
// and returns the promoted student's info.
//
// Headers: Authorization: Bearer <token>
// Roles: professor ONLY
// 200 → { success: true, data: { promoted_student_id, booking_id } }
// 400 → No one waiting in queue
// 403 → Not authorized

router.post(
  '/professor/:professorId/next',
  requireAuth,
  requireRole('professor'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { professorId } = req.params;

    // Verify the professor is accessing their own queue
    if (professorId !== req.user!.id) {
      res.status(403).json({ success: false, error: 'You can only manage your own queue' });
      return;
    }

    // Get the oldest waiting entry
    const { data: queueEntry, error: fetchError } = await supabaseAdmin
      .from('queue_entries')
      .select('id, student_id')
      .eq('professor_id', professorId)
      .eq('status', 'waiting')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (fetchError || !queueEntry) {
      res.status(400).json({ success: false, error: 'No one waiting in queue' });
      return;
    }

    // Mark as promoted (called)
    await supabaseAdmin
      .from('queue_entries')
      .update({ status: 'called' })
      .eq('id', queueEntry.id);

    res.status(200).json({
      success: true,
      data: { promoted_student_id: queueEntry.student_id },
    });
  }
);

export default router;

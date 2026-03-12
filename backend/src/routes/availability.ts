import { Router, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { requireAuth, requireRole } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();

// ─── GET /api/availability ────────────────────────────────────────────────────
// Returns all non-cancelled slots.
// Optional query param: ?professor_id=UUID to filter by professor.
// Used by the student dashboard to show bookable slots.
//
// Headers: Authorization: Bearer <token>
// Roles: student, professor
// 200 → { success: true, data: AvailabilitySlot[] }

router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  let query = supabaseAdmin
    .from('availability_slots')
    .select('id, professor_id, start_time, end_time, status, created_at')
    .neq('status', 'cancelled')
    .order('start_time', { ascending: true });

  if (req.query.professor_id) {
    query = query.eq('professor_id', req.query.professor_id as string);
  }

  const { data, error } = await query;

  if (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch availability slots' });
    return;
  }

  res.status(200).json({ success: true, data });
});

// ─── POST /api/availability ───────────────────────────────────────────────────
// Professor creates a new bookable time slot.
//
// Headers: Authorization: Bearer <token>
// Roles: professor ONLY
//
// Body: { start_time: ISO8601, end_time: ISO8601 }
// 201 → { success: true, data: AvailabilitySlot }
// 400 → Missing / invalid fields

router.post(
  '/',
  requireAuth,
  requireRole('professor'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { start_time, end_time } = req.body;

    if (!start_time || !end_time) {
      res.status(400).json({ success: false, error: 'start_time and end_time are required (ISO 8601 format)' });
      return;
    }

    if (new Date(end_time) <= new Date(start_time)) {
      res.status(400).json({ success: false, error: 'end_time must be after start_time' });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('availability_slots')
      .insert({
        professor_id: req.user!.id,
        start_time,
        end_time,
        status: 'available',
      })
      .select()
      .single();

    if (error) {
      res.status(500).json({ success: false, error: 'Failed to create slot' });
      return;
    }

    res.status(201).json({ success: true, data });
  }
);

// ─── PATCH /api/availability/:id ─────────────────────────────────────────────
// Professor updates a slot's status. Only the owning professor can do this.
// Useful for manually marking a slot as cancelled or re-opening it.
//
// Headers: Authorization: Bearer <token>
// Roles: professor ONLY
//
// Body: { status: 'available' | 'cancelled' }
// 200 → { success: true, data: AvailabilitySlot }
// 403 → Slot belongs to a different professor
// 404 → Slot not found

router.patch(
  '/:id',
  requireAuth,
  requireRole('professor'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ['available', 'cancelled'];
    if (!status || !allowed.includes(status)) {
      res.status(400).json({ success: false, error: `status must be one of: ${allowed.join(', ')}` });
      return;
    }

    const { data: slot, error: fetchError } = await supabaseAdmin
      .from('availability_slots')
      .select('id, professor_id, status')
      .eq('id', id)
      .single();

    if (fetchError || !slot) {
      res.status(404).json({ success: false, error: 'Slot not found' });
      return;
    }

    if (slot.professor_id !== req.user!.id) {
      res.status(403).json({ success: false, error: 'You can only update your own slots' });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('availability_slots')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      res.status(500).json({ success: false, error: 'Failed to update slot' });
      return;
    }

    res.status(200).json({ success: true, data });
  }
);

export default router;

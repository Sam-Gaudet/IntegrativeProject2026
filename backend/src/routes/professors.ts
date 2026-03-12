import { Router, Response } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase';
import { requireAuth, requireRole } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();

// All routes below require a valid JWT (any role can access unless restricted further)

// ─── GET /api/professors ──────────────────────────────────────────────────────
// Returns a list of all professors with their name, department.
// This is the main list students see on their dashboard.
//
// Headers: Authorization: Bearer <token>
// Roles: student, professor
//
// 200 → { success: true, data: Professor[] }
//
// Professor shape:
//   { id, full_name, department, availability_status }
//   availability_status: 'available' | 'busy' | 'away' — comes from professors table

router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { data, error } = await supabase
    .from('professors')
    .select(`
      id,
      full_name,
      department,
      availability_status
    `)
    .order('full_name', { ascending: true });

  if (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch professors' });
    return;
  }

  res.status(200).json({ success: true, data });
});

// ─── PATCH /api/professors/status ───────────────────────────────────────────
// Professor updates their own availability status.
// This is the main "one-click toggle" from the project requirements.
//
// Headers: Authorization: Bearer <token>
// Roles: professor ONLY
//
// Body: { availability_status: 'available' | 'busy' | 'away' }
// 200 → { success: true, data: { id, availability_status } }

router.patch(
  '/status',
  requireAuth,
  requireRole('professor'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { availability_status } = req.body;
    const allowed = ['available', 'busy', 'away'];

    if (!availability_status || !allowed.includes(availability_status)) {
      res.status(400).json({ success: false, error: `availability_status must be one of: ${allowed.join(', ')}` });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('professors')
      .update({ availability_status })
      .eq('id', req.user!.id)
      .select('id, availability_status')
      .single();

    if (error) {
      res.status(500).json({ success: false, error: 'Failed to update availability status' });
      return;
    }

    res.status(200).json({ success: true, data });
  }
);

// ─── GET /api/professors/:id ──────────────────────────────────────────────────
// Returns a single professor's public profile.
//
// Headers: Authorization: Bearer <token>
// Roles: student, professor
//
// 200 → { success: true, data: Professor }
// 404 → Professor not found

router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('professors')
    .select('id, full_name, department, availability_status')
    .eq('id', id)
    .single();

  if (error || !data) {
    res.status(404).json({ success: false, error: 'Professor not found' });
    return;
  }

  res.status(200).json({ success: true, data });
});

export default router;

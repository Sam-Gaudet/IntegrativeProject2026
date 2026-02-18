import { Router, Response } from 'express';
import { supabase } from '../config/supabase';
import { requireAuth } from '../middleware/auth';
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

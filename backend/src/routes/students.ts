import { Router, Response } from 'express';
import { supabase } from '../config/supabase';
import { requireAuth, requireRole } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();

// ─── GET /api/students ────────────────────────────────────────────────────────
// Returns a list of all students.
// Restricted to professors only — students must not see each other's info.
//
// Headers: Authorization: Bearer <token>
// Roles: professor ONLY
//
// 200 → { success: true, data: Student[] }
//
// Student shape:
//   { id, full_name, email }

router.get(
  '/',
  requireAuth,
  requireRole('professor'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { data, error } = await supabase
      .from('students')
      .select('id, full_name, email')
      .order('full_name', { ascending: true });

    if (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch students' });
      return;
    }

    res.status(200).json({ success: true, data });
  }
);

// ─── GET /api/students/me ─────────────────────────────────────────────────────
// Returns the currently authenticated student's own profile.
// Students can only see their own data — not other students'.
//
// Headers: Authorization: Bearer <token>
// Roles: student ONLY
//
// 200 → { success: true, data: { id, full_name, email } }
// 403 → If a professor tries to access this route

router.get(
  '/me',
  requireAuth,
  requireRole('student'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { data, error } = await supabase
      .from('students')
      .select('id, full_name, email')
      .eq('id', req.user!.id)
      .single();

    if (error || !data) {
      res.status(404).json({ success: false, error: 'Student profile not found' });
      return;
    }

    res.status(200).json({ success: true, data });
  }
);

export default router;

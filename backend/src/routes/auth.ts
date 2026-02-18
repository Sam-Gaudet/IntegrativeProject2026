import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { LoginRequest, LoginResponse } from '../types';

const router = Router();

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
// Accepts email + password. Returns a JWT access_token and user info with role.
// The frontend stores this token and sends it as "Authorization: Bearer <token>"
// on every subsequent request.
//
// Body: { email: string, password: string }
//
// 200 → { success: true, data: { access_token, user: { id, email, role, full_name } } }
// 400 → Missing fields
// 401 → Invalid credentials

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as LoginRequest;

  if (!email || !password) {
    res.status(400).json({ success: false, error: 'email and password are required' });
    return;
  }

  // Step 1: Authenticate with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user || !authData.session) {
    res.status(401).json({ success: false, error: 'Invalid email or password' });
    return;
  }

  // Step 2: Fetch the user's profile (contains role + full_name)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !profile) {
    res.status(500).json({ success: false, error: 'Failed to fetch user profile' });
    return;
  }

  const response: LoginResponse = {
    access_token: authData.session.access_token,
    user: {
      id: authData.user.id,
      email: authData.user.email ?? '',
      role: profile.role,
      full_name: profile.full_name,
    },
  };

  res.status(200).json({ success: true, data: response });
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
// Invalidates the user's session on the Supabase side.
// The frontend should also clear its locally stored token regardless of this response.
//
// Headers: Authorization: Bearer <token>
// 200 → { success: true, data: { message: 'Logged out' } }

router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  const token = req.headers.authorization?.split(' ')[1];

  if (token) {
    // Best effort — sign out from Supabase (invalidates refresh token)
    await supabase.auth.admin?.signOut(token).catch(() => null);
  }

  res.status(200).json({ success: true, data: { message: 'Logged out' } });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
// Returns profile of the currently authenticated user.
// Useful for the frontend to restore session on page reload.
//
// Headers: Authorization: Bearer <token>
// 200 → { success: true, data: { id, email, role, full_name, department } }
// 401 → Invalid or missing token

router.get('/me', async (req: Request, res: Response): Promise<void> => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    res.status(401).json({ success: false, error: 'Missing token' });
    return;
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, full_name, department')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile) {
    res.status(500).json({ success: false, error: 'Profile not found' });
    return;
  }

  res.status(200).json({
    success: true,
    data: {
      id: data.user.id,
      email: data.user.email,
      role: profile.role,
      full_name: profile.full_name,
      department: profile.department ?? null,
    },
  });
});

export default router;

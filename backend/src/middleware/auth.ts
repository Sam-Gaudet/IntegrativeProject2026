import { Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { AuthenticatedRequest, UserRole } from '../types';

// ─── requireAuth ─────────────────────────────────────────────────────────────
// Validates the Bearer JWT from the Authorization header using Supabase.
// On success, attaches { id, email, role } to req.user.
// On failure, immediately responds with 401.
//
// Usage (in any route file):
//   router.get('/protected', requireAuth, handler);

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Missing or malformed Authorization header. Expected: Bearer <token>' });
    return;
  }

  const token = authHeader.split(' ')[1];

  // Verify the JWT with Supabase — this confirms the token hasn't been tampered with
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
    return;
  }

  // Fetch the user's role from the profiles table (role is NOT in the JWT by default)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile) {
    res.status(403).json({ success: false, error: 'User profile not found' });
    return;
  }

  req.user = {
    id: data.user.id,
    email: data.user.email ?? '',
    role: profile.role as UserRole,
  };

  next();
};

// ─── requireRole ─────────────────────────────────────────────────────────────
// Role guard — must be used AFTER requireAuth.
// Restricts a route to one or more specific roles.
//
// Usage:
//   router.get('/professors-only', requireAuth, requireRole('professor'), handler);
//   router.get('/any-role', requireAuth, requireRole('student', 'professor'), handler);

export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Access denied. Required role: [${roles.join(' or ')}]. Your role: ${req.user.role}`,
      });
      return;
    }

    next();
  };
};

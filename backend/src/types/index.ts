// ─── User Roles ───────────────────────────────────────────────────────────────

export type UserRole = 'student' | 'professor';

// ─── Profile ──────────────────────────────────────────────────────────────────
// Mirrors the `profiles` table in Supabase.
// Every Supabase Auth user gets a matching row here on sign-up (via DB trigger).

export interface Profile {
  id: string;           // UUID — same as auth.users.id
  email: string;
  full_name: string;
  role: UserRole;
  department: string | null;  // Relevant for professors; null for students
  created_at: string;
}

// ─── Authenticated Request ────────────────────────────────────────────────────
// Extends Express Request to carry the verified user after auth middleware runs.

import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

// ─── API Response Shapes ─────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── Login ───────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
    full_name: string;
  };
}

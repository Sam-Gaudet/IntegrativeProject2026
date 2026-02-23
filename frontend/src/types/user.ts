export type UserRole = 'student' | 'professor';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department?: string | null; // optional for students
}

export interface LoginResponse {
  access_token: string;
  user: User;
}

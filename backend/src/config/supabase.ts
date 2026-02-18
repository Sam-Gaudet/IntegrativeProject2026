import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
}

// Standard client: used for auth verification (validates user JWTs)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client: uses service_role key — bypasses Row Level Security.
// Only use for server-side operations (seeding, admin tasks). NEVER send to frontend.
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey ?? (() => { throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in .env'); })()
);

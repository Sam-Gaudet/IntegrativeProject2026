import { createClient } from '@supabase/supabase-js';

// Get environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9reWlub2dxcnBrdXJ0YW5iZG9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NzA1NDYwNjAsImV4cCI6MTg0ODMxMjA2MH0.r3-Kqjl6pslV_PuNgPJGzExL3RJlvLAzF4GxEiuKmb0';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase credentials not fully configured. Using defaults.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


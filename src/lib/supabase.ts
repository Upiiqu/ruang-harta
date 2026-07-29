import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
if (!supabaseUrl) {
  throw new Error('SUPABASE_URL environment variable is not set');
}

// Use anon key for user-facing operations (respects RLS)
// For admin operations, use the service_role key in dedicated admin utilities
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
if (!supabaseAnonKey) {
  throw new Error('SUPABASE_ANON_KEY environment variable is not set');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const supabaseAdmin = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : supabase;

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  phone_number?: string;
  created_at: string;
}

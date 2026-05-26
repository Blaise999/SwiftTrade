// lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Admin client (Service Role)
 * This client has full admin privileges and should only be used on the server.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // server env ONLY
  { auth: { persistSession: false } }
);

/**
 * Checks if the Supabase Admin client is properly configured.
 * Returns false when SUPABASE_SERVICE_ROLE_KEY is missing (e.g. local dev without .env).
 */
export const isAdminConfigured = (): boolean => {
  return !!process.env.SUPABASE_SERVICE_ROLE_KEY;
};
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Returns true when the admin client has real credentials.
 * Used by API routes to short-circuit early during build/preview when
 * env vars aren't injected, instead of throwing 500s.
 */
export function isAdminConfigured(): boolean {
  return Boolean(
    url &&
    serviceKey &&
    !url.includes('stub') &&
    !serviceKey.includes('stub')
  );
}

export const supabaseAdmin = createClient(
  url || 'https://stub.supabase.co',
  serviceKey || 'stub',
  { auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (i: any, x: any) => fetch(i, { ...(x || {}), cache: 'no-store' }) } }
);

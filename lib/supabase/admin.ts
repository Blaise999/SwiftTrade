import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role client.
 *
 * Must never throw at module-import time. If env vars are missing,
 * creating the client with `undefined!` then calling it produces an
 * opaque 500. Instead we build lazily and expose `isAdminConfigured()`
 * so routes can return a clean, debuggable error.
 */
let _client: SupabaseClient | null = null;

export function isAdminConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!isAdminConfigured()) return null;
  if (_client) return _client;
  _client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  return _client;
}

/**
 * Back-compat proxy so existing `supabaseAdmin.from(...)` calls still work.
 * Resolves the real client on first access; throws a CLEAR error (caught
 * by each route's try/catch) when unconfigured.
 */
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    const c = getSupabaseAdmin();
    if (!c) {
      throw new Error(
        'SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL is not set. ' +
        'Copy .env.example to .env.local and fill them in.'
      );
    }
    // @ts-expect-error dynamic passthrough
    const v = c[prop];
    return typeof v === 'function' ? v.bind(c) : v;
  },
});

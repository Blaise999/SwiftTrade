/**
 * THE fix for stale reads.
 *
 * supabase-js calls global fetch() internally. Next.js patches global fetch and
 * caches GET responses in its Data Cache. Our own outbound calls (CoinGecko,
 * Alpaca) pass `cache: 'no-store'` explicitly, so prices always looked live —
 * but the Supabase REST GETs did NOT, so row reads were served from Next's
 * cache. That is why a response could show live prices next to hours-old
 * holdings, and why it "fixed itself" when the cache entry expired.
 *
 * Every server-side Supabase client MUST be created here so its fetch is
 * forced to no-store.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/** fetch that can never be cached by Next's Data Cache. */
const noStoreFetch: typeof fetch = (input, init) =>
  fetch(input as any, {
    ...(init || {}),
    cache: 'no-store',
    // Next-specific hint; typed in Next's fetch, ignored by other runtimes.
    next: { revalidate: 0 },
  } as RequestInit);

/** Service-role client — bypasses RLS, never cached. */
export function supabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: noStoreFetch },
  });
}

export default supabaseAdmin;

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * External-cron security.
 *
 * Vercel's Hobby plan only allows 2 cron jobs and each runs AT MOST once
 * per day (fired at a random minute within the hour). That is unusable for
 * FX price ticking or recurring-investment sweeps.
 *
 * Solution: these endpoints are plain authenticated HTTP routes. ANY
 * external scheduler (cron-job.org, EasyCron, GitHub Actions, Render
 * Cron, Runhooks, an always-on VPS, etc.) can call them on whatever
 * schedule you want. No Vercel cron config is used at all.
 *
 * Auth: every request must present the shared secret in ANY of:
 *   - Header  `Authorization: Bearer <CRON_SECRET>`
 *   - Header  `x-cron-key: <CRON_SECRET>`
 *   - Query   `?key=<CRON_SECRET>`
 *
 * Set CRON_SECRET in the environment. If it is unset we refuse to run
 * (fail closed) so the endpoints can't be abused.
 */
export function authorizeCron(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json(
      { ok: false, error: 'CRON_SECRET not configured on the server' },
      { status: 503 }
    );
  }

  const url = new URL(req.url);
  const fromQuery = url.searchParams.get('key');
  const fromHeader = req.headers.get('x-cron-key');
  const auth = req.headers.get('authorization') || '';
  const fromBearer = auth.toLowerCase().startsWith('bearer ')
    ? auth.slice(7).trim()
    : null;

  const provided = fromBearer || fromHeader || fromQuery;

  if (provided !== secret) {
    return NextResponse.json(
      { ok: false, error: 'unauthorized' },
      { status: 401 }
    );
  }
  return null; // authorized
}

export function cronAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type JobResult = {
  job: string;
  ok: boolean;
  detail?: any;
  ms: number;
};

export async function runJob(
  name: string,
  fn: () => Promise<any>
): Promise<JobResult> {
  const t0 = Date.now();
  try {
    const detail = await fn();
    return { job: name, ok: true, detail, ms: Date.now() - t0 };
  } catch (e: any) {
    return {
      job: name,
      ok: false,
      detail: e?.message || String(e),
      ms: Date.now() - t0,
    };
  }
}

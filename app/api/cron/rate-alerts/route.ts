/**
 * Rate-alert runner. Works with ANY scheduler — or none.
 *
 *   GET  /api/cron/rate-alerts              (open if CRON_SECRET is unset)
 *   GET  /api/cron/rate-alerts?secret=xxx   (query secret)
 *   GET  with header  x-cron-secret: xxx    (header secret)
 *   POST also supported (some schedulers prefer it)
 *
 * Point cron-job.org / UptimeRobot / GitHub Actions at this URL.
 * Alerts are ALSO checked opportunistically on normal app traffic, so this
 * endpoint is a safety net rather than a hard requirement.
 */
import { NextRequest, NextResponse } from 'next/server';
import { checkRateAlerts } from '@/lib/rate-alerts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function run(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const q = new URL(req.url).searchParams.get('secret');
    const h = req.headers.get('x-cron-secret') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (q !== secret && h !== secret) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }
  }
  const result = await checkRateAlerts({ force: true });
  return NextResponse.json({ ok: true, ...result, at: new Date().toISOString() });
}

export async function GET(req: NextRequest) { return run(req); }
export async function POST(req: NextRequest) { return run(req); }

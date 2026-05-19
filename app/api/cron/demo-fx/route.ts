import { NextRequest, NextResponse } from 'next/server';
import { authorizeCron, runJob } from '@/lib/cron';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET|POST /api/cron/demo-fx?key=CRON_SECRET
 *
 * Thin authenticated wrapper that drives the existing demo-FX autopilot
 * tick. Point an external scheduler at this every 10-30 seconds for
 * smooth live price movement (Vercel Hobby cron can't do sub-daily, so
 * this must be driven externally).
 */
async function handler(req: NextRequest) {
  const denied = authorizeCron(req);
  if (denied) return denied;

  const result = await runJob('demo-fx-tick', async () => {
    const base =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      `http://localhost:3000`;

    // Reuse the existing demo-fx cron implementation, passing the secret
    // through so its own guard accepts the call.
    const r = await fetch(
      `${base}/api/demo-fx/cron?key=${encodeURIComponent(process.env.CRON_SECRET || '')}`,
      { cache: 'no-store' }
    );
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`demo-fx cron returned ${r.status}`);
    return body;
  });

  return NextResponse.json(
    { ...result, ok: result.ok },
    { status: result.ok ? 200 : 500 }
  );
}

export const GET = handler;
export const POST = handler;

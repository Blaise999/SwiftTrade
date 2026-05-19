import { NextRequest, NextResponse } from 'next/server';
import { authorizeCron, cronAdminClient, runJob, JobResult } from '@/lib/cron';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET|POST /api/cron/run?key=CRON_SECRET
 *
 * The "one URL to rule them all" endpoint. An external scheduler can hit
 * just this one route on a single schedule and it fans out to every
 * scheduled job, returning a per-job report.
 *
 * This is the recommended setup for Vercel Hobby (which caps you at 2
 * daily cron jobs): you don't use Vercel cron at all — you point an
 * external scheduler (cron-job.org, EasyCron, GitHub Actions, etc.) at
 * this URL every few minutes.
 *
 * Optional: ?only=recurring,demofx  to run a subset.
 */
async function handler(req: NextRequest) {
  const denied = authorizeCron(req);
  if (denied) return denied;

  const url = new URL(req.url);
  const only = (url.searchParams.get('only') || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const want = (name: string) => only.length === 0 || only.includes(name);

  const sb = cronAdminClient();
  const jobs: JobResult[] = [];

  // ── Job: recurring investments ──
  if (want('recurring')) {
    jobs.push(
      await runJob('recurring', async () => {
        if (!sb) return { skipped: 'no service role' };
        const nowIso = new Date().toISOString();
        const { data: due, error } = await sb
          .from('recurring_investments')
          .select('id,user_id,target_type,symbol,amount,frequency,status,next_run_at')
          .eq('status', 'active')
          .lte('next_run_at', nowIso)
          .limit(200);
        if (error) throw new Error(error.message);
        if (!due?.length) return { processed: 0 };

        const advance = (freq: string) => {
          const d = new Date();
          if (freq === 'daily') d.setDate(d.getDate() + 1);
          else if (freq === 'weekly') d.setDate(d.getDate() + 7);
          else d.setMonth(d.getMonth() + 1);
          return d.toISOString();
        };

        let processed = 0;
        for (const r of due) {
          try {
            await sb.from('transactions').insert({
              user_id: r.user_id,
              type: 'recurring_scheduled',
              amount: r.amount,
              description: `Recurring ${r.frequency} into ${r.symbol || 'pie'} (scheduled)`,
              reference_type: r.target_type,
              status: 'scheduled',
            });
          } catch {}
          await sb
            .from('recurring_investments')
            .update({ next_run_at: advance(r.frequency) })
            .eq('id', r.id);
          processed += 1;
        }
        return { processed };
      })
    );
  }

  // ── Job: demo-fx autopilot tick ──
  if (want('demofx')) {
    jobs.push(
      await runJob('demofx', async () => {
        const base =
          process.env.NEXT_PUBLIC_SITE_URL ||
          process.env.NEXT_PUBLIC_APP_URL ||
          'http://localhost:3000';
        const r = await fetch(
          `${base}/api/demo-fx/cron?key=${encodeURIComponent(process.env.CRON_SECRET || '')}`,
          { cache: 'no-store' }
        );
        if (!r.ok) throw new Error(`demo-fx cron ${r.status}`);
        return await r.json().catch(() => ({}));
      })
    );
  }

  // ── Job: expire stale bridge requests ──
  if (want('bridge')) {
    jobs.push(
      await runJob('bridge-expire', async () => {
        if (!sb) return { skipped: 'no service role' };
        const { data, error } = await sb
          .from('bridge_requests')
          .update({ status: 'expired' })
          .lt('expires_at', new Date().toISOString())
          .in('status', ['awaiting_admin', 'awaiting_payment', 'awaiting_verification'])
          .select('id');
        if (error) throw new Error(error.message);
        return { expired: data?.length || 0 };
      })
    );
  }

  const ok = jobs.every(j => j.ok);
  return NextResponse.json(
    { ok, ranAt: new Date().toISOString(), jobs },
    { status: ok ? 200 : 207 }
  );
}

export const GET = handler;
export const POST = handler;

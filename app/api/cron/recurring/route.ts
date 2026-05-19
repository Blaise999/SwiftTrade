import { NextRequest, NextResponse } from 'next/server';
import { authorizeCron, cronAdminClient, runJob } from '@/lib/cron';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET|POST /api/cron/recurring?key=CRON_SECRET
 *
 * Processes due recurring investments. Call this from an external
 * scheduler as often as you like (e.g. every 5 minutes, or hourly).
 *
 * It finds rows in `recurring_investments` whose `next_run_at` <= now,
 * records the intended execution, and advances `next_run_at` by the
 * row's frequency. Actual broker order placement is a Phase-2 hook
 * (marked clearly) so this is safe to run now without moving money.
 */
async function handler(req: NextRequest) {
  const denied = authorizeCron(req);
  if (denied) return denied;

  const sb = cronAdminClient();
  if (!sb) {
    return NextResponse.json(
      { ok: false, error: 'service role not configured' },
      { status: 503 }
    );
  }

  const result = await runJob('recurring-investments', async () => {
    const nowIso = new Date().toISOString();

    const { data: due, error } = await sb
      .from('recurring_investments')
      .select('id,user_id,target_type,symbol,pie_id,amount,frequency,next_run_at,status')
      .eq('status', 'active')
      .lte('next_run_at', nowIso)
      .limit(200);

    if (error) throw new Error(error.message);
    if (!due || due.length === 0) return { processed: 0 };

    const advance = (freq: string): string => {
      const d = new Date();
      if (freq === 'daily') d.setDate(d.getDate() + 1);
      else if (freq === 'weekly') d.setDate(d.getDate() + 7);
      else d.setMonth(d.getMonth() + 1); // monthly default
      return d.toISOString();
    };

    let processed = 0;
    for (const r of due) {
      // Phase-2 hook: place the actual order here once live broker
      // routing is enabled. For now we log the intended execution to
      // `transactions` so there is an audit trail, and roll the schedule
      // forward so it doesn't fire repeatedly.
      try {
        await sb.from('transactions').insert({
          user_id: r.user_id,
          type: 'recurring_scheduled',
          amount: r.amount,
          description: `Recurring ${r.frequency} into ${r.symbol || 'pie'} (scheduled)`,
          reference_type: r.target_type,
          status: 'scheduled',
        });
      } catch {/* non-fatal */}

      await sb
        .from('recurring_investments')
        .update({ next_run_at: advance(r.frequency) })
        .eq('id', r.id);

      processed += 1;
    }

    return { processed };
  });

  return NextResponse.json(
    { ...result, ok: result.ok },
    { status: result.ok ? 200 : 500 }
  );
}

export const GET = handler;
export const POST = handler;

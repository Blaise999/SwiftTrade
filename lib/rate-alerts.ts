/**
 * Rate-alert checking, decoupled from any scheduler.
 *
 * Runs three ways — no Vercel cron needed:
 *   1. Opportunistically  — piggybacks on normal app traffic (throttled)
 *   2. External scheduler — cron-job.org, GitHub Actions, UptimeRobot
 *   3. Manual            — hit the endpoint yourself
 */
import { createClient } from '@supabase/supabase-js';
import { emailUser } from '@/lib/email/events';

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (i: any, x: any) => fetch(i, { ...(x || {}), cache: 'no-store' }) } });
}

/** Module-level throttle so opportunistic checks can't hammer the feed. */
let lastRun = 0;
let running: Promise<any> | null = null;
const MIN_GAP_MS = 5 * 60 * 1000;   // at most once every 5 minutes

export async function checkRateAlerts(opts: { force?: boolean } = {}) {
  if (!opts.force) {
    if (Date.now() - lastRun < MIN_GAP_MS) return { skipped: 'throttled', checked: 0, fired: 0 };
    if (running) return running;
  }

  running = (async () => {
    lastRun = Date.now();
    const sb = admin();
    if (!sb) return { error: 'no service role', checked: 0, fired: 0 };

    // Only fetch rates if there's actually something to check.
    const { data: alerts } = await sb.from('rate_alerts').select('*').eq('active', true);
    if (!alerts || !alerts.length) return { checked: 0, fired: 0 };

    let rates: Record<string, number> = {};
    try {
      const j = await (await fetch('https://open.er-api.com/v6/latest/USD', { cache: 'no-store' })).json();
      rates = j?.rates || {};
    } catch {
      return { error: 'rate feed unavailable', checked: 0, fired: 0 };
    }
    if (!Object.keys(rates).length) return { error: 'empty rate feed', checked: 0, fired: 0 };

    let fired = 0;
    for (const a of alerts as any[]) {
      const cur = Number(rates[a.quote]);
      if (!Number.isFinite(cur) || cur <= 0) continue;

      const hit = a.direction === 'above' ? cur >= Number(a.target) : cur <= Number(a.target);
      await sb.from('rate_alerts').update({ last_rate: cur }).eq('id', a.id);
      if (!hit) continue;

      // Deactivate FIRST so a concurrent run can't double-notify.
      const { data: claimed } = await sb
        .from('rate_alerts')
        .update({ active: false, triggered_at: new Date().toISOString() })
        .eq('id', a.id)
        .eq('active', true)      // only succeeds if still active
        .select('id')
        .maybeSingle();
      if (!claimed) continue;    // another run got it

      fired++;
      await sb.from('notifications').insert({
        user_id: a.user_id, type: 'rate_alert',
        title: `USD/${a.quote} hit ${cur.toFixed(2)}`,
        message: `Your alert for USD/${a.quote} ${a.direction} ${Number(a.target).toFixed(2)} just triggered. Current rate: ${cur.toFixed(2)}.`,
        metadata: { quote: a.quote, target: a.target, rate: cur },
      }).then(() => {}, () => {});

      emailUser(a.user_id, {
        title: `USD/${a.quote} hit your target`,
        tone: 'success',
        message: `USD/${a.quote} is now ${cur.toFixed(2)}, ${a.direction} your ${Number(a.target).toFixed(2)} target.`,
        rows: [
          { label: 'Pair', value: `USD/${a.quote}` },
          { label: 'Your target', value: `${a.direction} ${Number(a.target).toFixed(2)}` },
          { label: 'Current rate', value: cur.toFixed(2) },
        ],
        ctaText: 'Open SwiftBridge',
        ctaUrl: (process.env.NEXT_PUBLIC_APP_URL || '') + '/dashboard/bridge',
      });
    }

    return { checked: alerts.length, fired };
  })();

  try { return await running; } finally { running = null; }
}

/** Fire-and-forget: safe to call from any request handler. */
export function checkRateAlertsInBackground() {
  try { void checkRateAlerts().catch(() => {}); } catch {}
}

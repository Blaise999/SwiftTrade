/**
 * GET /api/pulse — landing-page market pulse, cached 5 min.
 *   fearGreed : crypto Fear & Greed index (alternative.me, keyless)
 *   rates     : live USD corridor rates (open.er-api, keyless)
 *   marketOpen: whether US equities are in regular session
 */
import { NextResponse } from 'next/server';
import { checkRateAlertsInBackground } from '@/lib/rate-alerts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let CACHE: { at: number; data: any } | null = null;
const TTL = 5 * 60 * 1000;

const CORRIDORS = ['HKD', 'NGN', 'PHP', 'INR', 'GBP', 'EUR', 'JPY', 'SGD', 'ZAR', 'KES'];

function usMarketOpen() {
  // NYSE regular session 09:30–16:00 ET, Mon–Fri (holidays not modelled)
  const now = new Date();
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = et.getDay();
  if (day === 0 || day === 6) return { open: false, label: 'Closed — weekend' };
  const mins = et.getHours() * 60 + et.getMinutes();
  if (mins >= 570 && mins < 960) return { open: true, label: 'US markets open' };
  if (mins >= 240 && mins < 570) return { open: false, label: 'Pre-market' };
  if (mins >= 960 && mins < 1200) return { open: false, label: 'After hours' };
  return { open: false, label: 'Closed' };
}

export async function GET() {
  checkRateAlertsInBackground();   // opportunistic — throttled to 5 min

  if (CACHE && Date.now() - CACHE.at < TTL) {
    return NextResponse.json({ ok: true, cached: true, ...CACHE.data, marketStatus: usMarketOpen() });
  }

  let fearGreed: any = null;
  try {
    const j = await (await fetch('https://api.alternative.me/fng/?limit=1', { cache: 'no-store' })).json();
    const d = j?.data?.[0];
    if (d) fearGreed = { value: Number(d.value), label: String(d.value_classification) };
  } catch {}

  let rates: any[] = [];
  try {
    const j = await (await fetch('https://open.er-api.com/v6/latest/USD', { cache: 'no-store' })).json();
    const r = j?.rates || {};
    rates = CORRIDORS.map((c) => ({ code: c, rate: Number(r[c]) || 0 })).filter((x) => x.rate > 0);
  } catch {}

  const data = { fearGreed, rates };
  if (fearGreed || rates.length) CACHE = { at: Date.now(), data };
  return NextResponse.json({ ok: true, cached: false, ...data, marketStatus: usMarketOpen() });
}

/**
 * Bridge rate alerts.
 *   GET    ?userId=       -> user's alerts + current rates
 *   POST   {userId, quote, direction, target}
 *   DELETE ?id=&userId=
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateAlertsInBackground } from '@/lib/rate-alerts';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function admin() {
  return supabaseAdmin();
}

async function rates(): Promise<Record<string, number>> {
  try {
    const j = await (await fetch('https://open.er-api.com/v6/latest/USD', { cache: 'no-store' })).json();
    return j?.rates || {};
  } catch { return {}; }
}

export async function GET(req: NextRequest) {
  checkRateAlertsInBackground();   // opportunistic — throttled to 5 min

  const sb = admin();
  if (!sb) return NextResponse.json({ ok: false }, { status: 503 });
  const userId = new URL(req.url).searchParams.get('userId') || '';
  const [{ data }, r] = await Promise.all([
    sb.from('rate_alerts').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    rates(),
  ]);
  const alerts = (data || []).map((a: any) => ({ ...a, current: Number(r[a.quote]) || null }));
  return NextResponse.json({ ok: true, alerts, rates: r });
}

export async function POST(req: NextRequest) {
  const sb = admin();
  if (!sb) return NextResponse.json({ ok: false }, { status: 503 });
  const { userId, quote, direction, target } = await req.json().catch(() => ({} as any));
  if (!userId || !quote || !target) {
    return NextResponse.json({ ok: false, error: 'userId, quote and target are required' }, { status: 400 });
  }
  const { data, error } = await sb.from('rate_alerts').insert({
    user_id: userId, quote: String(quote).toUpperCase(),
    direction: direction === 'below' ? 'below' : 'above',
    target: Number(target), active: true,
  }).select().maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, alert: data });
}

export async function DELETE(req: NextRequest) {
  const sb = admin();
  if (!sb) return NextResponse.json({ ok: false }, { status: 503 });
  const u = new URL(req.url).searchParams;
  const id = u.get('id'), userId = u.get('userId');
  if (!id || !userId) return NextResponse.json({ ok: false }, { status: 400 });
  await sb.from('rate_alerts').delete().eq('id', id).eq('user_id', userId);
  return NextResponse.json({ ok: true });
}

/**
 * Spot crypto state, server-side.
 *
 * The client CANNOT read/write user_trading_data directly: RLS is on and the
 * app uses custom auth, so auth.uid() is null — reads return zero rows and the
 * store silently loads nothing. This route uses the service role.
 *
 *   GET  ?userId=...            -> { state }
 *   POST { userId, state }      -> saves
 */
import { NextRequest, NextResponse } from 'next/server';
import { trace } from '@/lib/trace';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function GET(req: NextRequest) {
  const sb = admin();
  if (!sb) return NextResponse.json({ ok: false, state: null }, { status: 503 });
  const userId = new URL(req.url).searchParams.get('userId') || '';
  if (!userId) return NextResponse.json({ ok: true, state: null });

  const [{ data: utd }, { data: cp }] = await Promise.all([
    sb.from('user_trading_data').select('spot_crypto_state').eq('user_id', userId).maybeSingle(),
    sb.from('crypto_positions').select('symbol, quantity, avg_buy_price').eq('user_id', userId),
  ]);

  const state: any = utd?.spot_crypto_state || {};
  const existing: any[] = Array.isArray(state.positions) ? state.positions : [];

  // crypto_positions is the source of truth — merge anything missing from state
  const bySym = new Map<string, any>();
  for (const p of existing) {
    const s = String(p.symbol || '').toUpperCase();
    if (s) bySym.set(s, p);
  }
  for (const r of (cp || []) as any[]) {
    const s = String(r.symbol).toUpperCase();
    const q = Number(r.quantity) || 0;
    if (!s || q <= 0) continue;
    const prev = bySym.get(s);
    if (!prev || q > (Number(prev.quantity) || 0)) {
      bySym.set(s, {
        ...(prev || {}),
        symbol: s,
        name: prev?.name || s,
        quantity: q,
        avgBuyPrice: Number(r.avg_buy_price) || prev?.avgBuyPrice || 0,
      });
    }
  }

  trace('spot-state', 'merged', { userId, cryptoRows: (cp || []).length, stateRows: existing.length, out: bySym.size });
  return NextResponse.json({
    ok: true,
    state: { ...state, positions: [...bySym.values()].filter((p) => (Number(p.quantity) || 0) > 0) },
  });
}

export async function POST(req: NextRequest) {
  const sb = admin();
  if (!sb) return NextResponse.json({ ok: false }, { status: 503 });
  const { userId, state } = await req.json().catch(() => ({} as any));
  if (!userId || !state) return NextResponse.json({ ok: false, error: 'userId and state required' }, { status: 400 });

  const { error } = await sb.from('user_trading_data').upsert(
    { user_id: userId, spot_crypto_state: state, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
